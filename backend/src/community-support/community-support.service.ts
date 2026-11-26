import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SupportResult = { answer: string; source: 'ai' | 'fallback'; configured: boolean };
type SpeechLanguage = 'en' | 'km';
type SpeechResult = { audio: Buffer; contentType: 'audio/mpeg' | 'audio/wav' };

@Injectable()
export class CommunitySupportService {
  private readonly lastRequestByUser = new Map<string, number>();

  constructor(private readonly config: ConfigService) {}

  async answer(userId: string, question: string): Promise<SupportResult> {
    const cleanQuestion = question.trim().slice(0, 1000);
    const responseLanguage = this.isKhmerQuestion(cleanQuestion) ? 'Khmer' : 'English';
    const now = Date.now();
    const lastRequest = this.lastRequestByUser.get(userId) || 0;
    if (now - lastRequest < 1200) throw new HttpException('Please wait a moment before asking again.', HttpStatus.TOO_MANY_REQUESTS);
    this.lastRequestByUser.set(userId, now);

    const openAiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    const geminiApiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();

    if (openAiKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);
        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.config.get<string>('OPENAI_MODEL') || 'gpt-4o-mini',
            instructions: 'You are CampusFlow Community Support. Help Students, Customers, and Teachers use the CampusFlow learning community. Sound like a warm, patient human support person speaking aloud: use short natural sentences, contractions when appropriate, and one clear next step. Avoid markdown tables, long lists, raw URLs, and robotic phrasing. Use the exact names of visible buttons or pages when helpful. Explain how to use profiles, posts, visibility, friend requests, accepted-friend messaging, courses, and account settings. Never claim to see private messages, private posts, passwords, payment records, or another user’s private data. Do not invent school policies. If a request needs staff access, tell the user to contact CampusFlow support. Keep answers under 120 words.',
            input: `Answer entirely in ${responseLanguage}. User question: ${cleanQuestion}`,
            max_output_tokens: 220,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }>; error?: { message?: string } };
        if (!response.ok) throw new Error(data.error?.message || 'AI support request failed');
        const answer = data.output_text || data.output?.flatMap((item) => item.content || []).map((content) => content.text || '').join('').trim();
        if (!answer) throw new Error('AI support returned an empty answer');
        return { answer, source: 'ai', configured: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown OpenAI support error';
        console.warn(`OpenAI community support failed: ${message}`);
      }
    }

    if (geminiApiKey) {
      const configuredModel = this.config.get<string>('GEMINI_TEXT_MODEL')?.trim();
      const models = [configuredModel || 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite']
        .filter((model, index, list) => list.indexOf(model) === index);
      for (const model of models) {
        try {
          return await this.geminiAnswer(geminiApiKey, cleanQuestion, responseLanguage, model);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown Gemini support error';
          console.warn(`Gemini community support failed for ${model}: ${message}`);
        }
      }
    }

    const configured = Boolean(openAiKey || geminiApiKey);
    return { answer: this.fallback(cleanQuestion), source: 'fallback', configured };
  }

  private async geminiAnswer(apiKey: string, question: string, responseLanguage: string, model: string): Promise<SupportResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          system_instruction: 'You are CampusFlow Community Support. Help Students, Customers, and Teachers use the CampusFlow learning community. Sound like a warm, patient human support person speaking aloud: use short natural sentences, contractions when appropriate, and one clear next step. Avoid markdown tables, long lists, raw URLs, and robotic phrasing. Use the exact names of visible buttons or pages when helpful. Explain how to use profiles, posts, visibility, friend requests, accepted-friend messaging, courses, and account settings. Never claim to see private messages, private posts, passwords, payment records, or another user’s private data. Do not invent school policies. If a request needs staff access, tell the user to contact CampusFlow support. Keep answers under 120 words.',
          input: `Answer entirely in ${responseLanguage}. User question: ${question}`,
          generation_config: { max_output_tokens: 220, temperature: 0.35 },
          store: false,
        }),
        signal: controller.signal,
      });
      const data = await response.json() as {
        output_text?: string;
        output?: Array<{ content?: Array<{ text?: string }> }>;
        steps?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(data.error?.message || 'Gemini support request failed');
      const answer = data.output_text
        || data.output?.flatMap((item) => item.content || []).map((content) => content.text || '').join('').trim()
        || data.steps?.flatMap((step) => step.content || []).filter((content) => content.type === 'text').map((content) => content.text || '').join('').trim();
      if (!answer) throw new Error('Gemini support returned an empty answer');
      return { answer, source: 'ai', configured: true };
    } finally {
      clearTimeout(timeout);
    }
  }

  async speech(userId: string, text: string, language: SpeechLanguage): Promise<SpeechResult> {
    const cleanText = text.trim().slice(0, 2000);
    if (!cleanText) throw new HttpException('Speech text is required.', HttpStatus.BAD_REQUEST);

    const now = Date.now();
    const speechKey = `speech:${userId}`;
    const lastRequest = this.lastRequestByUser.get(speechKey) || 0;
    if (now - lastRequest < 700) throw new HttpException('Please wait a moment before playing another reply.', HttpStatus.TOO_MANY_REQUESTS);
    this.lastRequestByUser.set(speechKey, now);

    const geminiApiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    if (geminiApiKey) return this.geminiSpeech(geminiApiKey, cleanText, language);

    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) throw new HttpException('AI speech is not configured.', HttpStatus.SERVICE_UNAVAILABLE);

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.get<string>('OPENAI_TTS_MODEL') || 'gpt-4o-mini-tts',
        voice: this.config.get<string>('OPENAI_TTS_VOICE') || 'marin',
        input: cleanText,
        instructions: language === 'km'
          ? 'Speak clearly and warmly in natural Khmer. Use a friendly customer-support tone, with comfortable pauses and human-like intonation.'
          : 'Speak like a warm, patient human customer-support person. Use a natural pace, comfortable pauses, and friendly intonation.',
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new HttpException(detail || 'AI speech generation failed.', HttpStatus.BAD_GATEWAY);
    }

    return { audio: Buffer.from(await response.arrayBuffer()), contentType: 'audio/mpeg' };
  }

  private async geminiSpeech(apiKey: string, text: string, language: SpeechLanguage): Promise<SpeechResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.get<string>('GEMINI_TTS_MODEL') || 'gemini-3.8-flash-tts',
          input: [{
            type: 'user_input',
            content: [{
              type: 'text',
              text,
              annotations: [{
                type: 'speech_metadata',
                style: language === 'km'
                  ? 'warm, natural, clear Khmer customer-support voice with friendly intonation and comfortable pauses'
                  : 'warm, natural customer-support voice with friendly intonation and comfortable pauses',
              }],
            }],
          }],
          response_format: { type: 'audio' },
          generation_config: {
            speech_config: [{ voice: this.config.get<string>('GEMINI_TTS_VOICE') || 'Kore' }],
          },
        }),
        signal: controller.signal,
      });
      const data = await response.json() as {
        steps?: Array<{ content?: Array<{ type?: string; data?: string }> }>;
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(data.error?.message || 'Gemini speech generation failed');
      const audioData = data.steps?.flatMap((step) => step.content || [])
        .reverse()
        .find((content) => content.type === 'audio' && content.data)?.data;
      if (!audioData) throw new Error('Gemini speech returned no audio');
      return { audio: Buffer.from(audioData, 'base64'), contentType: 'audio/wav' };
    } finally {
      clearTimeout(timeout);
    }
  }

  private fallbackKhmer(question: string) {
    const text = question.toLowerCase();
    if (text.includes('វគ្គសិក្សា') || text.includes('ទិញ') || text.includes('បង់')) return 'ចូលទៅកាន់ «វគ្គសិក្សា» ជ្រើសរើសវគ្គសិក្សា ហើយចូលគណនីជាសិស្ស ដើម្បីបន្តការទូទាត់តាម KHQR។ អតិថិជនអាចមើលព័ត៌មានវគ្គសិក្សា ប៉ុន្តែត្រូវចូលគណនីសិស្សដើម្បីទិញ។';
    if (text.includes('មិត្ត') || text.includes('ស្នើ')) return 'បើក «មិត្តភក្តិ» ជ្រើសរើសមនុស្សម្នាក់ ហើយចុច «បន្ថែមមិត្ត»។ បន្ទាប់ពីពួកគេទទួលយក អ្នកអាចបើក «សារ» ពីប្រវត្តិរូប ឬពីបញ្ជីមិត្តភក្តិ។';
    if (text.includes('សារ') || text.includes('ជជែក')) return 'អ្នកអាចជជែកជាឯកជនជាមួយមិត្តភក្តិដែលបានទទួលយកគ្នា។ បើកប្រវត្តិរូបមិត្តភក្តិ ឬទំព័រ «មិត្តភក្តិ» ចុច «សារ» ហើយផ្ញើសាររបស់អ្នក។';
    if (text.includes('បង្ហោះ') || text.includes('ប្រវត្តិរូប')) return 'បើកប្រវត្តិរូបរបស់អ្នក ដើម្បីបង្កើតការបង្ហោះ។ ជ្រើសរើស «សាធារណៈ» «មិត្តភក្តិ» ឬ «ខ្ញុំតែប៉ុណ្ណោះ» មុនពេលបង្ហោះ។ ម៉ាស៊ីនមេនឹងការពារការបង្ហោះសម្រាប់មិត្តភក្តិ និងការបង្ហោះឯកជនដោយស្វ័យប្រវត្តិ។';
    return 'ខ្ញុំអាចជួយអំពីវគ្គសិក្សា ប្រវត្តិរូប ការបង្ហោះ សំណើមិត្តភក្តិ និងសារ។ សូមសួរខ្ញុំអំពីរបៀបទិញវគ្គសិក្សា ឬបន្ថែមមិត្តភក្តិ។ ប្រសិនបើត្រូវការជំនួយគណនី ឬការទូទាត់ សូមទាក់ទងក្រុមគាំទ្រ CampusFlow។';
  }

  private isKhmerQuestion(question: string) {
    return /[\u1780-\u17ff]/u.test(question) || /\b(?:in Khmer|Khmer language)\b/i.test(question);
  }

  private fallback(question: string) {
    if (this.isKhmerQuestion(question)) return this.fallbackKhmer(question);
    const text = question.toLowerCase();
    if (text.includes('course') || text.includes('buy') || text.includes('payment')) return 'Open Courses from the menu, choose a course, then sign in as a Student to continue with KHQR payment. Customers can browse course information but must sign in as a Student to purchase.';
    if (text.includes('friend') || text.includes('request')) return 'Open Friends, choose a person, and select Add Friend. After they accept, you can open Message from their profile or your friends list.';
    if (text.includes('message') || text.includes('chat')) return 'You can chat privately with accepted friends. Open a friend profile or Friends, select Message, and send your note from the Messages page.';
    if (text.includes('post') || text.includes('profile')) return 'Open your profile to create a post. Choose Public, Friends, or Only me before publishing. The server protects Friends and Private posts automatically.';
    return 'I can help with courses, profiles, posts, friend requests, and messages. Try asking “How do I buy a course?” or “How do I add a friend?” If you need account or payment help, contact CampusFlow support.';
  }
}
