import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { unwrap } from '../../api/axios';
import CommunityMedia, { isCommunityVideo } from '../../components/CommunityMedia';
import UserAvatar from '../../components/UserAvatar';
import { AuthContext } from '../../context/AuthContext';
import { useCommunityText } from '../../context/communityTranslations';
import { useLanguage } from '../../context/LanguageContext';

const MAX_CHAT_MEDIA_SIZE = 250 * 1024 * 1024;

function imageFileName(value, fallbackId) {
  const name = value?.split('/').pop()?.split('?')[0];
  return name || `campusflow-chat-${fallbackId}.jpg`;
}
function displayDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function GroupChatAvatar({ group, large = false }) {
  const className = `community-group-chat-avatar ${large ? 'community-group-chat-avatar-large' : ''} ${group?.coverImageUrl ? 'community-group-chat-avatar-image' : ''}`;
  return group?.coverImageUrl
    ? <span className={className}><CommunityMedia url={group.coverImageUrl} mediaType="IMAGE" alt={group.name || 'Group'} className="community-group-chat-avatar-media" /></span>
    : <span className={className} aria-hidden="true">#</span>;
}

const reactionOptions = [
  { type: 'LIKE', emoji: '👍', label: { en: 'Like', km: 'ចូលចិត្ត' } },
  { type: 'LOVE', emoji: '❤️', label: { en: 'Love', km: 'ស្រឡាញ់' } },
  { type: 'HAHA', emoji: '😂', label: { en: 'Haha', km: 'ហាហា' } },
  { type: 'WOW', emoji: '😮', label: { en: 'Wow', km: 'អស្ចារ្យ' } },
  { type: 'SAD', emoji: '😢', label: { en: 'Sad', km: 'សោកសៅ' } },
  { type: 'ANGRY', emoji: '😡', label: { en: 'Angry', km: 'ខឹង' } },
];

const reactionEmoji = Object.fromEntries(reactionOptions.map((reaction) => [reaction.type, reaction.emoji]));

function withReaction(message, nextType) {
  const counts = { ...(message.reactions || {}) };
  const previousType = message.myReaction;
  if (previousType) counts[previousType] = Math.max(0, (counts[previousType] || 0) - 1);
  if (nextType) counts[nextType] = (counts[nextType] || 0) + 1;
  Object.keys(counts).forEach((type) => { if (!counts[type]) delete counts[type]; });
  return { ...message, reactions: counts, reactionCount: Object.values(counts).reduce((total, count) => total + count, 0), myReaction: nextType || null };
}

