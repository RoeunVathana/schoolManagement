import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import api, { unwrap } from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import UserAvatar from './UserAvatar';
import { useCommunityText } from '../context/communityTranslations';
import CommunityMedia from './CommunityMedia';

const MAX_MEDIA_SIZE = 250 * 1024 * 1024;
const visibilityOptions = [
  { value: 'PUBLIC', label: 'Public' },
  { value: 'FRIENDS_ONLY', label: 'Friends only' },
  { value: 'PRIVATE', label: 'Only me' },
];


export default function CommunityStories() {
  const { user } = useAuth();
  const text = useCommunityText();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);

  const load = useCallback(async () => {
    if (!['STUDENT', 'CUSTOMER'].includes(user?.role)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setStories(unwrap(await api.get('/api/stories')) || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.couldNotPublishStory);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const grouped = new Map();
    stories.forEach((story) => {
      const authorId = story.author?.id || story.authorId;
      if (!grouped.has(authorId)) grouped.set(authorId, { author: story.author, stories: [] });
      grouped.get(authorId).stories.push(story);
    });
    return [...grouped.values()];
  }, [stories]);

  if (!['STUDENT', 'CUSTOMER'].includes(user?.role)) return null;

  return <section className="community-stories-card">
    <div className="community-stories-heading">
        <div className="community-stories-title-wrap">
        <span className="community-stories-icon">+</span>
        <div><p className="community-eyebrow">{text.stories}</p><h2>{text.shareMoment}</h2><p>{text.shortUpdates}</p></div>
      </div>
      <button type="button" onClick={() => setComposerOpen(true)} className="community-button community-button-primary community-button-small">{text.createStory}</button>
    </div>

    {error && <p className="community-alert community-alert-inline">{error}</p>}
    {loading ? <div className="community-story-row">{[1, 2, 3, 4].map((item) => <div className="community-story-skeleton" key={item} />)}</div> : <div className="community-story-row">
      <button type="button" onClick={() => setComposerOpen(true)} className="community-story-tile community-story-create"><span className="community-story-create-icon">+</span><strong>{text.createStory}</strong><small>{text.shareImageThought}</small></button>
      {groups.map((group) => <StoryTile key={group.author?.id || group.stories[0]?.authorId} group={group} own={group.author?.id === user.id} onOpen={() => setActiveGroup(group)} />)}
      {!groups.length && <p className="community-story-empty">{text.noActiveStories}</p>}
    </div>}

    {composerOpen && <StoryComposer onClose={() => setComposerOpen(false)} onSaved={(story) => { setStories((current) => [...current, story]); setComposerOpen(false); }} />}
    {activeGroup && <StoryViewer group={activeGroup} viewerId={user.id} onClose={() => setActiveGroup(null)} onDeleted={() => { setActiveGroup(null); load(); }} />}
  </section>;
}

function StoryTile({ group, own, onOpen }) {
  const text = useCommunityText();
  const latest = group.stories[group.stories.length - 1];
  return <button type="button" onClick={onOpen} className="community-story-tile community-story-person">
    <div className="community-story-media">{latest.imageUrl ? <CommunityMedia url={latest.imageUrl} mediaType={latest.mediaType} alt="" /> : <div className="community-story-text">{latest.content || text.createStory}</div>}</div>
    <div className="community-story-shade" />
    <div className="community-story-ring"><UserAvatar person={group.author} size="sm" /></div>
    <span className="community-story-name">{own ? text.yourStory : group.author?.fullName || text.communityMember}</span>
    {group.stories.length > 1 && <span className="community-story-count">{group.stories.length}</span>}
  </button>;
}

