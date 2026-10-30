import { useEffect, useMemo, useRef, useState } from 'react';
import api, { unwrap } from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';

const translations = {
  en: {
    title: 'CampusFlow AI',
    subtitle: 'Friendly help for learning and community',
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
  },
  km: {
    title: 'ជំនួយ AI CampusFlow',
    subtitle: 'ជំនួយសម្រាប់ការរៀន និងសហគមន៍',
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
  },
};

export default function CommunityAiSupport({ publicMode = false, dockOpen = true, onOpenChange }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const text = translations[language] || translations.en;
  const [open, setOpen] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelClosing, setPanelClosing] = useState(false);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [messages, setMessages] = useState(() => [{ id: 'welcome', role: 'assistant', text: translations.en.welcome }]);
  const closeTimerRef = useRef(null);
  const canUse = publicMode || ['STUDENT', 'CUSTOMER'].includes(user?.role);
  const hasConversation = useMemo(() => messages.length > 1, [messages.length]);

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
  }, []);

  const openPanel = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    setPanelClosing(false);
    setPanelMounted(true);
    onOpenChange?.(true);
    window.requestAnimationFrame(() => setOpen(true));
  };

  const closePanel = () => {
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

  const togglePanel = () => (open ? closePanel() : openPanel());

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

  const ask = async (event, preset) => {
    event?.preventDefault();
    const value = (preset || question).trim();
    if (!value || busy) return;
    setBusy(true);
    setError('');
    setQuestion('');
    openPanel();
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: value }]);
    try {
      const endpoint = publicMode ? '/api/community-support/public' : '/api/community-support';
      const result = unwrap(await api.post(endpoint, { question: value }));
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', text: result.answer, source: result.source }]);
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.unavailable);
    } finally {
      setBusy(false);
    }
  };

  return <div style={{ '--community-keyboard-offset': `${keyboardOffset}px` }} aria-hidden={!dockOpen} className={`support-dock-item ${dockOpen ? 'is-expanded' : 'is-collapsed'} ${panelMounted ? 'is-panel-open' : ''} community-ai-support ${publicMode ? 'community-ai-support-public' : ''} ${keyboardOffset ? 'is-keyboard-open' : ''} fixed bottom-20 right-3 z-40 sm:bottom-24 sm:right-6`}>
    {panelMounted && <section className={`community-ai-panel ${panelClosing ? 'is-closing' : open ? 'is-open' : ''} mb-3 flex w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(16,36,63,.22)] dark:border-slate-700 dark:bg-[#101c30]`} aria-hidden={!open} aria-label={text.title} role="dialog">
      <header className="community-ai-header flex items-center justify-between gap-3 bg-navy px-4 py-3 text-white"><div><p className="text-sm font-black">{text.title}</p><p className="mt-0.5 text-[11px] font-semibold text-mint">{text.subtitle}</p></div><button type="button" onClick={closePanel} className="rounded-lg px-2 py-1 text-xl leading-none text-white/70 hover:bg-white/10 hover:text-white" aria-label={text.close}>×</button></header>
      <div className="community-ai-messages max-h-[min(62vh,28rem)] space-y-3 overflow-y-auto bg-slate-50/80 p-3 dark:bg-slate-950/30">
        {messages.map((message) => <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === 'user' ? 'rounded-br-md bg-navy text-white' : 'rounded-bl-md bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200'}`}><p className="whitespace-pre-wrap">{message.text}</p>{message.source === 'fallback' && <p className="mt-1 text-[10px] font-bold text-slate-400">{text.fallback}</p>}</div></div>)}
        {busy && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-sm text-slate-400 shadow-sm dark:bg-slate-800">{text.thinking}</div></div>}
        <div className="flex flex-wrap gap-1.5">{!hasConversation && text.quickQuestions.map((item) => <button type="button" key={item} onClick={(event) => ask(event, item)} className="rounded-full border border-mint/60 bg-mint/20 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 transition hover:bg-mint/40 dark:text-mint">{item}</button>)}</div>
      </div>
      <form onSubmit={ask} className="border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-[#101c30]"><div className="flex items-end gap-2"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows="2" maxLength="1000" disabled={busy} placeholder={text.placeholder} className="min-h-[2.75rem] min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-mint focus:ring-4 focus:ring-mint/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white" /><button type="submit" disabled={!question.trim() || busy} className="rounded-xl bg-mint px-3.5 py-2.5 text-sm font-black text-navy transition hover:bg-[#83e3c5] disabled:cursor-not-allowed disabled:opacity-50">{text.send}</button></div>{error && <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-300">{error}</p>}</form>
    </section>}
    <button type="button" onClick={togglePanel} aria-expanded={open} aria-label={text.open} className={`community-ai-launcher ${open ? 'is-open' : ''} flex h-12 items-center gap-2 rounded-full border border-white/20 bg-[#6f58d9] px-4 text-sm font-black text-white shadow-xl shadow-[#6f58d9]/30 transition hover:-translate-y-0.5 hover:bg-[#604bc6]`}><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">✦</span><span className="hidden sm:inline">{text.button}</span></button>
  </div>;
}
