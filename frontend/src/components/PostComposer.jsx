import { useEffect, useState } from 'react';
import api, { unwrap } from '../api/axios';
import { useCommunityText } from '../context/communityTranslations';
import CommunityMedia from './CommunityMedia';

const MAX_MEDIA_SIZE = 100 * 1024 * 1024;
const MAX_MEDIA_COUNT = 10;
const MEDIA_ACCEPT = 'image/*,video/mp4,video/webm,video/quicktime,video/x-m4v';

function mediaTypeFor(file) {
  return file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
}

function existingPostMedia(post) {
  if (post?.media?.length) return post.media;
  return post?.imageUrl ? [{ id: `${post.id || 'post'}-legacy`, url: post.imageUrl, mediaType: post.mediaType || 'IMAGE', sortOrder: 0 }] : [];
}

export default function PostComposer({ post, onCreated, onUpdated, onCancel }) {
  const isEditing = Boolean(post?.id);
  const text = useCommunityText();
  const [content, setContent] = useState(post?.content || '');
  const [visibility, setVisibility] = useState(post?.visibility || 'FRIENDS_ONLY');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setContent(post?.content || '');
    setVisibility(post?.visibility || 'FRIENDS_ONLY');
    setMediaFiles([]);
    setError('');
  }, [post?.id]);

  useEffect(() => {
    const previews = mediaFiles.map((file) => ({ file, url: URL.createObjectURL(file), mediaType: mediaTypeFor(file), name: file.name }));
    setMediaPreviews(previews);
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [mediaFiles]);

  const selectMedia = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    const invalid = files.find((file) => (!file.type.startsWith('image/') && !file.type.startsWith('video/')) || file.size > MAX_MEDIA_SIZE);
    if (invalid) {
      setError(invalid.size > MAX_MEDIA_SIZE ? (text.postMediaLimit || text.imageLimit) : text.onlyImages);
      return;
    }
    const nextFiles = [...mediaFiles, ...files].filter((file, index, all) => index === all.findIndex((candidate) => candidate.name === file.name && candidate.size === file.size && candidate.lastModified === file.lastModified));
    if (nextFiles.length > MAX_MEDIA_COUNT) {
      setError(`You can attach up to ${MAX_MEDIA_COUNT} images or videos per post.`);
      return;
    }
    setError('');
    setMediaFiles(nextFiles);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    setError('');
    try {
      const payload = new FormData();
      payload.append('content', content.trim());
      payload.append('visibility', visibility);
      mediaFiles.forEach((file) => payload.append('images', file));
      const savedPost = unwrap(isEditing ? await api.patch(`/api/posts/${post.id}`, payload) : await api.post('/api/posts', payload));
      if (isEditing) onUpdated?.(savedPost);
      else { setContent(''); setVisibility('FRIENDS_ONLY'); setMediaFiles([]); onCreated?.(savedPost); }
    } catch (requestError) {
      setError(requestError.response?.data?.message || (isEditing ? text.couldNotSavePost : text.couldNotPublishPost));
    } finally {
      setBusy(false);
    }
  };

  const previewItems = mediaFiles.length ? mediaPreviews : existingPostMedia(post);

  return <form onSubmit={submit} className="community-composer">
    <div className="community-composer-heading"><div><p className="community-eyebrow">{isEditing ? text.editPost : text.createSomething}</p><h2>{isEditing ? text.updatePost : text.whatMind}</h2><p>{isEditing ? text.chooseWho : text.shareIdea}</p></div>{isEditing && <button type="button" onClick={onCancel} className="community-button community-button-ghost">{text.cancel}</button>}</div>
    <div className="community-composer-input-row"><div className="community-composer-avatar">+</div><textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={5000} rows={4} className="input community-composer-textarea" placeholder={text.shareCommunity} /></div>
    <div className="community-composer-tools">
      <label className="community-composer-tool"><span className="community-tool-icon">+</span><span>{text.addImage}</span><input type="file" accept={MEDIA_ACCEPT} multiple onChange={selectMedia} className="sr-only" /></label>
      <span className="community-composer-note">Up to {MAX_MEDIA_COUNT} images or videos · maximum 100 MB each</span>
      {mediaFiles.length > 0 && <button type="button" onClick={() => setMediaFiles([])} className="community-remove-media">{text.removeImage}</button>}
    </div>
    {previewItems.length > 0 && <div className={`community-media-preview-grid ${previewItems.length === 1 ? 'is-single' : ''}`}>
      {previewItems.map((item, index) => <div className="community-media-preview" key={item.id || item.url || `${item.name}-${index}`}><CommunityMedia url={item.url} mediaType={item.mediaType} alt={`Post media ${index + 1}`} /><p>{item.name || `Media ${index + 1}`}{item.file ? ` · ${(item.file.size / (1024 * 1024)).toFixed(1)} MB` : ''}</p>{mediaFiles.length > 0 && <button type="button" onClick={() => setMediaFiles((current) => current.filter((_file, fileIndex) => fileIndex !== index))} className="community-media-preview-remove" aria-label={text.removeImage}>×</button>}</div>)}
    </div>}
    <div className="community-composer-footer"><label className="community-visibility-field"><span>{text.whoSeePost}</span><select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="PUBLIC">{text.public}</option><option value="FRIENDS_ONLY">{text.friendsOnly}</option><option value="PRIVATE">{text.onlyMe}</option></select><small>{visibility === 'PUBLIC' ? text.publicHelp : visibility === 'FRIENDS_ONLY' ? text.friendsHelp : text.privateHelp}</small></label><button type="submit" disabled={busy || !content.trim()} className="community-button community-button-primary">{busy ? (isEditing ? text.saving : text.publish) : (isEditing ? text.saveChanges : text.publishPost)}</button></div>
    {error && <p className="community-alert community-alert-inline">{error}</p>}
  </form>;
}
