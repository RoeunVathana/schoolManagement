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
    voiceReady: 'Natural voice ready',
    voiceUnavailable: 'Voice is not available in this browser',
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
    voiceReady: 'សំឡេងធម្មជាតិរួចរាល់',
    voiceUnavailable: 'កម្មវិធីរុករកនេះមិនអាចប្រើសំឡេងបានទេ',
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
  const needsSignIn = (path, label) => publicMode || !user ? { to: '/login/student', label: text.signIn, title: label } : { to: path, label, title: label };

  if (/course|courses|buy|purchase|payment|pay|khqr|វគ្គសិក្សា|ទិញ|បង់/.test(content)) return { to: '/courses#courses', label: text.openCourses, title: text.openCourses, target: 'courses' };
  if (/friend|friends|មិត្ត|ស្នើ/.test(content)) return needsSignIn('/friends', text.openFriends);
  if (/message|messages|chat|ជជែក|សារ/.test(content)) return needsSignIn('/chat', text.openMessages);
  if (/profile|post|posts|បង្ហោះ|ប្រវត្តិរូប/.test(content)) return publicMode ? { to: '/community', label: text.openCommunity, title: text.openCommunity } : { to: privatePath, label: text.openProfile, title: text.openProfile };
  if (/community|សហគមន៍/.test(content)) return { to: '/community', label: text.openCommunity, title: text.openCommunity };
  if (/lab|code|programming|កូដ|មន្ទីរពិសោធន៍/.test(content)) return { to: '/lab', label: text.openLab, title: text.openLab };
  if (/support|contact|account|staff|ជំនួយ|ទំនាក់ទំនង|គណនី/.test(content)) return { to: '/contact', label: text.openSupport, title: text.openSupport };
  return null;
}

