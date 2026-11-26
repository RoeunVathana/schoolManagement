import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { unwrap } from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';

const translations = {
  en: {
    title: 'CampusFlow AI',
    subtitle: 'Friendly help for learning and community',
    online: 'Online now',
    welcome: 'Hi! I can help with courses, profiles, posts, friends, messages, and account questions.',
    quickQuestions: ['How do I buy a course?', 'How do I add a friend?', 'How do I create a post?'],
    placeholder: 'Ask CampusFlow anything…',
    send: 'Send',
    thinking: 'Thinking…',
    fallback: 'CampusFlow quick support',
    button: 'AI Help',
    close: 'Close AI chat',
    open: 'Open CampusFlow AI chat',
    unavailable: 'AI support is temporarily unavailable.',
    listen: 'Listen',
    stop: 'Stop',
    autoPlay: 'Auto-play replies',
    voiceReady: 'AI voice ready',
    voiceUnavailable: 'AI voice fallback unavailable',
    openCourses: 'Open courses',
    openFriends: 'Open friends',
    openMessages: 'Open messages',
    openProfile: 'Open my profile',
    openCommunity: 'Open community',
    openLab: 'Open programming lab',
    openSupport: 'Open support',
    signIn: 'Sign in to continue',
  },
  km: {
    title: 'ជំនួយ AI CampusFlow',
    subtitle: 'ជំនួយរួសរាយសម្រាប់ការរៀន និងសហគមន៍',
    online: 'កំពុងប្រើបាន',
    welcome: 'សួស្តី! ខ្ញុំអាចជួយអំពីវគ្គសិក្សា ប្រវត្តិរូប បង្ហោះ មិត្តភក្តិ សារ និងគណនី។',
    quickQuestions: ['តើខ្ញុំទិញវគ្គសិក្សាដោយរបៀបណា?', 'តើខ្ញុំបន្ថែមមិត្តភក្តិដោយរបៀបណា?', 'តើខ្ញុំបង្កើតការបង្ហោះដោយរបៀបណា?'],
    placeholder: 'សួរ CampusFlow អ្វីក៏បាន…',
    send: 'ផ្ញើ',
    thinking: 'កំពុងគិត…',
    fallback: 'ជំនួយរហ័ស CampusFlow',
    button: 'ជំនួយ AI',
    close: 'បិទការជជែក AI',
    open: 'បើកការជជែកជាមួយ AI CampusFlow',
    unavailable: 'ជំនួយ AI មិនអាចប្រើបានជាបណ្តោះអាសន្នទេ។',
    listen: 'ស្តាប់',
    stop: 'បញ្ឈប់',
    autoPlay: 'ចាក់សំឡេងចម្លើយដោយស្វ័យប្រវត្តិ',
    voiceReady: 'សំឡេង AI រួចរាល់',
    voiceUnavailable: 'មិនអាចប្រើសំឡេងបម្រុងបានទេ',
    openCourses: 'បើកវគ្គសិក្សា',
    openFriends: 'បើកមិត្តភក្តិ',
    openMessages: 'បើកសារ',
    openProfile: 'បើកប្រវត្តិរូបរបស់ខ្ញុំ',
    openCommunity: 'បើកសហគមន៍',
    openLab: 'បើកមន្ទីរពិសោធន៍កូដ',
    openSupport: 'បើកជំនួយ',
    signIn: 'ចូលគណនីដើម្បីបន្ត',
  },
};

