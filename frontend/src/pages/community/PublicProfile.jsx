import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { unwrap } from '../../api/axios';
import FriendRequestButton from '../../components/FriendRequestButton';
import PostComposer from '../../components/PostComposer';
import UserAvatar from '../../components/UserAvatar';
import { useAuth } from '../../hooks/useAuth';
import { roleHome } from '../../utils/roles';
import { useCommunityText } from '../../context/communityTranslations';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const MAX_COVER_SIZE = 50 * 1024 * 1024;
const mediaUrl = (path) => path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const text = useCommunityText();
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
  const [aboutEditing, setAboutEditing] = useState(false);
  const [aboutBusy, setAboutBusy] = useState(false);
  const [aboutForm, setAboutForm] = useState({ bio: '', location: '', website: '', school: '', course: '', yearLevel: '' });
  const coverInputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = unwrap(await api.get(`/api/users/${id}/profile`));
      setProfile(result);
      if (tab === 'Friends') setFriends(unwrap(await api.get(`/api/users/${id}/friends`)) || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.noVisiblePosts);
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
  const displayName = profile?.user?.fullName || `${profile?.user?.firstName || ''} ${profile?.user?.lastName || ''}`.trim();
  const role = profile?.user?.role;

  const beginAboutEdit = () => {
    setAboutForm({ bio: profileDetails.bio || '', location: profileDetails.location || '', website: profileDetails.website || '', school: profileDetails.school || '', course: profileDetails.course || '', yearLevel: profileDetails.yearLevel || '' });
    setAboutEditing(true);
    setNotice('');
  };

  const updateAboutField = (field, value) => setAboutForm((current) => ({ ...current, [field]: value }));

  const saveAbout = async (event) => {
    event.preventDefault();
    setAboutBusy(true);
    setNotice('');
    try {
      const updated = unwrap(await api.patch('/auth/profile', aboutForm));
      setProfile((current) => current ? { ...current, user: { ...current.user, ...updated, profile: updated.profile || current.user.profile } } : current);
      setAboutEditing(false);
      setNotice(text.aboutUpdated);
    } catch (requestError) {
      setNotice(requestError.response?.data?.message || text.aboutSaveFailed);
    } finally {
      setAboutBusy(false);
    }
  };

  const deleteAbout = async () => {
    if (!window.confirm(text.deleteAboutConfirm)) return;
    setAboutBusy(true);
    setNotice('');
    try {
      const cleared = { bio: '', location: '', website: '', school: '', course: '', yearLevel: '' };
      const updated = unwrap(await api.patch('/auth/profile', cleared));
      setProfile((current) => current ? { ...current, user: { ...current.user, ...updated, profile: updated.profile || current.user.profile } } : current);
      setAboutForm(cleared);
      setAboutEditing(false);
      setNotice(text.aboutDeleted);
    } catch (requestError) {
      setNotice(requestError.response?.data?.message || text.aboutSaveFailed);
    } finally {
      setAboutBusy(false);
    }
  };

  const handleRelationship = (nextStatus, nextRequestId, requestError) => {
    if (requestError) { setNotice(requestError.response?.data?.message || text.actionFailed); return; }
    setNotice('');
    setProfile((current) => {
      if (!current) return current;
      const wasFriend = current.friendshipStatus === 'FRIENDS';
      const isFriend = nextStatus === 'FRIENDS';
      return { ...current, friendshipStatus: nextStatus, friendRequestId: nextRequestId, friendCount: current.friendCount + (isFriend && !wasFriend ? 1 : !isFriend && wasFriend ? -1 : 0) };
    });
  };

  const addPost = (post) => { setProfile((current) => current ? { ...current, posts: [post, ...(current.posts || [])] } : current); setPostNotice(text.postPublished); };
  const updatePost = (post) => { setProfile((current) => current ? { ...current, posts: current.posts.map((item) => item.id === post.id ? post : item) } : current); setEditingPostId(null); setPostNotice(text.postUpdated); };

  const deletePost = async (postId) => {
    if (!window.confirm(text.deletePostConfirm)) return;
    setDeletingPostId(postId);
    setPostNotice('');
    try {
      await api.delete(`/api/posts/${postId}`);
      setProfile((current) => current ? { ...current, posts: current.posts.filter((item) => item.id !== postId) } : current);
      if (editingPostId === postId) setEditingPostId(null);
      setPostNotice(text.postDeleted);
    } catch (requestError) {
      setPostNotice(requestError.response?.data?.message || text.couldNotSavePost);
    } finally {
      setDeletingPostId(null);
    }
  };

  const uploadCover = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setNotice(text.onlyImages); return; }
    if (file.size > MAX_COVER_SIZE) { setNotice(text.imageLimit); return; }
    setCoverBusy(true);
    setNotice('');
    try {
      const form = new FormData();
      form.append('coverImage', file);
      await api.post('/auth/profile/cover', form);
      await load();
      setNotice(text.postUpdated);
    } catch (requestError) {
      setNotice(requestError.response?.data?.message || text.couldNotSavePost);
    } finally {
      setCoverBusy(false);
    }
  };

  if (loading && !profile) return <div className="community-loading-page"><div className="community-loading-orbit" /><p>{text.loadingCommunity}...</p></div>;
  if (error && !profile) return <div className="community-alert" role="alert">{error}</div>;
  if (!profile) return null;

  const tabs = [['Posts', text.posts], ['About', text.about], ['Friends', text.friends], ['Photos', text.noPhotos]];

  return <div className="community-page community-profile-page">
    <section className="community-profile-shell">
      <div className="community-profile-cover" style={profileDetails.coverImage ? { backgroundImage: `url(${mediaUrl(profileDetails.coverImage)})` } : undefined}>
        <div className="community-profile-cover-shade" />
        <div className="community-profile-cover-label"><span>{text.community}</span><small>{text.profile}</small></div>
        {isSelf && <><input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadCover} className="sr-only" /><button type="button" disabled={coverBusy} onClick={() => coverInputRef.current?.click()} className="community-cover-button">{coverBusy ? text.uploading : text.editCover}</button></>}
      </div>

      <div className="community-profile-identity">
        <div className="community-profile-heading">
          <UserAvatar person={profile.user} size="profile" className="community-profile-avatar" />
          <div className="community-profile-name-block"><p className="community-eyebrow">{role || text.communityMember}</p><h1>{displayName}</h1><p className="community-profile-subtitle">{profile.friendCount} {text.friends} <span>·</span> {profileDetails.location || text.community}</p><p className="community-profile-bio">{profileDetails.bio || text.memberBio}</p></div>
        </div>
        <div className="community-profile-actions">{isSelf ? <><Link to={roleHome(role)} className="community-button community-button-primary">{text.dashboard}</Link><FriendRequestButton userId={id} status="SELF" ownProfilePath={`/${role.toLowerCase()}/profile`} /></> : <FriendRequestButton userId={id} status={profile.friendshipStatus} requestId={profile.friendRequestId} ownProfilePath={`/${role.toLowerCase()}/profile`} onChange={handleRelationship} onMessage={() => profile.friendshipStatus === 'FRIENDS' ? navigate('/chat', { state: { userId: id } }) : setNotice(text.acceptBeforeChat)} />}</div>
      </div>
      {(notice || postNotice) && <p className="community-profile-notice">{notice || postNotice}</p>}
      <nav className="community-profile-tabs" aria-label={text.profile}>{tabs.map(([value, label]) => <button type="button" key={value} onClick={() => setTab(value)} className={tab === value ? 'is-active' : ''}>{label}{value === 'Friends' && <span>{profile.friendCount}</span>}</button>)}</nav>
    </section>

    <div className="community-profile-layout">
      <aside className="community-profile-side">
        <section className="community-profile-info-card"><p className="community-eyebrow">{text.aboutThisProfile}</p><h2>{displayName}</h2><p>{profileDetails.bio || text.memberBio}</p><div className="community-profile-facts">{profileDetails.location && <span><strong>{text.location}</strong>{profileDetails.location}</span>}{profileDetails.school && <span><strong>{text.school}</strong>{profileDetails.school}</span>}{profileDetails.course && <span><strong>{text.course}</strong>{profileDetails.course}</span>}{profileDetails.website && <span><strong>{text.website}</strong>{profileDetails.website}</span>}</div></section>
        <section className="community-profile-info-card community-profile-mini-stat"><span className="community-side-icon">+</span><strong>{profile.friendCount}</strong><p>{text.peopleInCircle}</p><button type="button" onClick={() => setTab('Friends')} className="community-text-link">{text.viewFriends} <span aria-hidden="true">→</span></button></section>
      </aside>

      <main className="community-profile-main">
        {tab === 'Posts' && <div className="community-profile-feed">{isSelf && <PostComposer onCreated={addPost} />}{postNotice && !notice && <p className="community-profile-notice">{postNotice}</p>}{profile.posts?.length ? profile.posts.map((post) => editingPostId === post.id ? <PostComposer key={post.id} post={post} onUpdated={updatePost} onCancel={() => setEditingPostId(null)} /> : <PostCard key={post.id} post={post} mediaUrl={mediaUrl} isOwner={isSelf} deleting={deletingPostId === post.id} onEdit={() => { setPostNotice(''); setEditingPostId(post.id); }} onDelete={() => deletePost(post.id)} />) : <EmptyState title={text.noPosts} description={isSelf ? text.shareFirstUpdate : text.noVisiblePosts} />}</div>}
        {tab === 'About' && <About profile={profile} details={profileDetails} isSelf={isSelf} editing={aboutEditing} form={aboutForm} busy={aboutBusy} onEdit={beginAboutEdit} onChange={updateAboutField} onSave={saveAbout} onDelete={deleteAbout} onCancel={() => setAboutEditing(false)} />}
        {tab === 'Friends' && <div className="community-profile-friends-grid">{friends.length ? friends.map((friend) => <PersonCard key={friend.id} person={friend} />) : <EmptyState title={text.noFriends} description={text.acceptedFriendsAppear} />}</div>}
        {tab === 'Photos' && <EmptyState title={text.noPhotos} description={text.photosAppear} />}
      </main>
    </div>
  </div>;
}

