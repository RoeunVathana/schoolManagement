import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SupportResult = { answer: string; source: 'ai' | 'fallback'; configured: boolean };

@Injectable()
export class CommunitySupportService {
  private readonly lastRequestByUser = new Map<string, number>();

  constructor(private readonly config: ConfigService) {}

  async answer(userId: string, question: string): Promise<SupportResult> {
    const cleanQuestion = question.trim().slice(0, 1000);
    const now = Date.now();
    const lastRequest = this.lastRequestByUser.get(userId) || 0;
    if (now - lastRequest < 1200) throw new HttpException('Please wait a moment before asking again.', HttpStatus.TOO_MANY_REQUESTS);
    this.lastRequestByUser.set(userId, now);

    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) return { answer: this.fallback(cleanQuestion), source: 'fallback', configured: false };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.get<string>('OPENAI_MODEL') || 'gpt-4o-mini',
          instructions: 'You are CampusFlow Community Support. Help Students and Customers use the CampusFlow learning community. Answer in a friendly, concise way. Explain how to use profiles, posts, visibility, friend requests, accepted-friend messaging, courses, and account settings. Never claim to see private messages, private posts, passwords, payment records, or another user’s private data. Do not invent school policies. If a request needs staff access, tell the user to contact CampusFlow support. Keep answers under 120 words.',
          input: cleanQuestion,
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
      const message = error instanceof Error ? error.message : 'Unknown AI support error';
      console.warn(`Community AI support fallback: ${message}`);
      return { answer: this.fallback(cleanQuestion), source: 'fallback', configured: true };
    }
  }

  private fallback(question: string) {
    const text = question.toLowerCase();
    if (text.includes('course') || text.includes('buy') || text.includes('payment')) return 'Open Courses from the menu, choose a course, then sign in as a Student to continue with KHQR payment. Customers can browse course information but must sign in as a Student to purchase.';
    if (text.includes('friend') || text.includes('request')) return 'Open Friends, choose a person, and select Add Friend. After they accept, you can open Message from their profile or your friends list.';
    if (text.includes('message') || text.includes('chat')) return 'You can chat privately with accepted friends. Open a friend profile or Friends, select Message, and send your note from the Messages page.';
    if (text.includes('post') || text.includes('profile')) return 'Open your profile to create a post. Choose Public, Friends, or Only me before publishing. The server protects Friends and Private posts automatically.';
    return 'I can help with courses, profiles, posts, friend requests, and messages. Try asking “How do I buy a course?” or “How do I add a friend?” If you need account or payment help, contact CampusFlow support.';
  }
}
