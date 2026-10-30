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
const visibilityLabel = { PUBLIC: 'Public', FRIENDS_ONLY: 'Friends only', PRIVATE: 'Only me' };

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
    setLoading(true);
    setError('');
    try {
      const result = unwrap(await api.get(`/api/users/${id}/profile`));
      setProfile(result);
      if (tab === 'Friends') setFriends(unwrap(await api.get(`/api/users/${id}/friends`)) || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load this profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    if (tab === 'Friends' && profile) api.get(`/api/users/${id}/friends`).then((response) => setFriends(unwrap(response) || [])).catch(() => undefined);
  }, [tab, id, profile]);

  const isSelf = user?.id === id;
  const profileDetails = profile?.user?.profile || {};
  const avatar = profileDetails.avatar || profile?.user?.profileImageUrl;
  const displayName = profile?.user?.fullName || `${profile?.user?.firstName || ''} ${profile?.user?.lastName || ''}`.trim();
  const role = profile?.user?.role;

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
  const updatePost = (post) => { setProfile((current) => current ? { ...current, posts: current.posts.map((item) => item.id === post.id ? post : item) } : current); setEditingPostId(null); setPostNotice('Post updated successfully.'); };

  const deletePost = async (postId) => {
    if (!window.confirm('Delete this post? This action cannot be undone.')) return;
    setDeletingPostId(postId);
    setPostNotice('');
    try {
      await api.delete(`/api/posts/${postId}`);
      setProfile((current) => current ? { ...current, posts: current.posts.filter((item) => item.id !== postId) } : current);
      if (editingPostId === postId) setEditingPostId(null);
      setPostNotice('Post deleted.');
    } catch (requestError) {
      setPostNotice(requestError.response?.data?.message || 'Could not delete this post.');
    } finally {
      setDeletingPostId(null);
    }
  };

  const uploadCover = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setNotice('Please choose an image for your cover photo.'); return; }
    if (file.size > MAX_COVER_SIZE) { setNotice('Cover images must be 50 MB or smaller.'); return; }
    setCoverBusy(true);
    setNotice('');
    try {
      const form = new FormData();
      form.append('coverImage', file);
      await api.post('/auth/profile/cover', form);
      await load();
      setNotice('Cover photo updated successfully.');
    } catch (requestError) {
      setNotice(requestError.response?.data?.message || 'Could not update the cover photo.');
    } finally {
      setCoverBusy(false);
    }
  };

  if (loading && !profile) return <div className="community-loading-page"><div className="community-loading-orbit" /><p>Loading profile...</p></div>;
  if (error && !profile) return <div className="community-alert" role="alert">{error}</div>;
  if (!profile) return null;

  return <div className="community-page community-profile-page">
    <section className="community-profile-shell">
      <div className="community-profile-cover" style={profileDetails.coverImage ? { backgroundImage: `url(${mediaUrl(profileDetails.coverImage)})` } : undefined}>
        <div className="community-profile-cover-shade" />
        <div className="community-profile-cover-label"><span>CampusFlow community</span><small>Profile</small></div>
        {isSelf && <><input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadCover} className="sr-only" /><button type="button" disabled={coverBusy} onClick={() => coverInputRef.current?.click()} className="community-cover-button">{coverBusy ? 'Uploading...' : 'Edit cover photo'}</button></>}
      </div>

      <div className="community-profile-identity">
        <div className="community-profile-heading">
          <div className="community-profile-avatar">{avatar ? <img src={mediaUrl(avatar)} alt={displayName} /> : displayName?.charAt(0)?.toUpperCase()}</div>
          <div className="community-profile-name-block"><p className="community-eyebrow">{role || 'Community member'}</p><h1>{displayName}</h1><p className="community-profile-subtitle">{profile.friendCount} friends <span>·</span> {profileDetails.location || 'CampusFlow learning community'}</p><p className="community-profile-bio">{profileDetails.bio || `Learning with CampusFlow as a ${String(role || 'community member').toLowerCase()}.`}</p></div>
        </div>
        <div className="community-profile-actions">{isSelf ? <><Link to={roleHome(role)} className="community-button community-button-primary">Dashboard</Link><FriendRequestButton userId={id} status="SELF" ownProfilePath={`/${role.toLowerCase()}/profile`} /></> : <FriendRequestButton userId={id} status={profile.friendshipStatus} requestId={profile.friendRequestId} ownProfilePath={`/${role.toLowerCase()}/profile`} onChange={handleRelationship} onMessage={() => profile.friendshipStatus === 'FRIENDS' ? navigate('/chat', { state: { userId: id } }) : setNotice('Accept the friend request before starting a chat.')} />}</div>
      </div>
      {(notice || postNotice) && <p className="community-profile-notice">{notice || postNotice}</p>}
      <nav className="community-profile-tabs" aria-label="Profile sections">{['Posts', 'About', 'Friends', 'Photos'].map((item) => <button type="button" key={item} onClick={() => setTab(item)} className={tab === item ? 'is-active' : ''}>{item}{item === 'Friends' && <span>{profile.friendCount}</span>}</button>)}</nav>
    </section>

    <div className="community-profile-layout">
      <aside className="community-profile-side">
        <section className="community-profile-info-card"><p className="community-eyebrow">About this profile</p><h2>{displayName}</h2><p>{profileDetails.bio || 'A member of the CampusFlow learning community.'}</p><div className="community-profile-facts">{profileDetails.location && <span><strong>Location</strong>{profileDetails.location}</span>}{profileDetails.school && <span><strong>School</strong>{profileDetails.school}</span>}{profileDetails.course && <span><strong>Course</strong>{profileDetails.course}</span>}{profileDetails.website && <span><strong>Website</strong>{profileDetails.website}</span>}</div></section>
        <section className="community-profile-info-card community-profile-mini-stat"><span className="community-side-icon">+</span><strong>{profile.friendCount}</strong><p>People in this circle</p><button type="button" onClick={() => setTab('Friends')} className="community-text-link">View friends <span aria-hidden="true">→</span></button></section>
      </aside>

      <main className="community-profile-main">
        {tab === 'Posts' && <div className="community-profile-feed">{isSelf && <PostComposer onCreated={addPost} />}{postNotice && !notice && <p className="community-profile-notice">{postNotice}</p>}{profile.posts?.length ? profile.posts.map((post) => editingPostId === post.id ? <PostComposer key={post.id} post={post} onUpdated={updatePost} onCancel={() => setEditingPostId(null)} /> : <PostCard key={post.id} post={post} mediaUrl={mediaUrl} isOwner={isSelf} deleting={deletingPostId === post.id} onEdit={() => { setPostNotice(''); setEditingPostId(post.id); }} onDelete={() => deletePost(post.id)} />) : <EmptyState title="No posts yet" description={isSelf ? 'Share your first update with friends.' : 'This profile has not shared any visible posts.'} />}</div>}
        {tab === 'About' && <About profile={profile} details={profileDetails} />}
        {tab === 'Friends' && <div className="community-profile-friends-grid">{friends.length ? friends.map((friend) => <PersonCard key={friend.id} person={friend} />) : <EmptyState title="No friends yet" description="Accepted friends will appear here." />}</div>}
        {tab === 'Photos' && <EmptyState title="No photos yet" description="Photos shared by this user will appear here." />}
      </main>
    </div>
  </div>;
}

