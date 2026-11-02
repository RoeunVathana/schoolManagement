import { Component, useEffect, useMemo, useState } from 'react';
import request, { unwrap } from '../../api/axios';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import { communityMediaUrl } from '../../components/CommunityMedia';
import { useConfirmDialog } from '../../context/ConfirmContext';
import { useAdminCommunityText } from '../../context/adminCommunityTranslations';

const emptyData = { groups: [], friendships: [], requests: [], posts: [], stories: [], blocks: [], conversations: [] };
const ADMIN_COMMUNITY_API = '/api/admin/community';
const COMMUNITY_REQUEST_TIMEOUT = 12000;
const api = {
  get: (path, ...args) => request.get(path, ...args),
  patch: (path, ...args) => request.patch(path, ...args),
  delete: (path, ...args) => request.delete(path, ...args),
};

function listValue(response) {
  const value = unwrap(response);
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

class CommunityErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Admin community page failed to render.', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return <section className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm dark:border-red-900/60 dark:bg-[#121f35]">
      <p className="text-xs font-black uppercase tracking-[.2em] text-red-500">Admin community</p>
      <h1 className="mt-2 text-2xl font-extrabold text-ink dark:text-white">This page could not be displayed.</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">Please reload the page. Your community data was not changed.</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white">Reload page</button>
    </section>;
  }
}

const personName = (person) => person?.fullName || person?.email || '';
const date = (value) => value ? new Date(value).toLocaleString() : '—';

