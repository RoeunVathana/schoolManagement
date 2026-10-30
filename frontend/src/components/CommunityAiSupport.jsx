import { useMemo, useState } from 'react';
import api, { unwrap } from '../api/axios';
import { useAuth } from '../hooks/useAuth';

const quickQuestions = ['How do I buy a course?', 'How do I add a friend?', 'How do I create a post?'];

export default function CommunityAiSupport() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([{ id: 'welcome', role: 'assistant', text: 'Hi! I can help you use CampusFlow community, friends, messages, posts, and courses.' }]);
  const canUse = ['STUDENT', 'CUSTOMER'].includes(user?.role);
  const hasConversation = useMemo(() => messages.length > 1, [messages.length]);

  if (!canUse) return null;

  const ask = async (event, preset) => {
    event?.preventDefault();
    const value = (preset || question).trim();
    if (!value || busy) return;
    setBusy(true); setError(''); setQuestion('');
    const userMessage = { id: `user-${Date.now()}`, role: 'user', text: value };
    setMessages((current) => [...current, userMessage]);
    try {
      const result = unwrap(await api.post('/api/community-support', { question: value }));
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', text: result.answer, source: result.source }]);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Support is temporarily unavailable.');
    } finally { setBusy(false); }
  };

  return <div className="community-ai-support fixed bottom-20 right-3 z-40 sm:bottom-24 sm:right-6">
    {open && <section className="mb-3 flex w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(16,36,63,.22)] dark:border-slate-700 dark:bg-[#101c30]" aria-label="CampusFlow AI support">
      <header className="flex items-center justify-between gap-3 bg-navy px-4 py-3 text-white"><div><p className="text-sm font-black">CampusFlow AI Support</p><p className="mt-0.5 text-[11px] font-semibold text-mint">For students and customers</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-xl leading-none text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close AI support">×</button></header>
      <div className="max-h-[min(58vh,22rem)] space-y-3 overflow-y-auto bg-slate-50/80 p-3 dark:bg-slate-950/30">{messages.map((message) => <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === 'user' ? 'rounded-br-md bg-navy text-white' : 'rounded-bl-md bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200'}`}><p className="whitespace-pre-wrap">{message.text}</p>{message.source === 'fallback' && <p className="mt-1 text-[10px] font-bold text-slate-400">CampusFlow quick support</p>}</div></div>)}{busy && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-sm text-slate-400 shadow-sm dark:bg-slate-800">Thinking…</div></div>}<div className="flex flex-wrap gap-1.5">{!hasConversation && quickQuestions.map((item) => <button type="button" key={item} onClick={(event) => ask(event, item)} className="rounded-full border border-mint/60 bg-mint/20 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 transition hover:bg-mint/40 dark:text-mint">{item}</button>)}</div></div>
      <form onSubmit={ask} className="border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-[#101c30]"><div className="flex items-end gap-2"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows="2" maxLength="1000" disabled={busy} placeholder="Ask about the community…" className="min-h-[2.75rem] min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-mint focus:ring-4 focus:ring-mint/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white" /><button type="submit" disabled={!question.trim() || busy} className="rounded-xl bg-mint px-3.5 py-2.5 text-sm font-black text-navy transition hover:bg-[#83e3c5] disabled:cursor-not-allowed disabled:opacity-50">Send</button></div>{error && <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-300">{error}</p>}</form>
    </section>}
    <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-label="Open CampusFlow AI support" className="flex h-12 items-center gap-2 rounded-full border border-white/20 bg-[#6f58d9] px-4 text-sm font-black text-white shadow-xl shadow-[#6f58d9]/30 transition hover:-translate-y-0.5 hover:bg-[#604bc6]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">✦</span><span className="hidden sm:inline">AI Help</span></button>
  </div>;
}
