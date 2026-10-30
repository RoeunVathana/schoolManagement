import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { unwrap } from '../../api/axios';
import FriendRequestButton from '../../components/FriendRequestButton';
import PostComposer from '../../components/PostComposer';
import { useAuth } from '../../hooks/useAuth';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const mediaUrl = (path) => path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;
const visibilityLabel = { PUBLIC: '🌎 Public', FRIENDS_ONLY: '👥 Friends', PRIVATE: '🔒 Only me' };

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [tab, setTab] = useState('Posts');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const result = unwrap(await api.get(`/api/users/${id}/profile`));
      setProfile(result);
      if (tab === 'Friends') setFriends(unwrap(await api.get(`/api/users/${id}/friends`)) || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load this profile.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { if (tab === 'Friends' && profile) api.get(`/api/users/${id}/friends`).then((response) => setFriends(unwrap(response) || [])).catch(() => undefined); }, [tab, id, profile]);

  const isSelf = user?.id === id;
  const profileDetails = profile?.user?.profile || {};
  const avatar = profileDetails.avatar || profile?.user?.profileImageUrl;
  const displayName = profile?.user?.fullName || `${profile?.user?.firstName || ''} ${profile?.user?.lastName || ''}`.trim();

  const handleRelationship = (nextStatus, nextRequestId, requestError) => {
    if (requestError) { setNotice(requestError.response?.data?.message || 'That action could not be completed.'); return; }
    setNotice('');
    setProfile((current) => {
      if (!current) return current;
      const wasFriend = current.friendshipStatus === 'FRIENDS';
      const isFriend = nextStatus === 'FRIENDS';
      return { ...current, friendshipStatus: nextStatus, friendRequestId: nextRequestId, friendCount: current.friendCount + (isFriend && !wasFriend ? 1 : !isFriend && wasFriend ? -1 : 0) };
    });
  };

  const addPost = (post) => setProfile((current) => current ? { ...current, posts: [post, ...(current.posts || [])] } : current);

  if (loading && !profile) return <div className="py-20 text-center text-sm font-semibold text-slate-500">Loading profile…</div>;
  if (error && !profile) return <div className="rounded-2xl bg-red-50 p-6 font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div>;
  if (!profile) return null;

  return <div className="mx-auto max-w-5xl space-y-6">
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className="relative h-40 bg-gradient-to-br from-[#10243f] via-[#1b6172] to-[#ef8b78] sm:h-56" style={profileDetails.coverImage ? { backgroundImage: `url(${mediaUrl(profileDetails.coverImage)})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}><div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" /></div>
      <div className="relative px-5 pb-5 sm:px-8"><div className="-mt-12 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between"><div className="flex min-w-0 items-end gap-4"><div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[1.6rem] border-4 border-white bg-navy text-3xl font-black text-mint shadow-xl dark:border-slate-900 sm:h-32 sm:w-32">{avatar ? <img src={mediaUrl(avatar)} alt={displayName} className="h-full w-full object-cover" /> : displayName?.charAt(0)?.toUpperCase()}</div><div className="min-w-0 pb-1"><h1 className="truncate text-2xl font-black text-ink dark:text-white sm:text-3xl">{displayName}</h1><p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{profileDetails.role || profile.user.role} · {profile.friendCount} Friends</p></div></div><FriendRequestButton userId={id} status={isSelf ? 'SELF' : profile.friendshipStatus} requestId={profile.friendRequestId} ownProfilePath={`/${profile.user.role.toLowerCase()}/profile`} onChange={handleRelationship} onMessage={() => profile.friendshipStatus === 'FRIENDS' ? navigate('/chat', { state: { userId: id } }) : setNotice('Accept the friend request before starting a chat.')} /></div>{notice && <p className="mt-4 rounded-xl bg-mint/40 px-4 py-3 text-sm font-semibold text-emerald-800 dark:text-mint">{notice}</p>}</div>
      <div className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 pt-2 dark:border-slate-700 sm:px-7">{['Posts', 'About', 'Friends', 'Photos'].map((item) => <button type="button" key={item} onClick={() => setTab(item)} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-bold transition ${tab === item ? 'border-coral text-coral' : 'border-transparent text-slate-500 hover:text-navy dark:text-slate-400 dark:hover:text-white'}`}>{item}</button>)}</div>
    </section>

    {tab === 'Posts' && <div className="mx-auto max-w-3xl space-y-5">{isSelf && <PostComposer onCreated={addPost} />}{profile.posts?.length ? profile.posts.map((post) => <PostCard key={post.id} post={post} mediaUrl={mediaUrl} />) : <EmptyState title="No posts yet" description={isSelf ? 'Share your first update with friends.' : 'This profile has not shared any visible posts.'} />}</div>}
    {tab === 'About' && <About profile={profile} details={profileDetails} />}
    {tab === 'Friends' && <div className="grid gap-4 sm:grid-cols-2">{friends.length ? friends.map((friend) => <PersonCard key={friend.id} person={friend} />) : <EmptyState title="No friends yet" description="Accepted friends will appear here." />}</div>}
    {tab === 'Photos' && <EmptyState title="No photos yet" description="Photos shared by this user will appear here." />}
  </div>;
}

function PostCard({ post }) { return <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80"><div className="flex items-center justify-between gap-3"><div><p className="font-bold text-ink dark:text-white">{post.author?.fullName || 'Community member'}</p><p className="mt-1 text-xs font-semibold text-slate-400">{new Date(post.createdAt).toLocaleString()} · {visibilityLabel[post.visibility]}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-full bg-mint/40 text-sm">✦</span></div><p className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-slate-700 dark:text-slate-200">{post.content}</p>{post.imageUrl && <img src={post.imageUrl} alt="Post" className="mt-4 max-h-[28rem] w-full rounded-2xl object-cover" />}</article>; }
function About({ profile, details }) { return <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/80"><h2 className="text-xl font-black text-ink dark:text-white">About</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{[['Username', details.username], ['Email', profile.user.email], ['Phone', details.phone || profile.user.phone], ['Location', details.location], ['School', details.school], ['Course', details.course], ['Year level', details.yearLevel], ['Website', details.website]].filter(([, value]) => value).map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70"><p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 font-semibold text-ink dark:text-white">{value}</p></div>)}</div>{details.bio && <p className="mt-5 rounded-xl bg-mint/20 p-4 text-sm leading-6 text-slate-700 dark:text-slate-200">{details.bio}</p>}</section>; }
function PersonCard({ person }) { const avatar = person.profile?.avatar || person.profileImageUrl; return <Link to={`/profile/${person.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-mint dark:border-slate-700 dark:bg-slate-900/80"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-navy font-bold text-mint">{avatar ? <img src={avatar.startsWith('http') ? avatar : `${API_ORIGIN}${avatar}`} alt={person.fullName} className="h-full w-full object-cover" /> : person.fullName?.charAt(0)?.toUpperCase()}</div><div className="min-w-0"><p className="truncate font-bold text-ink dark:text-white">{person.fullName}</p><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{person.role}</p></div></Link>; }
function EmptyState({ title, description }) { return <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-900/60"><p className="font-black text-ink dark:text-white">{title}</p><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p></div>; }
