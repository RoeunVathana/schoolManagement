import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { unwrap } from '../../api/axios';
import FriendRequestButton from '../../components/FriendRequestButton';
import PostComposer from '../../components/PostComposer';
import { useAuth } from '../../hooks/useAuth';
import { roleHome } from '../../utils/roles';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const MAX_COVER_SIZE = 50 * 1024 * 1024;
const mediaUrl = (path) => path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;
const visibilityLabel = { PUBLIC: '🌎 Public', FRIENDS_ONLY: '👥 Friends only', PRIVATE: '🔒 Only me' };

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
  const [postNotice, setPostNotice] = useState('');
  const [editingPostId, setEditingPostId] = useState(null);
  const [deletingPostId, setDeletingPostId] = useState(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const coverInputRef = useRef(null);

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

  const addPost = (post) => { setProfile((current) => current ? { ...current, posts: [post, ...(current.posts || [])] } : current); setPostNotice('Post published successfully.'); };
  const updatePost = (post) => {
    setProfile((current) => current ? { ...current, posts: current.posts.map((item) => item.id === post.id ? post : item) } : current);
    setEditingPostId(null); setPostNotice('Post updated successfully.');
  };
  const deletePost = async (postId) => {
    if (!window.confirm('Delete this post? This action cannot be undone.')) return;
    setDeletingPostId(postId); setPostNotice('');
    try {
      await api.delete(`/api/posts/${postId}`);
      setProfile((current) => current ? { ...current, posts: current.posts.filter((item) => item.id !== postId) } : current);
      if (editingPostId === postId) setEditingPostId(null);
      setPostNotice('Post deleted.');
    } catch (requestError) { setPostNotice(requestError.response?.data?.message || 'Could not delete this post.'); }
    finally { setDeletingPostId(null); }
  };
  const uploadCover = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setNotice('Please choose an image for your cover photo.'); return; }
    if (file.size > MAX_COVER_SIZE) { setNotice('Cover images must be 50 MB or smaller.'); return; }
    setCoverBusy(true); setNotice('');
    try {
      const form = new FormData(); form.append('coverImage', file);
      await api.post('/auth/profile/cover', form);
      await load(); setNotice('Cover photo updated successfully.');
    } catch (requestError) { setNotice(requestError.response?.data?.message || 'Could not update the cover photo.'); }
    finally { setCoverBusy(false); }
  };

  if (loading && !profile) return <div className="py-20 text-center text-sm font-semibold text-slate-500">Loading profile…</div>;
  if (error && !profile) return <div className="rounded-2xl bg-red-50 p-6 font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div>;
  if (!profile) return null;

  const role = profile.user.role;
  return <div className="mx-auto max-w-6xl space-y-6">
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className="relative h-56 bg-gradient-to-br from-[#10243f] via-[#1b6172] to-[#ef8b78] sm:h-72 lg:h-80" style={profileDetails.coverImage ? { backgroundImage: `url(${mediaUrl(profileDetails.coverImage)})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}><div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-black/10" />{isSelf && <><input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadCover} className="sr-only" /><button type="button" disabled={coverBusy} onClick={() => coverInputRef.current?.click()} className="absolute bottom-4 right-4 rounded-xl bg-white px-3.5 py-2.5 text-xs font-black text-navy shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60">{coverBusy ? 'Uploading…' : '📷 Edit cover photo'}</button></>}</div>
      <div className="relative px-5 pb-5 sm:px-8"><div className="-mt-14 flex flex-col gap-5 sm:-mt-16 lg:-mt-20 lg:flex-row lg:items-end lg:justify-between"><div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end"><div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-navy text-3xl font-black text-mint shadow-xl ring-4 ring-blue-500/90 dark:border-slate-900 sm:h-36 sm:w-36">{avatar ? <img src={mediaUrl(avatar)} alt={displayName} className="h-full w-full object-cover" /> : displayName?.charAt(0)?.toUpperCase()}</div><div className="min-w-0 pb-1"><h1 className="truncate text-3xl font-black tracking-tight text-ink dark:text-white sm:text-4xl">{displayName}</h1><p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{profileDetails.role || role} · {profile.friendCount} friends</p><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{profileDetails.bio || `Learning with CampusFlow as a ${String(role || 'community member').toLowerCase()}.`}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-500 dark:text-slate-400"><span>◉ CampusFlow community</span>{profileDetails.location && <span>⌖ {profileDetails.location}</span>}{profileDetails.school && <span>◆ {profileDetails.school}</span>}</div></div></div><div className="flex flex-wrap items-center gap-2 lg:pb-1">{isSelf ? <><Link to={roleHome(role)} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700">▣ Dashboard</Link><FriendRequestButton userId={id} status="SELF" ownProfilePath={`/${role.toLowerCase()}/profile`} /></> : <FriendRequestButton userId={id} status={profile.friendshipStatus} requestId={profile.friendRequestId} ownProfilePath={`/${role.toLowerCase()}/profile`} onChange={handleRelationship} onMessage={() => profile.friendshipStatus === 'FRIENDS' ? navigate('/chat', { state: { userId: id } }) : setNotice('Accept the friend request before starting a chat.')} />}</div></div>{notice && <p className="mt-4 rounded-xl bg-mint/40 px-4 py-3 text-sm font-semibold text-emerald-800 dark:text-mint">{notice}</p>}</div>
      <div className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 pt-2 dark:border-slate-700 sm:px-7">{['Posts', 'About', 'Friends', 'Photos'].map((item) => <button type="button" key={item} onClick={() => setTab(item)} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-bold transition ${tab === item ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-navy dark:text-slate-400 dark:hover:text-white'}`}>{item}</button>)}<button type="button" onClick={() => setNotice('Use the tabs to browse this profile.')} className="ml-auto shrink-0 rounded-xl px-4 py-2 text-lg font-black text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">…</button></div>
    </section>

    {tab === 'Posts' && <div className="mx-auto max-w-3xl space-y-5">{isSelf && <PostComposer onCreated={addPost} />}{postNotice && <p className="rounded-xl bg-mint/40 px-4 py-3 text-sm font-semibold text-emerald-800 dark:text-mint">{postNotice}</p>}{profile.posts?.length ? profile.posts.map((post) => editingPostId === post.id ? <PostComposer key={post.id} post={post} onUpdated={updatePost} onCancel={() => setEditingPostId(null)} /> : <PostCard key={post.id} post={post} mediaUrl={mediaUrl} isOwner={isSelf} deleting={deletingPostId === post.id} onEdit={() => { setPostNotice(''); setEditingPostId(post.id); }} onDelete={() => deletePost(post.id)} />) : <EmptyState title="No posts yet" description={isSelf ? 'Share your first update with friends.' : 'This profile has not shared any visible posts.'} />}</div>}
    {tab === 'About' && <About profile={profile} details={profileDetails} />}
    {tab === 'Friends' && <div className="grid gap-4 sm:grid-cols-2">{friends.length ? friends.map((friend) => <PersonCard key={friend.id} person={friend} />) : <EmptyState title="No friends yet" description="Accepted friends will appear here." />}</div>}
    {tab === 'Photos' && <EmptyState title="No photos yet" description="Photos shared by this user will appear here." />}
  </div>;
}