function Pill({ children, tone = 'slate' }) {
  const tones = { slate: 'bg-slate-100 text-slate-600', green: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-700', blue: 'bg-sky-100 text-sky-700', red: 'bg-red-100 text-red-700' };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone] || tones.slate}`}>{children}</span>;
}

function Empty({ children }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{children}</div>;
}

function MediaPreview({ item, label }) {
  if (!item?.url) return null;
  const src = communityMediaUrl(item.url);
  return item.mediaType === 'VIDEO'
    ? <video src={src} controls playsInline preload="metadata" className="max-h-52 w-full rounded-xl bg-slate-900 object-contain" aria-label={label} />
    : <img src={src} alt={label} className="max-h-52 w-full rounded-xl bg-slate-100 object-cover dark:bg-slate-900" />;
}

function CommunityPage() {
  const { ask } = useConfirmDialog();
  const text = useAdminCommunityText();
  const [tab, setTab] = useState('groups');
  const [data, setData] = useState(emptyData);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [editingGroup, setEditingGroup] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const displayName = (person) => personName(person) || text.unknownAccount;
  const format = (template, values = {}) => Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, value), template);
  const visibilityLabel = (value) => value === 'PRIVATE' ? text.private : text.public;
  const statusLabel = (value) => value === 'PENDING' ? text.pending : value === 'ACCEPTED' ? text.accepted : value === 'DECLINED' ? text.declined : value;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const paths = ['groups', 'friendships', 'requests', 'posts', 'stories', 'blocks', 'conversations'];
      const results = await Promise.allSettled(paths.map((path) => api.get(`${ADMIN_COMMUNITY_API}/${path}`, { timeout: COMMUNITY_REQUEST_TIMEOUT })));
      const failed = results.filter((result) => result.status === 'rejected');
      const values = results.map((result) => result.status === 'fulfilled' ? listValue(result.value) : []);
      setData({
        groups: values[0],
        friendships: values[1],
        requests: values[2],
        posts: values[3],
        stories: values[4],
        blocks: values[5],
        conversations: values[6],
      });
      if (failed.length) setError(text.couldNotLoadCommunity);
    } catch (e) {
      setError(e.response?.data?.message || text.couldNotLoadCommunity);
      setData(emptyData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const action = async (key, callback, success = text.communityUpdated) => {
    setBusy(key); setError(''); setNotice('');
    try {
      await callback();
      setNotice(success);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || text.actionFailed);
    } finally {
      setBusy('');
    }
  };

  const remove = async (message, key, callback) => {
    if (await ask(message)) await action(key, callback, text.changeSaved);
  };

  const openConversation = async (conversation) => {
    setSelectedConversation(conversation); setMessages([]); setBusy(`conversation:${conversation.id}`); setError('');
    try {
      setMessages(unwrap(await api.get(`${ADMIN_COMMUNITY_API}/conversations/${conversation.id}/messages`)) || []);
    } catch (e) {
      setError(e.response?.data?.message || text.couldNotLoadMessages);
    } finally {
      setBusy('');
    }
  };

  const saveGroup = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await action(`group:${editingGroup.id}`, () => api.patch(`${ADMIN_COMMUNITY_API}/groups/${editingGroup.id}`, {
      name: form.get('name'), description: form.get('description'), visibility: form.get('visibility'),
    }), text.groupUpdated);
    setEditingGroup(null);
  };

  const counts = useMemo(() => data ? [
    [text.groups, data.groups.length],
    [text.posts, data.posts.length],
    [text.stories, data.stories.length],
    [text.chats, data.conversations.length],
    [text.friendships, data.friendships.length],
    [text.blocks, data.blocks.length],
  ] : [], [data, text]);

  const tabs = [
    ['groups', text.groups], ['posts', text.posts], ['stories', text.stories],
    ['friends', text.friendships], ['requests', text.friendRequests],
    ['chat', text.chatModeration], ['blocks', text.blocks],
  ];

  return <>
    <Header eyebrow={text.eyebrow} title={text.title} description={text.description} />
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {counts.map(([label, count]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-[#121f35]"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{label}</p><p className="mt-2 text-3xl font-extrabold text-ink dark:text-white">{count}</p></div>)}
    </div>
    <div className="mb-5 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100">{text.moderationNotice}</div>
    {loading && <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100" role="status">{text.loadingCommunity}</div>}
    {error && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200"><span>{error}</span><button type="button" onClick={load} className="rounded-lg bg-red-100 px-3 py-1.5 font-bold text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-100">{text.retry}</button></div>}
    {notice && <div className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</div>}
    <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-[#121f35]">
      {tabs.map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === value ? 'bg-navy text-white' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{label}</button>)}
    </div>

    {tab === 'groups' && <section className="space-y-4">{data.groups.length ? data.groups.map((group) => <article key={group.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#121f35]">
      {editingGroup?.id === group.id ? <form onSubmit={saveGroup} className="space-y-3"><div className="grid gap-3 md:grid-cols-2"><label className="text-sm font-semibold text-slate-600 dark:text-slate-300">{text.groupName}<input name="name" defaultValue={group.name} required maxLength="80" className="input mt-2" /></label><label className="text-sm font-semibold text-slate-600 dark:text-slate-300">{text.visibility}<select name="visibility" defaultValue={group.visibility} className="input mt-2"><option value="PUBLIC">{text.public}</option><option value="PRIVATE">{text.private}</option></select></label></div><label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">{text.descriptionLabel}<textarea name="description" defaultValue={group.description || ''} maxLength="2000" className="input mt-2 min-h-24" /></label><div className="flex flex-wrap gap-2"><button disabled={busy === `group:${group.id}`} className="rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{text.saveGroup}</button><button type="button" onClick={() => setEditingGroup(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">{text.cancel}</button></div></form> : <>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-extrabold text-ink dark:text-white">{group.name}</h2><Pill tone={group.visibility === 'PRIVATE' ? 'amber' : 'green'}>{visibilityLabel(group.visibility)}</Pill></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text.owner}: {displayName(group.owner)} · {group._count?.members || group.members?.length || 0} {text.members} · {group._count?.invites || 0} {text.invites}</p>{group.description && <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{group.description}</p>}</div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => setEditingGroup(group)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">{text.edit}</button><button type="button" onClick={() => remove(format(text.deleteGroupConfirm, { name: group.name }), `delete-group:${group.id}`, () => api.delete(`${ADMIN_COMMUNITY_API}/groups/${group.id}`))} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100">{text.delete}</button></div></div>
        <div className="mt-4 flex flex-wrap gap-2">{(group.members || []).map((member) => <span key={member.id} className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"><span>{displayName(member.user)}</span><select value={member.role} disabled={member.role === 'OWNER' || busy === `member-role:${member.id}`} onChange={(event) => action(`member-role:${member.id}`, () => api.patch(`${ADMIN_COMMUNITY_API}/groups/${group.id}/members/${member.userId}`, { role: event.target.value }), text.memberRoleUpdated)} className="rounded-lg border-0 bg-transparent py-0 text-[11px] font-bold text-slate-600 focus:ring-0 dark:text-slate-200"><option value="OWNER">{text.owner}</option><option value="ADMIN">{text.admin}</option><option value="MEMBER">{text.member}</option></select>{member.role !== 'OWNER' && <button type="button" aria-label={`${text.remove} ${displayName(member.user)}`} onClick={() => remove(format(text.removeMemberConfirm, { name: displayName(member.user), group: group.name }), `member:${member.id}`, () => api.delete(`${ADMIN_COMMUNITY_API}/groups/${group.id}/members/${member.userId}`))} className="font-black text-red-500">×</button>}</span>)}</div>
        {group.invites?.length > 0 && <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-700"><p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-slate-400">{text.recentInvitations}</p><div className="flex flex-wrap gap-2">{group.invites.map((invite) => <span key={invite.id} className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-100"><span>{displayName(invite.inviter)} → {displayName(invite.invitee)}</span><Pill tone={invite.status === 'PENDING' ? 'amber' : 'slate'}>{statusLabel(invite.status)}</Pill><button type="button" onClick={() => remove(text.removeInvitationConfirm, `invite:${invite.id}`, () => api.delete(`${ADMIN_COMMUNITY_API}/groups/${group.id}/invites/${invite.id}`))} className="font-black text-red-500">×</button></span>)}</div></div>}
      </>}
    </article>) : <Empty>{text.noGroups}</Empty>}</section>}

    {tab === 'posts' && <section className="grid gap-4 md:grid-cols-2">{data.posts.length ? data.posts.map((post) => <article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#121f35]"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-ink dark:text-white">{displayName(post.author)}</p><p className="mt-1 text-xs text-slate-400">{date(post.createdAt)} · {visibilityLabel(post.visibility)} · {post._count?.reactions || 0} {text.reactions}</p></div><button type="button" onClick={() => remove(text.removePostConfirm, `post:${post.id}`, () => api.delete(`${ADMIN_COMMUNITY_API}/posts/${post.id}`))} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100">{text.remove}</button></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{post.content}</p>{(post.media?.length || post.imageUrl) > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">{(post.media?.length ? post.media : [{ url: post.imageUrl, mediaType: post.mediaType }]).map((item, index) => <MediaPreview key={item.id || `${item.url}-${index}`} item={item} label={`${text.postMedia} ${index + 1}`} />)}</div>}</article>) : <Empty>{text.noPosts}</Empty>}</section>}

    {tab === 'stories' && <section className="grid gap-4 md:grid-cols-2">{data.stories.length ? data.stories.map((story) => <article key={story.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#121f35]"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-ink dark:text-white">{displayName(story.author)}</p><p className="mt-1 text-xs text-slate-400">{date(story.createdAt)} · {text.expires} {date(story.expiresAt)} · {visibilityLabel(story.visibility)}</p></div><button type="button" onClick={() => remove(text.removeStoryConfirm, `story:${story.id}`, () => api.delete(`${ADMIN_COMMUNITY_API}/stories/${story.id}`))} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100">{text.remove}</button></div>{story.content && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{story.content}</p>}{story.imageUrl && <div className="mt-4"><MediaPreview item={{ url: story.imageUrl, mediaType: story.mediaType }} label={text.storyMedia} /></div>}</article>) : <Empty>{text.noStories}</Empty>}</section>}

    {tab === 'friends' && <section className="space-y-3">{data.friendships.length ? data.friendships.map((friendship) => <article key={friendship.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-slate-700 dark:bg-[#121f35]"><div><p className="font-bold text-ink dark:text-white">{displayName(friendship.userA)} <span className="mx-2 text-slate-400">↔</span> {displayName(friendship.userB)}</p><p className="mt-1 text-xs text-slate-400">{text.created} {date(friendship.createdAt)}</p></div><button type="button" onClick={() => remove(text.removeFriendshipConfirm, `friendship:${friendship.id}`, () => api.delete(`${ADMIN_COMMUNITY_API}/friendships/${friendship.id}`))} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100">{text.removeFriendship}</button></article>) : <Empty>{text.noFriendships}</Empty>}</section>}

    {tab === 'requests' && <section className="space-y-3">{data.requests.length ? data.requests.map((requestItem) => <article key={requestItem.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-slate-700 dark:bg-[#121f35]"><div><p className="font-bold text-ink dark:text-white">{displayName(requestItem.sender)} <span className="mx-2 text-slate-400">→</span> {displayName(requestItem.receiver)}</p><p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400"><Pill tone={requestItem.status === 'PENDING' ? 'amber' : requestItem.status === 'ACCEPTED' ? 'green' : 'slate'}>{statusLabel(requestItem.status)}</Pill>{date(requestItem.updatedAt)}</p></div><button type="button" onClick={() => remove(text.removeRequestConfirm, `request:${requestItem.id}`, () => api.delete(`${ADMIN_COMMUNITY_API}/requests/${requestItem.id}`))} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100">{text.removeRequest}</button></article>) : <Empty>{text.noFriendRequests}</Empty>}</section>}

    {tab === 'chat' && <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"><div className="space-y-3">{data.conversations.length ? data.conversations.map((conversation) => { const title = conversation.group?.name || `${displayName(conversation.userA)} ↔ ${displayName(conversation.userB)}`; const last = conversation.messages?.[0]; return <div key={conversation.id} className={`rounded-2xl border p-4 text-left shadow-sm transition ${selectedConversation?.id === conversation.id ? 'border-sky-400 bg-sky-50 dark:border-sky-500 dark:bg-sky-950/30' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-[#121f35]'}`}><button type="button" onClick={() => openConversation(conversation)} className="block w-full text-left"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-ink dark:text-white">{title}</p><p className="mt-1 text-xs text-slate-400">{conversation._count?.messages || 0} {text.messages}</p></div><span className="text-xs text-slate-400">{date(conversation.updatedAt)}</span></div>{last && <p className="mt-3 truncate text-sm text-slate-500 dark:text-slate-300">{last.deletedAt ? text.messageRemoved : last.body || text.mediaMessage}</p>}</button><button type="button" onClick={() => remove(text.deleteConversationConfirm, `conversation:${conversation.id}`, async () => { await api.delete(`${ADMIN_COMMUNITY_API}/conversations/${conversation.id}`); setSelectedConversation(null); setMessages([]); })} className="mt-3 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-100">{text.deleteConversation}</button></div>; }) : <Empty>{text.noConversations}</Empty>}</div><div className="min-h-80 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#121f35]">{selectedConversation ? <><div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-700"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-coral">{text.chatModeration}</p><h2 className="mt-1 text-lg font-extrabold text-ink dark:text-white">{selectedConversation.group?.name || `${displayName(selectedConversation.userA)} ↔ ${displayName(selectedConversation.userB)}`}</h2></div><button type="button" onClick={() => setSelectedConversation(null)} className="text-slate-400 hover:text-slate-700" aria-label={text.closeConversation}>×</button></div>{busy === `conversation:${selectedConversation.id}` ? <Loading /> : messages.length ? <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-1">{messages.map((message) => <div key={message.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-700"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-slate-500 dark:text-slate-300">{displayName(message.sender)}</p><span className="text-[11px] text-slate-400">{date(message.createdAt)}</span></div>{message.body && <p className={`mt-2 whitespace-pre-wrap text-sm ${message.deletedAt ? 'italic text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{message.body}</p>}{message.imageUrl && <a href={communityMediaUrl(message.imageUrl)} target="_blank" rel="noreferrer" className="mt-2 block"><MediaPreview item={{ url: message.imageUrl, mediaType: message.mediaType }} label={text.messageAttachment} /></a>}{!message.deletedAt && <button type="button" onClick={() => remove(text.removeMessageConfirm, `message:${message.id}`, async () => { await api.delete(`${ADMIN_COMMUNITY_API}/messages/${message.id}`); setMessages((current) => current.map((item) => item.id === message.id ? { ...item, body: '[Message removed by administrator]', deletedAt: new Date().toISOString(), imageUrl: null } : item)); })} className="mt-3 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-100">{text.removeMessage}</button>}</div>)}</div> : <Empty>{text.noMessages}</Empty>}</> : <div className="flex min-h-64 items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">{text.selectConversation}</div>}</div></section>}

    {tab === 'blocks' && <section className="space-y-3">{data.blocks.length ? data.blocks.map((block) => <article key={block.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-slate-700 dark:bg-[#121f35]"><div><p className="font-bold text-ink dark:text-white">{displayName(block.blocker)} <span className="mx-2 text-slate-400">{text.blocked}</span> {displayName(block.blocked)}</p><p className="mt-1 text-xs text-slate-400">{text.created} {date(block.createdAt)}</p></div><button type="button" onClick={() => remove(text.removeBlockConfirm, `block:${block.id}`, () => api.delete(`${ADMIN_COMMUNITY_API}/blocks/${block.id}`))} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100">{text.removeBlock}</button></article>) : <Empty>{text.noBlocks}</Empty>}</section>}
  </>;
}

export default function Community() {
  return <CommunityErrorBoundary><CommunityPage /></CommunityErrorBoundary>;
}