function speechLocale(content, language) {
  return /[\u1780-\u17ff]/u.test(content) || language === 'km' ? 'km-KH' : 'en-US';
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
  const voicesRef = useRef([]);
  const canUse = publicMode || ['STUDENT', 'CUSTOMER', 'TEACHER'].includes(user?.role);
  const hasConversation = useMemo(() => messages.length > 1, [messages.length]);

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
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
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    speechRef.current = null;
    setSpeakingId(null);
  }

  function speakMessage(message) {
    if (!speechSupported || !message?.text || typeof window === 'undefined') return;
    const synthesis = window.speechSynthesis;
    if (!synthesis) return;
    stopSpeaking();
    try {
      const utterance = new window.SpeechSynthesisUtterance(message.text.replace(/https?:\/\/\S+/g, ''));
      const locale = speechLocale(message.text, language);
      const voices = voicesRef.current.length ? voicesRef.current : synthesis.getVoices();
      const voice = voices.find((item) => item.lang?.toLowerCase().startsWith(locale.slice(0, 2).toLowerCase()))
        || voices.find((item) => item.lang?.toLowerCase().startsWith(locale.split('-')[0].toLowerCase()))
        || voices.find((item) => item.default);
      if (voice) utterance.voice = voice;
      utterance.lang = locale;
      utterance.rate = locale === 'km-KH' ? 0.9 : 0.96;
      utterance.pitch = 1.02;
      utterance.volume = 0.96;
      utterance.onstart = () => { speechRef.current = utterance; setSpeakingId(message.id); };
      utterance.onend = () => { if (speechRef.current === utterance) { speechRef.current = null; setSpeakingId(null); } };
      utterance.onerror = () => { if (speechRef.current === utterance) { speechRef.current = null; setSpeakingId(null); } };
      speechRef.current = utterance;
      synthesis.speak(utterance);
    } catch {
      setSpeakingId(null);
    }
  }

  const openPanel = ({ speakWelcome = false } = {}) => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    setPanelClosing(false);
    setPanelMounted(true);
    onOpenChange?.(true);
    window.requestAnimationFrame(() => setOpen(true));
    if (speakWelcome && autoSpeak) speakMessage({ id: 'welcome', text: text.welcome });
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
      return undefined;
    }
    const viewport = window.visualViewport;
    const updateKeyboardOffset = () => {
      if (!viewport) return;
      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardOffset(offset > 80 ? Math.min(offset, window.innerHeight * 0.75) : 0);
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
    setBusy(true);
    setError('');
    setQuestion('');
    openPanel();
    setMessages((current) => [...current, { id: makeMessageId('user'), role: 'user', text: value }]);
    try {
      const endpoint = publicMode ? '/api/community-support/public' : '/api/community-support';
      const result = unwrap(await api.post(endpoint, { question: value }));
      const assistantMessage = {
        id: makeMessageId('assistant'),
        role: 'assistant',
        text: result.answer,
        source: result.source,
        action: suggestedAction(value, { publicMode, user, text }),
      };
      setMessages((current) => [...current, assistantMessage]);
      if (autoSpeak) window.setTimeout(() => speakMessage(assistantMessage), 80);
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.unavailable);
    } finally {
      setBusy(false);
    }
  };

  return <div style={{ '--community-keyboard-offset': `${keyboardOffset}px` }} aria-hidden={!dockOpen} className={`support-dock-item ${dockOpen ? 'is-expanded' : 'is-collapsed'} ${panelMounted ? 'is-panel-open' : ''} community-ai-support ${publicMode ? 'community-ai-support-public' : ''} ${keyboardOffset ? 'is-keyboard-open' : ''} fixed bottom-20 right-3 z-40 sm:bottom-24 sm:right-6`}>
    {panelMounted && <section className={`community-ai-panel ${panelClosing ? 'is-closing' : open ? 'is-open' : ''} mb-3 flex w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(16,36,63,.22)] dark:border-slate-700 dark:bg-[#101c30]`} aria-hidden={!open} aria-label={text.title} role="dialog">
      <header className="community-ai-header flex items-center justify-between gap-3 bg-navy px-4 py-3 text-white">
        <div className="community-ai-brand"><span className={`community-ai-avatar ${speakingId ? 'is-speaking' : ''}`} aria-hidden="true"><span>✦</span></span><div><p className="text-sm font-black">{text.title}</p><p className="mt-0.5 text-[11px] font-semibold text-mint">{text.subtitle}</p><span className="community-ai-status"><i aria-hidden="true" /> {text.online}</span></div></div>
        <div className="community-ai-header-actions"><span className="community-ai-language-pill">{language === 'km' ? 'ខ្មែរ' : 'EN'}</span><button type="button" onClick={closePanel} className="rounded-lg px-2 py-1 text-xl leading-none text-white/70 hover:bg-white/10 hover:text-white" aria-label={text.close}>×</button></div>
      </header>
      <div className="community-ai-messages max-h-[min(62vh,28rem)] space-y-3 overflow-y-auto bg-slate-50/80 p-3 dark:bg-slate-950/30">
        {messages.map((message) => <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === 'user' ? 'rounded-br-md bg-navy text-white' : 'rounded-bl-md bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200'}`}><p className="whitespace-pre-wrap">{message.text}</p>{message.role === 'assistant' && <div className="community-ai-message-tools"><button type="button" className="community-ai-speak-button" onClick={() => (speakingId === message.id ? stopSpeaking() : speakMessage(message))} disabled={!speechSupported}>{speakingId === message.id ? `■ ${text.stop}` : `▶ ${text.listen}`}</button>{message.action && <button type="button" className="community-ai-action-button" onClick={() => openAction(message.action)} title={message.action.title}>{message.action.label}</button>}</div>}{message.source === 'fallback' && <p className="mt-1 text-[10px] font-bold text-slate-400">{text.fallback}</p>}</div></div>)}
        {busy && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-sm text-slate-400 shadow-sm dark:bg-slate-800">{text.thinking}</div></div>}
        <div className="flex flex-wrap gap-1.5">{!hasConversation && text.quickQuestions.map((item) => <button type="button" key={item} onClick={(event) => ask(event, item)} className="rounded-full border border-mint/60 bg-mint/20 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 transition hover:bg-mint/40 dark:text-mint">{item}</button>)}</div>
      </div>
      <form onSubmit={ask} className="border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-[#101c30]"><div className="community-ai-voice-bar"><label className="community-ai-voice-toggle"><input type="checkbox" checked={autoSpeak} onChange={handleAutoSpeak} /> <span>{text.autoPlay}</span></label><span className={`community-ai-voice-status ${speechSupported ? 'is-ready' : ''}`}><i aria-hidden="true" /> {speechSupported ? text.voiceReady : text.voiceUnavailable}</span></div><div className="flex items-end gap-2"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows="2" maxLength="1000" disabled={busy} placeholder={text.placeholder} className="min-h-[2.75rem] min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-mint focus:ring-4 focus:ring-mint/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white" /><button type="submit" disabled={!question.trim() || busy} className="rounded-xl bg-mint px-3.5 py-2.5 text-sm font-black text-navy transition hover:bg-[#83e3c5] disabled:cursor-not-allowed disabled:opacity-50">{text.send}</button></div>{error && <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-300">{error}</p>}</form>
    </section>}
    <button type="button" onClick={togglePanel} aria-expanded={open} aria-label={text.open} className={`community-ai-launcher ${open ? 'is-open' : ''} flex h-12 items-center gap-2 rounded-full border border-white/20 bg-[#6f58d9] px-4 text-sm font-black text-white shadow-xl shadow-[#6f58d9]/30 transition hover:-translate-y-0.5 hover:bg-[#604bc6]`}><span className="community-ai-launcher-avatar" aria-hidden="true">✦</span><span className="hidden sm:inline">{text.button}</span></button>
  </div>;
}