function PostCard({ post, isOwner, deleting, onEdit, onDelete, mediaUrl }) {
  const text = useCommunityText();
  const visibility = { PUBLIC: text.public, FRIENDS_ONLY: text.friendsOnly, PRIVATE: text.onlyMe };
  return <article className="community-post-card"><div className="community-post-header"><div className="community-post-author"><span className="community-post-avatar">{post.author?.fullName?.charAt(0)?.toUpperCase() || '+'}</span><div><p>{post.author?.fullName || text.communityMember}</p><small>{new Date(post.createdAt).toLocaleString()} <span>·</span> {visibility[post.visibility]}</small></div></div>{isOwner ? <div className="community-post-actions"><button type="button" onClick={onEdit} disabled={deleting}>{text.edit}</button><button type="button" onClick={onDelete} disabled={deleting} className="is-danger">{deleting ? text.deleting : text.delete}</button></div> : <span className="community-post-more">...</span>}</div><p className="community-post-content">{post.content}</p>{post.imageUrl && <img src={mediaUrl(post.imageUrl)} alt={text.postImageAlt} className="community-post-image" />}</article>;
}

function About({ profile, details, isSelf, editing, form, busy, onEdit, onChange, onSave, onDelete, onCancel }) {
  const text = useCommunityText();
  const fields = [[text.username, details.username], [text.email, profile.user.email], [text.phone, details.phone || profile.user.phone], [text.location, details.location], [text.school, details.school], [text.course, details.course], [text.yearLevel, details.yearLevel], [text.website, details.website]].filter(([, value]) => value);
  return <section className="community-about-card"><div className="community-section-heading"><div><span className="community-section-marker community-section-marker-blue" /><h2>{text.about}</h2></div>{isSelf && !editing && <button type="button" onClick={onEdit} className="community-button community-button-ghost community-button-small">{text.editAbout}</button>}</div>{editing ? <form className="community-about-editor" onSubmit={onSave}><label>{text.bio}<textarea value={form.bio} onChange={(event) => onChange('bio', event.target.value)} rows="4" maxLength="1000" placeholder={text.bioPlaceholder} /></label><div className="community-about-editor-grid"><label>{text.location}<input value={form.location} onChange={(event) => onChange('location', event.target.value)} maxLength="120" /></label><label>{text.website}<input value={form.website} onChange={(event) => onChange('website', event.target.value)} maxLength="180" /></label><label>{text.school}<input value={form.school} onChange={(event) => onChange('school', event.target.value)} maxLength="160" /></label><label>{text.course}<input value={form.course} onChange={(event) => onChange('course', event.target.value)} maxLength="160" /></label><label>{text.yearLevel}<input value={form.yearLevel} onChange={(event) => onChange('yearLevel', event.target.value)} maxLength="80" /></label></div><div className="community-about-editor-actions"><button type="submit" disabled={busy} className="community-button community-button-primary">{busy ? text.updating : text.saveAbout}</button><button type="button" disabled={busy} onClick={onCancel} className="community-button community-button-ghost">{text.cancelAbout}</button><button type="button" disabled={busy} onClick={onDelete} className="community-button community-button-danger">{text.deleteAbout}</button></div></form> : <><div className="community-about-grid">{fields.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>{details.bio && <p className="community-about-bio">{details.bio}</p>}{isSelf && !fields.length && !details.bio && <div className="community-about-empty"><p>{text.memberBio}</p><button type="button" onClick={onEdit} className="community-text-link">{text.editAbout} →</button></div>}</>}</section>;
}

function PersonCard({ person }) {
  return <Link to={`/profile/${person.id}`} className="community-profile-person-card"><UserAvatar person={person} size="md" /><div><p>{person.fullName}</p><span>{person.role}</span></div><span aria-hidden="true">→</span></Link>;
}

function EmptyState({ title, description }) {
  return <div className="community-empty community-empty-large"><span className="community-empty-mark">◊</span><p className="community-empty-title">{title}</p><p>{description}</p></div>;
}
