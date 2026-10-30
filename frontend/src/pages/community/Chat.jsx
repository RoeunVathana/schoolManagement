import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { unwrap } from '../../api/axios';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const avatarUrl = (person) => {
  const path = person?.profile?.avatar || person?.profileImageUrl;
  return path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;
};

function displayDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function Chat() {
  const location = useLocation();
  const navigate = useNavigate();
  const requestedUserId = location.state?.userId || '';
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messageEndRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const result = unwrap(await api.get('/api/chat/conversations')) || [];
      setConversations(result);
      setActiveConversation((current) => current ? result.find((item) => item.id === current.id) || current : result[0] || null);
      return result;
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load your conversations.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId, silent = false) => {
    if (!conversationId) return;
    if (!silent) setLoadingMessages(true);
    try {
      const result = unwrap(await api.get(`/api/chat/conversations/${conversationId}/messages`)) || [];
      setMessages(result);
      await api.patch(`/api/chat/conversations/${conversationId}/read`);
    } catch (requestError) {
      if (!silent) setError(requestError.response?.data?.message || 'Could not load this conversation.');
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, []);

  const openConversation = useCallback(async (userId) => {
    setError('');
    try {
      const conversation = unwrap(await api.post(`/api/chat/with/${userId}`));
      setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)]);
      setActiveConversation(conversation);
      return conversation;
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Only accepted friends can start a chat.');
      return null;
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { if (requestedUserId) openConversation(requestedUserId); }, [requestedUserId, openConversation]);

  useEffect(() => {
    const conversationId = activeConversation?.id;
    setMessages([]);
    if (!conversationId) return undefined;
    loadMessages(conversationId);
    const timer = window.setInterval(() => loadMessages(conversationId, true), 4000);
    return () => window.clearInterval(timer);
  }, [activeConversation?.id, loadMessages]);

  useEffect(() => { messageEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const activePerson = activeConversation?.otherUser;
  const canSend = useMemo(() => draft.trim().length > 0 && !sending && Boolean(activeConversation), [draft, sending, activeConversation]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!canSend) return;
    setSending(true); setError('');
    try {
      const message = unwrap(await api.post(`/api/chat/conversations/${activeConversation.id}/messages`, { body: draft.trim() }));
      setMessages((current) => [...current, message]);
      setDraft('');
      await loadConversations();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Message could not be sent.');
    } finally { setSending(false); }
  };

  return <div className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.24em] text-coral">Community</p><h1 className="mt-2 text-3xl font-black tracking-tight text-ink dark:text-white sm:text-4xl">Messages</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Private conversations with your accepted friends.</p></div><button type="button" onClick={() => navigate('/friends')} className="rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-navy/15 hover:bg-[#1b3b5d]">Find friends</button></div>
    {error && <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
    <section className="grid min-h-[34rem] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/80 lg:grid-cols-[19rem_1fr]">
      <aside className="border-b border-slate-200 dark:border-slate-700 lg:border-b-0 lg:border-r"><div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700"><h2 className="font-black text-ink dark:text-white">Your chats</h2></div>{loading ? <p className="p-5 text-sm text-slate-500">Loading chats…</p> : conversations.length ? <div className="max-h-[28rem] overflow-y-auto p-2">{conversations.map((conversation) => <button type="button" key={conversation.id} onClick={() => setActiveConversation(conversation)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${activeConversation?.id === conversation.id ? 'bg-mint/25 dark:bg-mint/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy font-black text-mint">{conversation.otherUser?.profile?.avatar || conversation.otherUser?.profileImageUrl ? <img src={avatarUrl(conversation.otherUser)} alt="" className="h-full w-full object-cover" /> : conversation.otherUser?.fullName?.charAt(0)?.toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-ink dark:text-white">{conversation.otherUser?.fullName}</p><p className="truncate text-xs text-slate-500 dark:text-slate-400">{conversation.lastMessage?.body || 'Start a conversation'}</p></div></button>)}</div> : <div className="p-5 text-sm leading-6 text-slate-500 dark:text-slate-400">You have no conversations yet. Accept a friend request, then choose Message.</div>}</aside>
      <div className="flex min-h-[34rem] flex-col"><div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">{activePerson ? <><div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-navy font-black text-mint">{activePerson.profile?.avatar || activePerson.profileImageUrl ? <img src={avatarUrl(activePerson)} alt={activePerson.fullName} className="h-full w-full object-cover" /> : activePerson.fullName?.charAt(0)?.toUpperCase()}</div><div><p className="font-black text-ink dark:text-white">{activePerson.fullName}</p><p className="text-xs font-semibold text-mint">Friend</p></div></> : <p className="font-black text-slate-400">Select a friend to start chatting</p>}</div><div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-5 dark:bg-slate-950/20">{loadingMessages ? <p className="text-sm text-slate-500">Loading messages…</p> : messages.length ? messages.map((message) => <div key={message.id} className={`flex ${message.senderId === activePerson?.id ? 'justify-start' : 'justify-end'}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.senderId === activePerson?.id ? 'rounded-bl-md bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200' : 'rounded-br-md bg-navy text-white'}`}><p className="whitespace-pre-wrap break-words">{message.body}</p><p className={`mt-1 text-[10px] ${message.senderId === activePerson?.id ? 'text-slate-400' : 'text-white/65'}`}>{displayDate(message.createdAt)}</p></div></div>) : <div className="flex h-full items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">{activePerson ? 'No messages yet. Say hello.' : 'Choose a conversation from the left.'}</div>}<div ref={messageEndRef} /></div><form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-200 p-4 dark:border-slate-700"><input value={draft} onChange={(event) => setDraft(event.target.value)} disabled={!activeConversation || sending} placeholder={activePerson ? 'Write a message…' : 'Select a friend first'} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-mint dark:border-slate-600 dark:bg-slate-800 dark:text-white" /><button type="submit" disabled={!canSend} className="rounded-xl bg-mint px-5 py-3 text-sm font-black text-navy transition hover:bg-[#83e3c5] disabled:cursor-not-allowed disabled:opacity-50">{sending ? 'Sending…' : 'Send'}</button></form></div>
    </section>
  </div>;
}
