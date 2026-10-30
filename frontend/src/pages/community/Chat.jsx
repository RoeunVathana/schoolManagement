import { useCallback, useEffect, useRef, useState } from 'react';
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

function initials(name) {
  return name?.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
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
  const [showList, setShowList] = useState(true);
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
      setShowList(false);
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
  const canSend = draft.trim().length > 0 && !sending && Boolean(activeConversation);

  const selectConversation = (conversation) => {
    setActiveConversation(conversation);
    setShowList(false);
    setError('');
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!canSend) return;
    setSending(true);
    setError('');
    try {
      const message = unwrap(await api.post(`/api/chat/conversations/${activeConversation.id}/messages`, { body: draft.trim() }));
      setMessages((current) => [...current, message]);
      setDraft('');
      await loadConversations();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  return <div className="community-page community-chat-page">
    <section className="community-hero community-hero-compact">
      <div className="community-hero-orb community-hero-orb-one" />
      <div className="community-hero-copy"><p className="community-eyebrow">Private conversations</p><h1>Messages.</h1><p>Keep the conversation going with your accepted friends.</p></div>
      <button type="button" onClick={() => navigate('/friends')} className="community-button community-button-primary">Find friends</button>
    </section>
    {error && <div className="community-alert" role="alert">{error}</div>}

    <section className="community-chat-shell">
      <aside className={`community-chat-sidebar ${activeConversation && !showList ? 'community-chat-sidebar-mobile-hidden' : ''}`}>
        <div className="community-chat-sidebar-heading"><div><p className="community-eyebrow">Inbox</p><h2>Your chats</h2></div><span className="community-chat-count">{conversations.length}</span></div>
        {loading ? <div className="community-chat-loading"><span /><span /><span /></div> : conversations.length ? <div className="community-conversation-list">{conversations.map((conversation) => <button type="button" key={conversation.id} onClick={() => selectConversation(conversation)} className={`community-conversation-item ${activeConversation?.id === conversation.id ? 'is-active' : ''}`}><div className="community-avatar community-avatar-md">{conversation.otherUser?.profile?.avatar || conversation.otherUser?.profileImageUrl ? <img src={avatarUrl(conversation.otherUser)} alt="" /> : initials(conversation.otherUser?.fullName)}</div><div className="community-conversation-copy"><strong>{conversation.otherUser?.fullName}</strong><span>{conversation.lastMessage?.body || 'Start a conversation'}</span></div><span className="community-conversation-arrow" aria-hidden="true">→</span></button>)}</div> : <div className="community-chat-empty"><span className="community-empty-mark">○</span><p>You have no conversations yet.</p><button type="button" onClick={() => navigate('/friends')} className="community-text-link">Find friends <span aria-hidden="true">→</span></button></div>}
      </aside>

      <div className={`community-chat-main ${!activeConversation || showList ? 'community-chat-main-mobile-hidden' : ''}`}>
        <div className="community-chat-header">{activePerson ? <><button type="button" onClick={() => setShowList(true)} className="community-chat-back">← <span>Inbox</span></button><div className="community-avatar community-avatar-md">{activePerson.profile?.avatar || activePerson.profileImageUrl ? <img src={avatarUrl(activePerson)} alt={activePerson.fullName} /> : initials(activePerson.fullName)}</div><div className="community-chat-person"><strong>{activePerson.fullName}</strong><span>Accepted friend</span></div></> : <div className="community-chat-placeholder"><span className="community-chat-placeholder-icon">+</span><div><strong>Choose a conversation</strong><span>Your messages will appear here.</span></div></div>}</div>
        <div className="community-message-list">{loadingMessages ? <p className="community-message-state">Loading messages...</p> : messages.length ? messages.map((message) => <div key={message.id} className={`community-message-row ${message.senderId === activePerson?.id ? 'is-incoming' : 'is-outgoing'}`}><div className="community-message-bubble"><p>{message.body}</p><small>{displayDate(message.createdAt)}</small></div></div>) : <div className="community-message-state"><span className="community-empty-mark">○</span><p>{activePerson ? 'No messages yet. Say hello.' : 'Choose a conversation from the inbox.'}</p></div>}<div ref={messageEndRef} /></div>
        <form onSubmit={sendMessage} className="community-message-form"><input value={draft} onChange={(event) => setDraft(event.target.value)} disabled={!activeConversation || sending} placeholder={activePerson ? 'Write a message...' : 'Select a friend first'} /><button type="submit" disabled={!canSend} className="community-button community-button-primary">{sending ? 'Sending...' : 'Send'}</button></form>
      </div>
    </section>
  </div>;
}
