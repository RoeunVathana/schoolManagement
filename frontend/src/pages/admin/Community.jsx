import { useEffect, useMemo, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import { useConfirmDialog } from '../../context/ConfirmContext';

const emptyData = { groups: [], friendships: [], requests: [], conversations: [] };

const personName = (person) => person?.fullName || person?.email || 'Unknown account';

function Pill({ children, tone = 'slate' }) {
  const tones = { slate: 'bg-slate-100 text-slate-600', green: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-700', blue: 'bg-sky-100 text-sky-700' };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone] || tones.slate}`}>{children}</span>;
}

function Empty({ children }) { return <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{children}</div>; }

export default function Community() {
  const { ask } = useConfirmDialog();
  const [tab, setTab] = useState('groups');
  const [data, setData] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [editingGroup, setEditingGroup] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setError('');
    try {
      const [groups, friendships, requests, conversations] = await Promise.all([
        api.get('/admin/community/groups'),
        api.get('/admin/community/friendships'),
        api.get('/admin/community/requests'),
        api.get('/admin/community/conversations'),
      ]);
      setData({ groups: unwrap(groups) || [], friendships: unwrap(friendships) || [], requests: unwrap(requests) || [], conversations: unwrap(conversations) || [] });
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load community data.');
      setData(emptyData);
    }
  };

  useEffect(() => { load(); }, []);

  const action = async (key, callback, success = 'Community data updated.') => {
    setBusy(key); setError(''); setNotice('');
    try { await callback(); setNotice(success); await load(); } catch (e) { setError(e.response?.data?.message || 'The action could not be completed.'); } finally { setBusy(''); }
  };

  const remove = async (message, key, callback) => { if (await ask(message)) await action(key, callback, 'Change saved.'); };

  const openConversation = async (conversation) => {
    setSelectedConversation(conversation); setMessages([]); setBusy(`conversation:${conversation.id}`); setError('');
    try { setMessages(unwrap(await api.get(`/admin/community/conversations/${conversation.id}/messages`)) || []); } catch (e) { setError(e.response?.data?.message || 'Could not load messages.'); } finally { setBusy(''); }
  };

  const saveGroup = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await action(`group:${editingGroup.id}`, () => api.patch(`/admin/community/groups/${editingGroup.id}`, { name: form.get('name'), description: form.get('description'), visibility: form.get('visibility') }), 'Group updated.');
    setEditingGroup(null);
  };

  const counts = useMemo(() => data ? [
    ['Groups', data.groups.length, 'groups'],
    ['Friendships', data.friendships.length, 'friends'],
    ['Requests', data.requests.length, 'requests'],
    ['Conversations', data.conversations.length, 'chat'],
  ] : [], [data]);

  if (!data) return <Loading />;

  return <>
    <Header eyebrow="Administration" title="Community moderation" description="Manage groups, friendships, requests and chat messages from one protected admin workspace." />
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{counts.map(([label, count]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-[#121f35]"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{label}</p><p className="mt-2 text-3xl font-extrabold text-ink dark:text-white">{count}</p></div>)}</div>
    {error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200">{error}</div>}
    {notice && <div className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</div>}
    <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-[#121f35]">{[['groups', 'Groups'], ['friends', 'Friendships'], ['requests', 'Friend requests'], ['chat', 'Chat moderation']].map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === value ? 'bg-navy text-white' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{label}</button>)}</div>

    {tab === 'groups' && <section className="space-y-4">{data.groups.length ? data.groups.map((group) => <article key={group.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#121f35]">
      {editingGroup?.id === group.id ? <form onSubmit={saveGroup} className="space-y-3"><div className="grid gap-3 md:grid-cols-2"><label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Group name<input name="name" defaultValue={group.name} required maxLength="80" className="input mt-2" /></label><label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Visibility<select name="visibility" defaultValue={group.visibility} className="input mt-2"><option value="PUBLIC">Public</option><option value="PRIVATE">Private</option></select></label></div><label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Description<textarea name="description" defaultValue={group.description || ''} maxLength="2000" className="input mt-2 min-h-24" /></label><div className="flex flex-wrap gap-2"><button disabled={busy === `group:${group.id}`} className="rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">Save group</button><button type="button" onClick={() => setEditingGroup(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button></div></form> : <><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-extrabold text-ink dark:text-white">{group.name}</h2><Pill tone={group.visibility === 'PRIVATE' ? 'amber' : 'green'}>{group.visibility}</Pill></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Owner: {personName(group.owner)} · {group._count?.members || group.members?.length || 0} members · {group._count?.invites || 0} invites</p>{group.description && <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{group.description}</p>}</div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => setEditingGroup(group)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">Edit</button><button type="button" onClick={() => remove(`Delete the group “${group.name}” and its group chat?`, `delete-group:${group.id}`, () => api.delete(`/admin/community/groups/${group.id}`))} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100">Delete</button></div></div><div className="mt-4 flex flex-wrap gap-2">{(group.members || []).map((member) => <span key={member.id} className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"><span>{personName(member.user)}</span><Pill tone={member.role === 'OWNER' ? 'blue' : 'slate'}>{member.role}</Pill>{member.role !== 'OWNER' && <button type="button" aria-label={`Remove ${personName(member.user)}`} onClick={() => remove(`Remove ${personName(member.user)} from ${group.name}?`, `member:${member.id}`, () => api.delete(`/admin/community/groups/${group.id}/members/${member.userId}`))} className="font-black text-red-500">×</button>}</span>)}</div></>}
    </article>) : <Empty>No groups found.</Empty>}</section>}

    {tab === 'friends' && <section className="space-y-3">{data.friendships.length ? data.friendships.map((friendship) => <article key={friendship.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-slate-700 dark:bg-[#121f35]"><div><p className="font-bold text-ink dark:text-white">{personName(friendship.userA)} <span className="mx-2 text-slate-400">↔</span> {personName(friendship.userB)}</p><p className="mt-1 text-xs text-slate-400">Created {new Date(friendship.createdAt).toLocaleString()}</p></div><button type="button" onClick={() => remove('Remove this friendship?', `friendship:${friendship.id}`, () => api.delete(`/admin/community/friendships/${friendship.id}`))} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100">Remove friendship</button></article>) : <Empty>No friendships found.</Empty>}</section>}

    {tab === 'requests' && <section className="space-y-3">{data.requests.length ? data.requests.map((request) => <article key={request.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-slate-700 dark:bg-[#121f35]"><div><p className="font-bold text-ink dark:text-white">{personName(request.sender)} <span className="mx-2 text-slate-400">→</span> {personName(request.receiver)}</p><p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400"><Pill tone={request.status === 'PENDING' ? 'amber' : request.status === 'ACCEPTED' ? 'green' : 'slate'}>{request.status}</Pill>{new Date(request.updatedAt).toLocaleString()}</p></div><button type="button" onClick={() => remove('Remove this friend request?', `request:${request.id}`, () => api.delete(`/admin/community/requests/${request.id}`))} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100">Remove request</button></article>) : <Empty>No friend requests found.</Empty>}</section>}

    {tab === 'chat' && <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"><div className="space-y-3">{data.conversations.length ? data.conversations.map((conversation) => { const title = conversation.group?.name || `${personName(conversation.userA)} ↔ ${personName(conversation.userB)}`; const last = conversation.messages?.[0]; return <button type="button" key={conversation.id} onClick={() => openConversation(conversation)} className={`block w-full rounded-2xl border p-4 text-left shadow-sm transition ${selectedConversation?.id === conversation.id ? 'border-sky-400 bg-sky-50 dark:border-sky-500 dark:bg-sky-950/30' : 'border-slate-200 bg-white hover:border-sky-300 dark:border-slate-700 dark:bg-[#121f35]'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-ink dark:text-white">{title}</p><p className="mt-1 text-xs text-slate-400">{conversation._count?.messages || 0} messages</p></div><span className="text-xs text-slate-400">{new Date(conversation.updatedAt).toLocaleDateString()}</span></div>{last && <p className="mt-3 truncate text-sm text-slate-500 dark:text-slate-300">{last.deletedAt ? 'Message removed' : last.body}</p>}</button>; }) : <Empty>No conversations found.</Empty>}</div><div className="min-h-80 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#121f35]">{selectedConversation ? <><div className="mb-4 border-b border-slate-100 pb-4 dark:border-slate-700"><p className="text-xs font-bold uppercase tracking-[.16em] text-coral">Chat moderation</p><h2 className="mt-1 text-lg font-extrabold text-ink dark:text-white">{selectedConversation.group?.name || `${personName(selectedConversation.userA)} ↔ ${personName(selectedConversation.userB)}`}</h2></div>{busy === `conversation:${selectedConversation.id}` ? <Loading /> : messages.length ? <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-1">{messages.map((message) => <div key={message.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-700"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-slate-500 dark:text-slate-300">{personName(message.sender)}</p><span className="text-[11px] text-slate-400">{new Date(message.createdAt).toLocaleString()}</span></div><p className={`mt-2 whitespace-pre-wrap text-sm ${message.deletedAt ? 'italic text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{message.body}</p>{!message.deletedAt && <button type="button" onClick={() => remove('Remove this message for everyone?', `message:${message.id}`, async () => { await api.delete(`/admin/community/messages/${message.id}`); setMessages((current) => current.map((item) => item.id === message.id ? { ...item, body: '[Message removed by administrator]', deletedAt: new Date().toISOString(), imageUrl: null } : item)); })} className="mt-3 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-100">Remove message</button>}</div>)}</div> : <Empty>No messages found.</Empty>}</> : <div className="flex min-h-64 items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">Select a conversation to review its messages.</div>}</div></section>}
  </>;
}