function PostCard({ post, isOwner, deleting, onEdit, onDelete, mediaUrl }) {
  return <article className="community-post-card"><div className="community-post-header"><div className="community-post-author"><span className="community-post-avatar">{post.author?.fullName?.charAt(0)?.toUpperCase() || '+'}</span><div><p>{post.author?.fullName || 'Community member'}</p><small>{new Date(post.createdAt).toLocaleString()} <span>·</span> {visibilityLabel[post.visibility]}</small></div></div>{isOwner ? <div className="community-post-actions"><button type="button" onClick={onEdit} disabled={deleting}>Edit</button><button type="button" onClick={onDelete} disabled={deleting} className="is-danger">{deleting ? 'Deleting...' : 'Delete'}</button></div> : <span className="community-post-more">...</span>}</div><p className="community-post-content">{post.content}</p>{post.imageUrl && <img src={mediaUrl(post.imageUrl)} alt="Post" className="community-post-image" />}</article>;
}

function About({ profile, details }) {
  const fields = [['Username', details.username], ['Email', profile.user.email], ['Phone', details.phone || profile.user.phone], ['Location', details.location], ['School', details.school], ['Course', details.course], ['Year level', details.yearLevel], ['Website', details.website]].filter(([, value]) => value);
  return <section className="community-about-card"><div className="community-section-heading"><div><span className="community-section-marker community-section-marker-blue" /><h2>About</h2></div></div><div className="community-about-grid">{fields.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>{details.bio && <p className="community-about-bio">{details.bio}</p>}</section>;
}

function PersonCard({ person }) {
  const avatar = person.profile?.avatar || person.profileImageUrl;
  return <Link to={`/profile/${person.id}`} className="community-profile-person-card"><div className="community-avatar community-avatar-md">{avatar ? <img src={avatar.startsWith('http') ? avatar : `${API_ORIGIN}${avatar}`} alt={person.fullName} /> : person.fullName?.charAt(0)?.toUpperCase()}</div><div><p>{person.fullName}</p><span>{person.role}</span></div><span aria-hidden="true">→</span></Link>;
}

function EmptyState({ title, description }) {
  return <div className="community-empty community-empty-large"><span className="community-empty-mark">○</span><p className="community-empty-title">{title}</p><p>{description}</p></div>;
}