export default function Chat() {
  const location = useLocation();
  const navigate = useNavigate();
  const text = useCommunityText();
  const { language } = useLanguage();
  const { user } = useContext(AuthContext);
  const requestedUserId = location.state?.userId || '';
  const requestedGroupId = location.state?.groupId || '';
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingStudyReminder, setSendingStudyReminder] = useState(false);
  const [error, setError] = useState('');
  const [showList, setShowList] = useState(true);
  const [reactionMenuId, setReactionMenuId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [downloadingImageId, setDownloadingImageId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [messageMenuId, setMessageMenuId] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const fileInputRef = useRef(null);
  const messageListRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const activeConversationRef = useRef(null);
  const viewedConversationRef = useRef(null);
  activeConversationRef.current = activeConversation;

  const loadConversations = useCallback(async () => {
    try {
      const [privateResult, groupResult, contactsResult] = await Promise.all([
        api.get('/api/chat/conversations'),
        api.get('/api/chat/group-conversations').catch(() => null),
        api.get('/api/chat/contacts').catch(() => null),
      ]);
      const result = [...(unwrap(privateResult) || []), ...(groupResult ? (unwrap(groupResult) || []) : [])].sort((first, second) => {
        const unreadPriority = Number(second.unreadCount > 0) - Number(first.unreadCount > 0);
        if (unreadPriority) return unreadPriority;
        return new Date(second.updatedAt || second.lastMessage?.createdAt || 0) - new Date(first.updatedAt || first.lastMessage?.createdAt || 0);
      });
      setConversations(result);
      setContacts(contactsResult ? unwrap(contactsResult) || [] : []);
      setActiveConversation((current) => current ? result.find((item) => item.id === current.id) || current : result[0] || null);
      return result;
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.couldNotLoadConversations);
      return [];
    } finally {
      setLoading(false);
    }
  }, [text.couldNotLoadConversations]);

  const loadMessages = useCallback(async (conversationId, silent = false) => {
    if (!conversationId) return;
    if (!silent) setLoadingMessages(true);
    try {
      const conversation = activeConversationRef.current?.id === conversationId ? activeConversationRef.current : null;
      const basePath = conversation?.isGroup ? 'group-conversations' : 'conversations';
      const result = unwrap(await api.get(`/api/chat/${basePath}/${conversationId}/messages`)) || [];
      setMessages(result);
      if (viewedConversationRef.current === conversationId) {
        await api.patch(`/api/chat/${basePath}/${conversationId}/read`);
        setConversations((current) => current.map((item) => item.id === conversationId ? { ...item, unreadCount: 0 } : item));
        setActiveConversation((current) => current?.id === conversationId ? { ...current, unreadCount: 0 } : current);
      }
    } catch (requestError) {
      if (!silent) setError(requestError.response?.data?.message || text.couldNotLoadConversation);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, [text.couldNotLoadConversation]);

  const openConversation = useCallback(async (userId) => {
    setError('');
    try {
      const conversation = unwrap(await api.post(`/api/chat/with/${userId}`));
      viewedConversationRef.current = conversation.id;
      setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)]);
      setActiveConversation(conversation);
      setShowList(false);
      return conversation;
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.onlyAcceptedChat);
      return null;
    }
  }, [text.onlyAcceptedChat]);

  const openGroup = useCallback(async (groupId) => {
    setError('');
    try {
      const conversation = unwrap(await api.post(`/api/chat/groups/${groupId}`));
      viewedConversationRef.current = conversation.id;
      setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)]);
      setActiveConversation(conversation);
      setShowList(false);
      return conversation;
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.groupChatFailed || 'Could not open this group chat.');
      return null;
    }
  }, [text.groupChatFailed]);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => {
    const timer = window.setInterval(() => loadConversations(), 4000);
    return () => window.clearInterval(timer);
  }, [loadConversations]);
  useEffect(() => { if (requestedUserId) openConversation(requestedUserId); }, [requestedUserId, openConversation]);
  useEffect(() => { if (requestedGroupId) openGroup(requestedGroupId); }, [requestedGroupId, openGroup]);
  useEffect(() => {
    const conversationId = activeConversation?.id;
    shouldAutoScrollRef.current = true;
    setMessages([]);
    if (!conversationId) return undefined;
    loadMessages(conversationId);
    const timer = window.setInterval(() => loadMessages(conversationId, true), 4000);
    return () => window.clearInterval(timer);
  }, [activeConversation?.id, loadMessages]);
  useEffect(() => {
    const list = messageListRef.current;
    if (!list || !shouldAutoScrollRef.current) return;
    list.scrollTo({ top: list.scrollHeight, behavior: messages.length > 1 ? 'smooth' : 'auto' });
  }, [messages.length]);

  const activePerson = activeConversation?.otherUser;
  const activeGroup = activeConversation?.isGroup ? activeConversation.group : null;
  const unreadTotal = conversations.reduce((total, conversation) => total + Number(conversation.unreadCount || 0), 0);
  const conversationContactIds = new Set(conversations.filter((conversation) => !conversation.isGroup && conversation.otherUser?.id).map((conversation) => conversation.otherUser.id));
  const availableContacts = contacts.filter((contact) => !conversationContactIds.has(contact.id));
  const canSend = Boolean(activeConversation) && !sending && !uploadingImage && (draft.trim().length > 0 || Boolean(imageFile));
  const canTeacherSupportStudent = user?.role === 'TEACHER' && Boolean(activeConversation) && !activeConversation.isGroup && Boolean(activePerson) && activePerson.role !== 'TEACHER';
  const sendStudyReminder = async () => {
    if (!canTeacherSupportStudent || sendingStudyReminder) return;
    setSendingStudyReminder(true);
    setError('');
    try {
      const name = activePerson.fullName?.split(' ')?.[0] || 'there';
      const message = unwrap(await api.post(`/api/chat/conversations/${activeConversation.id}/messages`, { body: `Hello ${name}, please come to study when you are available. Let me know if you need help.` }));
      setMessages((current) => [...current, message]);
      await loadConversations();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not send the study reminder.');
    } finally {
      setSendingStudyReminder(false);
    }
  };
  const callStudent = () => {
    const phone = activePerson?.phone?.trim();
    if (!phone) {
      setError('This student has no phone number saved.');
      return;
    }
    window.location.href = `tel:${phone.replace(/[^\d+]/g, '')}`;
  };
  const selectConversation = (conversation) => {
    viewedConversationRef.current = conversation.id;
    setConversations((current) => current.map((item) => item.id === conversation.id ? { ...item, unreadCount: 0 } : item));
    setActiveConversation({ ...conversation, unreadCount: 0 });
    setShowList(false);
    setError('');
  };

  const clearImage = useCallback(() => {
    setImageFile(null);
    setImagePreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return '';
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const selectImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError(text.onlyChatMedia || 'Please choose an image or video file.');
      clearImage();
      return;
    }
    if (file.size > MAX_CHAT_MEDIA_SIZE) {
      setError(text.chatMediaLimit || 'Images and videos must be 250 MB or smaller.');
      clearImage();
      return;
    }
    setError('');
    setImageFile(file);
    setImagePreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  };

  const sendImage = async () => {
    if (!activeConversation || !imageFile || uploadingImage || sending) return;
    setUploadingImage(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      if (draft.trim()) formData.append('body', draft.trim());
      const basePath = activeConversation.isGroup ? 'group-conversations' : 'conversations';
      const message = unwrap(await api.post(`/api/chat/${basePath}/${activeConversation.id}/images`, formData));
      setMessages((current) => [...current, message]);
      setDraft('');
      clearImage();
      await loadConversations();
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.messageNotSent);
    } finally {
      setUploadingImage(false);
    }
  };

  const downloadImage = async (message) => {
    if (!message?.imageUrl || downloadingImageId) return;
    setDownloadingImageId(message.id);
    setError('');
    try {
      const response = await api.get(`/api/chat/messages/${message.id}/image`, { responseType: 'blob' });
      const downloadUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = imageFileName(message.imageUrl, message.id);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.downloadFailed || 'Could not download this attachment.');
    } finally {
      setDownloadingImageId(null);
    }
  };

  const startEditing = (message) => {
    setMessageMenuId(null);
    setReactionMenuId(null);
    setEditingMessageId(message.id);
    setEditDraft(message.body || '');
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditDraft('');
  };

  const saveEdit = async (event, message) => {
    event.preventDefault();
    const body = editDraft.trim();
    if (!body || !activeConversation || editingMessageId !== message.id) return;
    setSending(true);
    setError('');
    try {
      const updated = unwrap(await api.patch(`/api/chat/messages/${message.id}`, { body }));
      setMessages((current) => current.map((item) => item.id === message.id ? updated : item));
      cancelEditing();
      await loadConversations();
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.editFailed || 'Could not edit this message.');
    } finally {
      setSending(false);
    }
  };

  const removeMessage = async (message) => {
    if (!activeConversation || deletingMessageId) return;
    if (!window.confirm(text.deleteMessageConfirm || 'Delete this message?')) return;
    setMessageMenuId(null);
    setDeletingMessageId(message.id);
    setError('');
    try {
      const deleted = unwrap(await api.delete(`/api/chat/messages/${message.id}`));
      setMessages((current) => current.map((item) => item.id === message.id ? deleted : item));
      await loadConversations();
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.deleteFailed || 'Could not delete this message.');
    } finally {
      setDeletingMessageId(null);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (imageFile) {
      await sendImage();
      return;
    }
    if (!canSend) return;
    setSending(true);
    setError('');
    try {
      const basePath = activeConversation.isGroup ? 'group-conversations' : 'conversations';
      const message = unwrap(await api.post(`/api/chat/${basePath}/${activeConversation.id}/messages`, { body: draft.trim() }));
      setMessages((current) => [...current, message]);
      setDraft('');
      await loadConversations();
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.messageNotSent);
    } finally {
      setSending(false);
    }
  };

  const reactToMessage = async (message, type) => {
    const nextType = message.myReaction === type ? null : type;
    const previousMessages = messages;
    setReactionMenuId(null);
    setMessages((current) => current.map((item) => item.id === message.id ? withReaction(item, nextType) : item));
    try {
      if (nextType) await api.patch(`/api/chat/messages/${message.id}/reaction`, { type: nextType });
      else await api.delete(`/api/chat/messages/${message.id}/reaction`);
    } catch (requestError) {
      setMessages(previousMessages);
      setError(requestError.response?.data?.message || text.reactionFailed || 'Could not update reaction.');
    }
  };

  return <div className="community-page community-chat-page">
    <section className="community-hero community-hero-compact">
      <div className="community-hero-orb community-hero-orb-one" />
      <div className="community-hero-copy"><p className="community-eyebrow">{text.privateConversations}</p><h1>{text.messages}.</h1><p>{user?.role === 'TEACHER' ? (text.teacherMessagesDescription || 'Chat with students who have paid for your courses.') : user?.role === 'STUDENT' ? (text.studentMessagesDescription || 'Chat with your teachers and accepted friends.') : text.messagesDescription}</p></div>
      <button type="button" onClick={() => navigate('/friends')} className="community-button community-button-primary">{text.findFriends}</button>
    </section>
    {error && <div className="community-alert" role="alert">{error}</div>}

    <section className="community-chat-shell">
      <aside className={`community-chat-sidebar ${activeConversation && !showList ? 'community-chat-sidebar-mobile-hidden' : ''}`}>
        <div className="community-chat-sidebar-heading"><div><p className="community-eyebrow">{text.inbox}</p><h2>{text.yourChats}</h2></div><div className="community-chat-counts"><span className="community-chat-count">{conversations.length}</span>{unreadTotal > 0 && <span className="community-chat-unread-total" aria-label={`${unreadTotal} ${text.unreadMessages || 'unread messages'}`}>{unreadTotal > 99 ? '99+' : unreadTotal}</span>}</div></div>
        {loading ? <div className="community-chat-loading"><span /><span /><span /></div> : conversations.length ? <div className="community-conversation-list">{conversations.map((conversation) => <button type="button" key={conversation.id} onClick={() => selectConversation(conversation)} className={`community-conversation-item ${activeConversation?.id === conversation.id ? 'is-active' : ''} ${conversation.unreadCount > 0 ? 'is-unread' : ''}`} aria-label={`${conversation.isGroup ? conversation.group?.name : conversation.otherUser?.fullName}${conversation.unreadCount > 0 ? `, ${conversation.unreadCount} unread messages` : ''}`} title={conversation.unreadCount > 0 ? `${conversation.unreadCount} unread messages` : undefined}>{conversation.isGroup ? <GroupChatAvatar group={conversation.group} /> : <UserAvatar person={conversation.otherUser} size="md" />}<div className="community-conversation-copy"><strong>{conversation.isGroup ? conversation.group?.name : conversation.otherUser?.fullName}</strong><span>{conversation.lastMessage?.body || (conversation.lastMessage?.imageUrl ? '📷 Image' : conversation.isGroup ? `${conversation.group?.memberCount || 0} ${text.members || 'members'}` : text.startConversation)}</span></div>{conversation.unreadCount > 0 && <span className="community-conversation-unread" aria-label={`${conversation.unreadCount} ${text.unreadMessages || 'unread messages'}`}>{conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}</span>}<span className="community-conversation-arrow" aria-hidden="true">→</span></button>)}</div> : <div className="community-chat-empty"><span className="community-empty-mark">○</span><p>{text.noConversations}</p><button type="button" onClick={() => navigate('/friends')} className="community-text-link">{text.findFriends} <span aria-hidden="true">→</span></button></div>}
        {availableContacts.length > 0 && <section className="community-chat-contacts" aria-label={text.chatContacts || 'Course contacts'}><div className="community-chat-contacts-heading"><div><p className="community-eyebrow">{text.chatContacts || 'Course contacts'}</p><span>{user?.role === 'TEACHER' ? 'Students with paid access to your courses.' : text.chatContactsDescription || 'People connected through your active courses'}</span></div><span>{availableContacts.length}</span></div><div className="community-chat-contact-list">{availableContacts.map((contact) => <button type="button" key={contact.id} className="community-chat-contact" onClick={() => openConversation(contact.id)}><UserAvatar person={contact} size="sm" /><span><strong>{contact.fullName}</strong><small>{contact.role === 'TEACHER' ? (text.teacher || 'Teacher') : (text.student || 'Student')} · {contact.isOnline ? 'Online' : 'Offline'}</small></span><span aria-hidden="true">→</span></button>)}</div></section>}
      </aside>

      <div className={`community-chat-main ${!activeConversation || showList ? 'community-chat-main-mobile-hidden' : ''}`}>
        <div className="community-chat-header">{activeConversation ? <><button type="button" onClick={() => { viewedConversationRef.current = null; setShowList(true); }} className="community-chat-back">← <span>{text.inbox}</span></button>{activeGroup ? <GroupChatAvatar group={activeGroup} large /> : <UserAvatar person={activePerson} size="md" />}<div className="community-chat-person"><strong>{activeGroup?.name || activePerson?.fullName}</strong><span>{activeGroup ? `${activeGroup.memberCount || 0} ${text.members || 'members'}` : ['STUDENT', 'CUSTOMER'].includes(activePerson?.role) ? `${text.student || 'Student'} · ${activePerson?.isOnline ? 'Online' : 'Offline'}` : text.acceptedFriend}</span></div>{canTeacherSupportStudent && <div className="community-chat-header-actions"><button type="button" onClick={sendStudyReminder} disabled={sendingStudyReminder} className="community-chat-header-action community-chat-study-action" title="Send study reminder">📚 <span>{sendingStudyReminder ? 'Sending...' : 'Invite to study'}</span></button><button type="button" onClick={callStudent} disabled={!activePerson?.phone} className="community-chat-header-action community-chat-call-action" title={activePerson?.phone ? 'Call student' : 'No phone number saved'}>☎ <span>Call</span></button></div>}</> : <div className="community-chat-placeholder"><span className="community-chat-placeholder-icon">+</span><div><strong>{text.chooseConversation}</strong><span>{text.yourMessages}</span></div></div>}</div>
        <div ref={messageListRef} onScroll={(event) => {
          const list = event.currentTarget;
          shouldAutoScrollRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 96;
        }} className="community-message-list">
          {loadingMessages ? <p className="community-message-state">{text.loadingMessages}</p> : messages.length ? messages.map((message) => <div key={message.id} className={`community-message-row ${message.senderId === user?.id ? 'is-outgoing' : 'is-incoming'}`}>
            <div className={`community-message-bubble ${message.isDeleted ? 'is-deleted' : ''} ${editingMessageId === message.id ? 'is-editing' : ''}`}>
              {activeGroup && message.senderId !== user?.id && !message.isDeleted && <strong className="community-group-message-sender">{message.sender?.fullName}</strong>}
              {message.isDeleted && <p className="community-message-deleted">{text.messageDeleted || 'Message deleted'}</p>}
              {editingMessageId === message.id && !message.isDeleted && <form className="community-message-edit-form" onSubmit={(event) => saveEdit(event, message)}><textarea value={editDraft} onChange={(event) => setEditDraft(event.target.value)} autoFocus rows={3} maxLength={2000} aria-label={text.editMessage || 'Edit message'} /><div><button type="button" onClick={cancelEditing}>{text.cancel || 'Cancel'}</button><button type="submit" disabled={!editDraft.trim() || sending}>{sending ? (text.saving || 'Saving...') : (text.save || 'Save')}</button></div></form>}
              {message.imageUrl && <div className="community-message-attachment"><div className="community-message-image-link"><CommunityMedia url={message.imageUrl} mediaType={message.mediaType} alt={isCommunityVideo(message.mediaType, message.imageUrl) ? (text.chatVideoAlt || 'Chat video') : (text.chatImageAlt || 'Chat image')} className="community-message-media" /></div><div className="community-message-image-actions"><button type="button" onClick={() => downloadImage(message)} disabled={downloadingImageId === message.id}>{downloadingImageId === message.id ? (text.downloading || 'Downloading...') : (text.downloadImage || 'Download')}</button></div></div>}
              {message.body && <p>{message.body}</p>}
              <small>{displayDate(message.createdAt)}{message.isEdited ? ` · ${text.edited || 'Edited'}` : ''}</small>
            </div>
            <div className="community-message-actions">
              <button type="button" className={`community-message-reaction-trigger ${message.myReaction ? 'is-selected' : ''}`} onClick={() => setReactionMenuId((current) => current === message.id ? null : message.id)} aria-label={message.myReaction ? `${reactionOptions.find((reaction) => reaction.type === message.myReaction)?.label[language] || 'Reaction'} selected` : 'Add reaction'}>{message.myReaction ? reactionEmoji[message.myReaction] : '👍'}</button>
              {reactionMenuId === message.id && <div className="community-message-reaction-menu">{reactionOptions.map((reaction) => <button type="button" key={reaction.type} onClick={() => reactToMessage(message, reaction.type)} title={reaction.label[language] || reaction.label.en} aria-label={reaction.label[language] || reaction.label.en} className={message.myReaction === reaction.type ? 'is-selected' : ''}>{reaction.emoji}</button>)}</div>}
              {message.reactionCount > 0 && <div className="community-message-reaction-summary" aria-label={`${message.reactionCount} reactions`}>{Object.entries(message.reactions || {}).slice(0, 3).map(([type]) => <span key={type}>{reactionEmoji[type]}</span>)}<small>{message.reactionCount}</small></div>}
              {message.senderId === user?.id && !message.isDeleted && <div className="community-message-more"><button type="button" className="community-message-more-trigger" onClick={() => setMessageMenuId((current) => current === message.id ? null : message.id)} aria-label={text.moreActions || 'More actions'}>•••</button>{messageMenuId === message.id && <div className="community-message-more-menu"><button type="button" onClick={() => startEditing(message)} disabled={!message.body}>{text.editMessage || 'Edit'}</button><button type="button" onClick={() => removeMessage(message)} disabled={deletingMessageId === message.id}>{deletingMessageId === message.id ? (text.deleting || 'Deleting...') : (text.deleteMessage || 'Delete')}</button></div>}</div>}
            </div>
          </div>) : <div className="community-message-state"><span className="community-empty-mark">○</span><p>{activePerson ? text.noMessages : text.chooseFromInbox}</p></div>}
        </div>
        <form onSubmit={sendMessage} className="community-message-form">
          {imagePreview && <div className="community-chat-image-preview"><CommunityMedia url={imagePreview} mediaType={imageFile?.type?.startsWith('video/') ? 'VIDEO' : 'IMAGE'} alt={imageFile?.type?.startsWith('video/') ? (text.chatVideoPreview || 'Selected video') : (text.chatImagePreview || 'Selected image')} className="community-chat-media-preview" /><button type="button" onClick={clearImage} aria-label={text.removeImage || 'Remove media'}>×</button></div>}
          <div className="community-message-form-row">
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime,video/x-m4v" onChange={selectImage} className="community-chat-file-input" aria-label={text.attachMedia || 'Attach image or video'} disabled={!activeConversation || sending || uploadingImage} />
            <button type="button" className="community-chat-attach-button" onClick={() => fileInputRef.current?.click()} disabled={!activeConversation || sending || uploadingImage} aria-label={text.attachMedia || 'Attach image or video'}>🖼️</button>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} disabled={!activeConversation || sending || uploadingImage} placeholder={activePerson ? text.writeMessage : text.selectFriend} />
            <button type="submit" disabled={!canSend} className="community-button community-button-primary">{uploadingImage ? (text.uploading || 'Uploading...') : sending ? text.sending : text.send}</button>
          </div>
        </form>
      </div>
    </section>
  </div>;
}