function PostCard({ post, isOwner, deleting, onEdit, onDelete, mediaUrl }) { return <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-ink dark:text-white">{post.author?.fullName || 'Community member'}</p><p className="mt-1 text-xs font-semibold text-slate-400">{new Date(post.createdAt).toLocaleString()} · {visibilityLabel[post.visibility]}</p></div>{isOwner ? <div className="flex shrink-0 items-center gap-2"><button type="button" onClick={onEdit} disabled={deleting} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-navy transition hover:border-mint hover:bg-mint/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-white">Edit</button><button type="button" onClick={onDelete} disabled={deleting} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:text-red-300">{deleting ? 'Deleting…' : 'Delete'}</button></div> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mint/40 text-sm">✦</span>}</div><p className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-slate-700 dark:text-slate-200">{post.content}</p>{post.imageUrl && <img src={mediaUrl(post.imageUrl)} alt="Post" className="mt-4 max-h-[28rem] w-full rounded-2xl object-cover" />}</article>; }
function About({ profile, details }) { return <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/80"><h2 className="text-xl font-black text-ink dark:text-white">About</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{[['Username', details.username], ['Email', profile.user.email], ['Phone', details.phone || profile.user.phone], ['Location', details.location], ['School', details.school], ['Course', details.course], ['Year level', details.yearLevel], ['Website', details.website]].filter(([, value]) => value).map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70"><p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 font-semibold text-ink dark:text-white">{value}</p></div>)}</div>{details.bio && <p className="mt-5 rounded-xl bg-mint/20 p-4 text-sm leading-6 text-slate-700 dark:text-slate-200">{details.bio}</p>}</section>; }
function PersonCard({ person }) { const avatar = person.profile?.avatar || person.profileImageUrl; return <Link to={`/profile/${person.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-mint dark:border-slate-700 dark:bg-slate-900/80"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-navy font-bold text-mint">{avatar ? <img src={avatar.startsWith('http') ? avatar : `${API_ORIGIN}${avatar}`} alt={person.fullName} className="h-full w-full object-cover" /> : person.fullName?.charAt(0)?.toUpperCase()}</div><div className="min-w-0"><p className="truncate font-bold text-ink dark:text-white">{person.fullName}</p><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{person.role}</p></div></Link>; }
function EmptyState({ title, description }) { return <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-900/60"><p className="font-black text-ink dark:text-white">{title}</p><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p></div>; }