function StoryComposer({ onClose, onSaved }) {
  const text = useCommunityText();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('FRIENDS_ONLY');
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!imageFile) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(imageFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const selectImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) { setError(text.onlyImages); return; }
    if (file.size > MAX_MEDIA_SIZE) { setError(text.imageLimit); return; }
    setError('');
    setImageFile(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!content.trim() && !imageFile) { setError(text.addStoryText); return; }
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      if (content.trim()) form.append('content', content.trim());
      form.append('visibility', visibility);
      if (imageFile) form.append('image', imageFile);
      onSaved(unwrap(await api.post('/api/stories', form)));
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.couldNotPublishStory);
    } finally {
      setBusy(false);
    }
  };

  return <Modal title={text.createStoryTitle} onClose={onClose}><form onSubmit={submit} className="community-modal-form">
    <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={500} rows={4} className="input resize-none" placeholder={text.shareQuickUpdate} />
    <label className="community-field-label">{text.whoSeeStory}<select value={visibility} onChange={(event) => setVisibility(event.target.value)} className="input mt-2">{visibilityOptions.map((option) => <option key={option.value} value={option.value}>{text[option.value === 'PUBLIC' ? 'public' : option.value === 'FRIENDS_ONLY' ? 'friendsOnly' : 'onlyMe']}</option>)}</select></label>
    <label className="community-upload-field"><span>Add image or video <small>PNG, JPG, WEBP, GIF, MP4, WEBM or MOV · max 250 MB</small></span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime,video/x-m4v" onChange={selectImage} className="sr-only" /></label>
    {preview && <div className="community-media-preview"><CommunityMedia url={preview} mediaType={imageFile?.type.startsWith('video/') ? 'VIDEO' : 'IMAGE'} alt="Story preview" /><p>{imageFile.name} · {(imageFile.size / (1024 * 1024)).toFixed(1)} MB</p></div>}
    {error && <p className="community-alert community-alert-inline">{error}</p>}
    <div className="community-modal-actions"><button type="button" onClick={onClose} className="community-button community-button-ghost">{text.cancel}</button><button type="submit" disabled={busy} className="community-button community-button-primary">{busy ? text.publishing : text.shareStory}</button></div>
  </form></Modal>;
}

function StoryViewer({ group, viewerId, onClose, onDeleted }) {
  const text = useCommunityText();
  const [index, setIndex] = useState(group.stories.length - 1);
  const [imageFailed, setImageFailed] = useState(false);
  const story = group.stories[index];
  const own = story.authorId === viewerId;

  useEffect(() => { setImageFailed(false); }, [story.id]);

  const remove = async () => {
    if (!window.confirm('Delete this story?')) return;
    try { await api.delete(`/api/stories/${story.id}`); onDeleted(); } catch (requestError) { window.alert(requestError.response?.data?.message || 'Could not delete this story.'); }
  };

  return <Modal title={group.author?.id === viewerId ? text.yourStory : `${group.author?.fullName || text.communityMember}'s story`} onClose={onClose} className="community-story-modal">
    <div className="community-story-viewer">
      <div className="community-story-progress">{group.stories.map((item, storyIndex) => <span className={storyIndex <= index ? 'is-active' : ''} key={item.id} />)}</div>
      {story.imageUrl && !imageFailed ? <CommunityMedia url={story.imageUrl} mediaType={story.mediaType} alt={text.postImageAlt || 'Story'} onError={() => setImageFailed(true)} /> : story.content ? <div className="community-story-viewer-text">{story.content}</div> : <div className="community-story-viewer-fallback"><span>✦</span><strong>{text.storyImageUnavailable || 'Story image unavailable'}</strong></div>}
      <div className="community-story-viewer-caption"><p>{story.visibility === 'PRIVATE' ? 'Only me' : story.visibility === 'FRIENDS_ONLY' ? 'Friends only' : 'Public'} · {new Date(story.createdAt).toLocaleString()}</p>{story.content && story.imageUrl && <strong>{story.content}</strong>}</div>
      {group.stories.length > 1 && <><button type="button" onClick={() => setIndex((current) => Math.max(0, current - 1))} disabled={index === 0} className="community-story-nav community-story-nav-left" aria-label="Previous story">←</button><button type="button" onClick={() => setIndex((current) => Math.min(group.stories.length - 1, current + 1))} disabled={index === group.stories.length - 1} className="community-story-nav community-story-nav-right" aria-label="Next story">→</button></>}
    </div>
    <div className="community-story-viewer-footer"><p>Story {index + 1} of {group.stories.length} · expires after 24 hours</p>{own && <button type="button" onClick={remove} className="community-button community-button-danger">Delete story</button>}</div>
  </Modal>;
}

function Modal({ title, onClose, children, className = '' }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  return createPortal(<div className={`community-modal-backdrop ${className ? `${className}-backdrop` : ''}`} role="dialog" aria-modal="true" aria-label={title}>
    <div className="community-modal"><div className="community-modal-heading"><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Close" className="community-modal-close">×</button></div>{children}</div>
  </div>, document.body);
}