const makeMessageId = (role) => `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function suggestedAction(question, { publicMode, user, text }) {
  // Match the customer's intent, not generic words in a fallback answer.
  // This keeps a broad support reply from suggesting an unrelated redirect.
  const content = question.toLowerCase();
  const privatePath = user?.role === 'CUSTOMER' ? '/customer/profile' : user?.role === 'TEACHER' ? '/teacher/profile' : '/student/profile';
  const autoRedirect = /\b(?:go|open|show|take me|bring me|navigate|redirect|visit)\b|បើក|ទៅកាន់|នាំខ្ញុំ/u.test(content);
  const route = (to, label, extra = {}) => ({ to, label, title: label, auto: autoRedirect, ...extra });
  const needsSignIn = (path, label) => publicMode || !user ? route('/login/student', text.signIn) : route(path, label);

  if (/course|courses|buy|purchase|payment|pay|khqr|វគ្គសិក្សា|ទិញ|បង់/.test(content)) return route('/courses#courses', text.openCourses, { target: 'courses' });
  if (/friend|friends|មិត្ត|ស្នើ/.test(content)) return needsSignIn('/friends', text.openFriends);
  if (/message|messages|chat|ជជែក|សារ/.test(content)) return needsSignIn('/chat', text.openMessages);
  if (/profile|post|posts|បង្ហោះ|ប្រវត្តិរូប/.test(content)) return publicMode ? route('/community', text.openCommunity) : route(privatePath, text.openProfile);
  if (/community|សហគមន៍/.test(content)) return route('/community', text.openCommunity);
  if (/lab|code|programming|កូដ|មន្ទីរពិសោធន៍/.test(content)) return route('/lab', text.openLab);
  if (/support|contact|account|staff|ជំនួយ|ទំនាក់ទំនង|គណនី/.test(content)) return route('/contact', text.openSupport);
  return null;
}

function speechLocale(content, language) {
  return /[\u1780-\u17ff]/u.test(content) || language === 'km' ? 'km-KH' : 'en-US';
}

// Khmer voices tend to render noticeably slower than English on phones. Keep
// the faster pace in one place so generated audio and browser fallback match.
const KHMER_AUDIO_PLAYBACK_RATE = 1.55;
const KHMER_BROWSER_SPEECH_RATE = 1.35;
const AI_REQUEST_TIMEOUT_MS = 40000;

function createSilentAudioDataUrl() {
  const dataLength = 800;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const writeText = (offset, value) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  writeText(0, 'RIFF');
  view.setUint32(4, buffer.byteLength - 8, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeText(36, 'data');
  view.setUint32(40, dataLength, true);
  let binary = '';
  new Uint8Array(buffer).forEach((byte) => { binary += String.fromCharCode(byte); });
  return `data:audio/wav;base64,${window.btoa(binary)}`;
}

export default function CommunityAiSupport({ publicMode = false, dockOpen = true, onOpenChange }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const text = translations[language] || translations.en;
  const [open, setOpen] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelClosing, setPanelClosing] = useState(false);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [layoutViewportHeight, setLayoutViewportHeight] = useState(0);
  const [speakingId, setSpeakingId] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(() => {
    try {
      return window.localStorage.getItem('campusflow-ai-autoplay') !== 'off';
    } catch {
      return true;
    }
  });
  const [messages, setMessages] = useState(() => [{ id: 'welcome', role: 'assistant', text: translations.en.welcome }]);
  const closeTimerRef = useRef(null);
  const speechRef = useRef(null);
  const speechAbortRef = useRef(null);
  const audioRef = useRef(null);
  const audioUnlockRef = useRef(null);
  const audioUnlockPromiseRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const audioUrlRef = useRef(null);
  const layoutViewportHeightRef = useRef(0);
  const voicesRef = useRef([]);
  const canUse = publicMode || ['STUDENT', 'CUSTOMER', 'TEACHER'].includes(user?.role);
  const hasConversation = useMemo(() => messages.length > 1, [messages.length]);

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    speechAbortRef.current?.abort();
    if (audioRef.current) audioRef.current.pause();
    if (audioUnlockRef.current) audioUnlockRef.current.pause();
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
    const synthesis = window.speechSynthesis;
    const loadVoices = () => { voicesRef.current = synthesis.getVoices(); };
    loadVoices();
    setSpeechSupported(true);
    synthesis.addEventListener?.('voiceschanged', loadVoices);
    return () => synthesis.removeEventListener?.('voiceschanged', loadVoices);
  }, []);

  function stopSpeaking() {
    speechAbortRef.current?.abort();
    speechAbortRef.current = null;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (audioUrlRef.current && typeof URL !== 'undefined') URL.revokeObjectURL(audioUrlRef.current);
    audioRef.current = null;
    audioUrlRef.current = null;
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    speechRef.current = null;
    setSpeakingId(null);
  }

  // iOS Safari requires a user gesture before it allows an audio element to
  // play. Prime a short silent clip from the tap/click, then the generated
  // voice audio can be attached after the API request completes.
  function primeAudioPlayback() {
    if (typeof window === 'undefined' || typeof window.Audio !== 'function' || audioUnlockedRef.current) return;
    const audio = audioUnlockRef.current || new window.Audio(createSilentAudioDataUrl());
    audioUnlockRef.current = audio;
    audio.preload = 'auto';
    audio.muted = true;
    audio.playsInline = true;
    audio.setAttribute('playsinline', 'true');
    if (!audioUnlockPromiseRef.current) {
      audioUnlockPromiseRef.current = audio.play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audioUnlockedRef.current = true;
        })
        .catch(() => {
          audioUnlockPromiseRef.current = null;
        });
    }
  }

  function speakBrowserMessage(message) {
    if (!speechSupported || !message?.text || typeof window === 'undefined') return Promise.resolve();
    const synthesis = window.speechSynthesis;
    if (!synthesis) return Promise.resolve();
    stopSpeaking();
    return new Promise((resolve) => {
      try {
        const utterance = new window.SpeechSynthesisUtterance(message.text.replace(/https?:\/\/\S+/g, ''));
        const locale = speechLocale(message.text, language);
        const voices = voicesRef.current.length ? voicesRef.current : synthesis.getVoices();
        const voice = voices.find((item) => item.lang?.toLowerCase().startsWith(locale.slice(0, 2).toLowerCase()))
          || voices.find((item) => item.lang?.toLowerCase().startsWith(locale.split('-')[0].toLowerCase()))
          || voices.find((item) => item.default);
        if (voice) utterance.voice = voice;
        utterance.lang = locale;
        utterance.rate = locale === 'km-KH' ? KHMER_BROWSER_SPEECH_RATE : 0.96;
        utterance.pitch = 1.02;
        utterance.volume = 0.96;
        utterance.onstart = () => { speechRef.current = utterance; setSpeakingId(message.id); };
        utterance.onend = () => { if (speechRef.current === utterance) { speechRef.current = null; setSpeakingId(null); } resolve(); };
        utterance.onerror = () => { if (speechRef.current === utterance) { speechRef.current = null; setSpeakingId(null); } resolve(); };
        speechRef.current = utterance;
        synthesis.speak(utterance);
      } catch {
        setSpeakingId(null);
        resolve();
      }
    });
  }

  async function playMessage(message) {
    if (!message?.text || typeof window === 'undefined') return;
    primeAudioPlayback();
    const unlockPromise = audioUnlockPromiseRef.current;
    stopSpeaking();
    const controller = new AbortController();
    speechAbortRef.current = controller;
    try {
      const endpoint = publicMode ? '/api/community-support/public/speech' : '/api/community-support/speech';
      const response = await api.post(endpoint, { text: message.text, language: speechLocale(message.text, language) === 'km-KH' ? 'km' : 'en' }, { responseType: 'blob', signal: controller.signal, timeout: AI_REQUEST_TIMEOUT_MS });
      if (controller.signal.aborted) return;
      if (unlockPromise) await unlockPromise;
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      const locale = speechLocale(message.text, language);
      audio.preload = 'auto';
      audio.playsInline = true;
      audio.setAttribute('playsinline', 'true');
      const playbackRate = locale === 'km-KH' ? KHMER_AUDIO_PLAYBACK_RATE : 1;
      audio.defaultPlaybackRate = playbackRate;
      audio.playbackRate = playbackRate;
      // Preserve the natural Khmer pitch while the audio is made brisker.
      audio.preservesPitch = true;
      audio.mozPreservesPitch = true;
      audio.webkitPreservesPitch = true;
      audioRef.current = audio;
      audioUrlRef.current = url;
      speechAbortRef.current = null;
      audio.onplay = () => setSpeakingId(message.id);
      return await new Promise((resolve, reject) => {
        audio.onended = () => { if (audioRef.current === audio) { audioRef.current = null; setSpeakingId(null); URL.revokeObjectURL(url); audioUrlRef.current = null; } resolve(); };
        audio.onerror = () => reject(new Error('AI audio could not be played'));
        audio.play().catch(reject);
      });
    } catch (requestError) {
      if (controller.signal.aborted) return;
      speechAbortRef.current = null;
      // Khmer falls back to the device voice only when the server voice is unavailable.
      return speakBrowserMessage(message);
    }
  }

  const openPanel = ({ speakWelcome = false } = {}) => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    setPanelClosing(false);
    setPanelMounted(true);
    onOpenChange?.(true);
    window.requestAnimationFrame(() => setOpen(true));
    if (speakWelcome && autoSpeak) {
      primeAudioPlayback();
      void playMessage({ id: 'welcome', text: text.welcome });
    }
  };

  const closePanel = () => {
    stopSpeaking();
    setOpen(false);
    setPanelClosing(true);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setPanelMounted(false);
      setPanelClosing(false);
      onOpenChange?.(false);
      closeTimerRef.current = null;
    }, 220);
  };

  useEffect(() => {
    if (!dockOpen && (open || (panelMounted && !panelClosing))) closePanel();
  }, [dockOpen, open, panelMounted, panelClosing]);

  const togglePanel = () => (open ? closePanel() : openPanel({ speakWelcome: true }));

  useEffect(() => {
    setMessages((current) => current.length === 1 ? [{ ...current[0], text: text.welcome }] : current);
  }, [text.welcome]);

  useEffect(() => {
    if (!open || typeof window === 'undefined') {
      setKeyboardOffset(0);
      setLayoutViewportHeight(0);
      layoutViewportHeightRef.current = 0;
      return undefined;
    }
    const viewport = window.visualViewport;
    layoutViewportHeightRef.current = Math.max(layoutViewportHeightRef.current, window.innerHeight);
    const updateKeyboardOffset = () => {
      const layoutHeight = layoutViewportHeightRef.current || window.innerHeight;
      const visibleHeight = viewport?.height || window.innerHeight;
      const offset = Math.max(0, layoutHeight - visibleHeight - (viewport?.offsetTop || 0));
      setKeyboardOffset(offset > 80 ? Math.min(offset, window.innerHeight * 0.75) : 0);
      setLayoutViewportHeight(layoutHeight);
    };
    updateKeyboardOffset();
    viewport?.addEventListener('resize', updateKeyboardOffset);
    viewport?.addEventListener('scroll', updateKeyboardOffset);
    window.addEventListener('resize', updateKeyboardOffset);
    return () => {
      viewport?.removeEventListener('resize', updateKeyboardOffset);
      viewport?.removeEventListener('scroll', updateKeyboardOffset);
      window.removeEventListener('resize', updateKeyboardOffset);
    };
  }, [open]);

  if (!canUse) return null;

  const handleAutoSpeak = (event) => {
    const enabled = event.target.checked;
    setAutoSpeak(enabled);
    try { window.localStorage.setItem('campusflow-ai-autoplay', enabled ? 'on' : 'off'); } catch { /* storage is optional */ }
    if (!enabled) stopSpeaking();
  };

  const openAction = (action) => {
    stopSpeaking();
    closePanel();
    navigate(action.to);
    if (action.target) window.setTimeout(() => document.getElementById(action.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 140);
  };

  const ask = async (event, preset) => {
    event?.preventDefault();
    const value = (preset || question).trim();
    if (!value || busy) return;
    const requestedAction = suggestedAction(value, { publicMode, user, text });
    if (autoSpeak) primeAudioPlayback();
    setBusy(true);
    setError('');
    setQuestion('');
    openPanel();
    setMessages((current) => [...current, { id: makeMessageId('user'), role: 'user', text: value }]);
    try {
      const endpoint = publicMode ? '/api/community-support/public' : '/api/community-support';
      const result = unwrap(await api.post(endpoint, { question: value }, { timeout: AI_REQUEST_TIMEOUT_MS }));
      const assistantMessage = {
        id: makeMessageId('assistant'),
        role: 'assistant',
        text: result.answer,
        source: result.source,
        action: requestedAction,
      };
      setMessages((current) => [...current, assistantMessage]);
      if (autoSpeak) {
        window.setTimeout(async () => {
          await playMessage(assistantMessage);
          if (assistantMessage.action?.auto) openAction(assistantMessage.action);
        }, 80);
      } else if (assistantMessage.action?.auto) {
        window.setTimeout(() => openAction(assistantMessage.action), 900);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.unavailable);
      // Keep explicit navigation commands useful even when the AI provider is
      // temporarily unavailable or times out. The route is already known from
      // the customer's intent, so a provider failure should not block it.
      if (requestedAction?.auto) {
        window.setTimeout(() => openAction(requestedAction), 700);
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePlayMessage = (message) => {
    if (speakingId === message.id) {
      stopSpeaking();
      return;
    }
    primeAudioPlayback();
    void playMessage(message);
  };

  return <div style={{ '--community-keyboard-offset': `${keyboardOffset}px`, '--community-layout-height': `${layoutViewportHeight || (typeof window !== 'undefined' ? window.innerHeight : 0)}px` }} aria-hidden={!dockOpen} className={`support-dock-item ${dockOpen ? 'is-expanded' : 'is-collapsed'} ${panelMounted ? 'is-panel-open' : ''} community-ai-support ${publicMode ? 'community-ai-support-public' : ''} ${keyboardOffset ? 'is-keyboard-open' : ''} fixed bottom-20 right-3 z-40 sm:bottom-24 sm:right-6`}>
    {panelMounted && <section className={`community-ai-panel ${panelClosing ? 'is-closing' : open ? 'is-open' : ''} mb-3 flex w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(16,36,63,.22)] dark:border-slate-700 dark:bg-[#101c30]`} aria-hidden={!open} aria-label={text.title} role="dialog">
      <header className="community-ai-header flex items-center justify-between gap-3 bg-navy px-4 py-3 text-white">
        <div className="community-ai-brand"><span className={`community-ai-avatar ${speakingId ? 'is-speaking' : ''}`} aria-hidden="true"><span>✦</span></span><div><p className="text-sm font-black">{text.title}</p><p className="mt-0.5 text-[11px] font-semibold text-mint">{text.subtitle}</p><span className="community-ai-status"><i aria-hidden="true" /> {text.online}</span></div></div>
        <div className="community-ai-header-actions"><span className="community-ai-language-pill">{language === 'km' ? 'ខ្មែរ' : 'EN'}</span><button type="button" onClick={closePanel} className="rounded-lg px-2 py-1 text-xl leading-none text-white/70 hover:bg-white/10 hover:text-white" aria-label={text.close}>×</button></div>
      </header>
      <div className="community-ai-messages max-h-[min(62vh,28rem)] space-y-3 overflow-y-auto bg-slate-50/80 p-3 dark:bg-slate-950/30">
        {messages.map((message) => <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === 'user' ? 'rounded-br-md bg-navy text-white' : 'rounded-bl-md bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200'}`}><p className="whitespace-pre-wrap">{message.text}</p>{message.role === 'assistant' && <div className="community-ai-message-tools"><button type="button" className="community-ai-speak-button" onClick={() => handlePlayMessage(message)}>{speakingId === message.id ? `■ ${text.stop}` : `▶ ${text.listen}`}</button>{message.action && <button type="button" className="community-ai-action-button" onClick={() => openAction(message.action)} title={message.action.title}>{message.action.label}</button>}</div>}{message.source === 'fallback' && <p className="mt-1 text-[10px] font-bold text-slate-400">{text.fallback}</p>}</div></div>)}
        {busy && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-sm text-slate-400 shadow-sm dark:bg-slate-800">{text.thinking}</div></div>}
        <div className="flex flex-wrap gap-1.5">{!hasConversation && text.quickQuestions.map((item) => <button type="button" key={item} onClick={(event) => ask(event, item)} className="rounded-full border border-mint/60 bg-mint/20 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 transition hover:bg-mint/40 dark:text-mint">{item}</button>)}</div>
      </div>
      <form onSubmit={ask} className="border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-[#101c30]"><div className="community-ai-voice-bar"><label className="community-ai-voice-toggle"><input type="checkbox" checked={autoSpeak} onChange={handleAutoSpeak} /> <span>{text.autoPlay}</span></label><span className={`community-ai-voice-status ${speechSupported ? 'is-ready' : ''}`}><i aria-hidden="true" /> {speechSupported ? text.voiceReady : text.voiceUnavailable}</span></div><div className="flex items-end gap-2"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows="2" maxLength="1000" disabled={busy} placeholder={text.placeholder} className="min-h-[2.75rem] min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-mint focus:ring-4 focus:ring-mint/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white" /><button type="submit" disabled={!question.trim() || busy} className="rounded-xl bg-mint px-3.5 py-2.5 text-sm font-black text-navy transition hover:bg-[#83e3c5] disabled:cursor-not-allowed disabled:opacity-50">{text.send}</button></div>{error && <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-300">{error}</p>}</form>
    </section>}
    <button type="button" onClick={togglePanel} aria-expanded={open} aria-label={text.open} className={`community-ai-launcher ${open ? 'is-open' : ''} flex h-12 items-center gap-2 rounded-full border border-white/20 bg-[#6f58d9] px-4 text-sm font-black text-white shadow-xl shadow-[#6f58d9]/30 transition hover:-translate-y-0.5 hover:bg-[#604bc6]`}><span className="community-ai-launcher-avatar" aria-hidden="true">✦</span><span className="hidden sm:inline">{text.button}</span></button>
  </div>;
}
