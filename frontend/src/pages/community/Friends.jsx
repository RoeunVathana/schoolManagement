import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { unwrap } from '../../api/axios';
import FriendRequestButton from '../../components/FriendRequestButton';
import CommunityStories from '../../components/CommunityStories';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const avatarUrl = (person) => { const path = person?.profile?.avatar || person?.profileImageUrl; return path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`; };

export default function Friends() {
  const [data, setData] = useState({ incoming: [], outgoing: [], suggestions: [], friends: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [requests, suggestions, friends] = await Promise.all([api.get('/api/friends/requests'), api.get('/api/friends/suggestions'), api.get('/api/friends')]);
      setData({ ...unwrap(requests), suggestions: unwrap(suggestions) || [], friends: unwrap(friends) || [] });
    } catch (requestError) { setError(requestError.response?.data?.message || 'Could not load your friends.'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const person = (value) => value.user || value;
  const card = (value, status, requestId) => { const target = person(value); return <div key={value.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80"><Link to={`/profile/${target.id}`} className="flex min-w-0 items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-navy font-bold text-mint">{(target.profile?.avatar || target.profileImageUrl) ? <img src={avatarUrl(target)} alt={target.fullName} className="h-full w-full object-cover" /> : target.fullName?.charAt(0)?.toUpperCase()}</div><div className="min-w-0"><p className="truncate font-bold text-ink dark:text-white">{target.fullName}</p><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{target.role}</p></div></Link><FriendRequestButton userId={target.id} status={status} requestId={requestId} onChange={(_next, _requestId, requestError) => { if (requestError) setError(requestError.response?.data?.message || 'Action failed.'); else load(); }} onMessage={() => status === 'FRIENDS' ? navigate('/chat', { state: { userId: target.id } }) : setError('Accept the friend request before starting a chat.')} /></div>; };

  return <div className="mx-auto max-w-6xl space-y-7"><CommunityStories /><div><p className="text-xs font-black uppercase tracking-[.24em] text-coral">Community</p><h1 className="mt-2 text-3xl font-black tracking-tight text-ink dark:text-white sm:text-4xl">Friends</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Stay connected with people learning and growing with you.</p></div>{error && <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div>}{loading ? <div className="py-16 text-center text-sm font-semibold text-slate-500">Loading friends…</div> : <div className="grid gap-7 lg:grid-cols-3"><section className="space-y-3"><h2 className="text-lg font-black text-ink dark:text-white">Friend Requests <span className="text-coral">({data.incoming.length})</span></h2>{data.incoming.length ? data.incoming.map((request) => card(request, 'REQUEST_RECEIVED', request.id)) : <Empty text="No pending requests." />}</section><section className="space-y-3"><h2 className="text-lg font-black text-ink dark:text-white">People You May Know</h2>{data.suggestions.length ? data.suggestions.map((personValue) => card(personValue, 'NONE')) : <Empty text="No suggestions right now." />}</section><section className="space-y-3"><h2 className="text-lg font-black text-ink dark:text-white">Your Friends <span className="text-coral">({data.friends.length})</span></h2>{data.friends.length ? data.friends.map((friend) => card(friend, 'FRIENDS')) : <Empty text="Your accepted friends will appear here." />}</section></div>}</div>;
}

function Empty({ text }) { return <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">{text}</div>; }
