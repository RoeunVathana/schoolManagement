import { useEffect, useState } from 'react';
import api, { unwrap } from '../api/axios';
import { useCommunityText } from '../context/communityTranslations';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const MAX_IMAGE_SIZE = 150 * 1024 * 1024;
export default function PostComposer({ post, onCreated, onUpdated, onCancel }) {
  const isEditing = Boolean(post?.id);
  const text = useCommunityText();
  const [content, setContent] = useState(post?.content || '');
  const [visibility, setVisibility] = useState(post?.visibility || 'FRIENDS_ONLY');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setContent(post?.content || '');
    setVisibility(post?.visibility || 'FRIENDS_ONLY');
    setImageFile(null);
    setError('');
  }, [post?.id]);

  useEffect(() => {
    const preview = imageFile ? URL.createObjectURL(imageFile) : post?.imageUrl ? (post.imageUrl.startsWith('http') ? post.imageUrl : `${API_ORIGIN}${post.imageUrl}`) : '';
    setImagePreview(preview);
    return () => { if (imageFile && preview.startsWith('blob:')) URL.revokeObjectURL(preview); };
  }, [imageFile, post?.imageUrl]);

  const selectImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setImageFile(null); setError(text.onlyImages); return; }
    if (file.size > MAX_IMAGE_SIZE) { setImageFile(null); setError(text.imageLimit); return; }
    setError('');
    setImageFile(file);
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
      if (imageFile) payload.append('image', imageFile);
      const savedPost = unwrap(isEditing ? await api.patch(`/api/posts/${post.id}`, payload) : await api.post('/api/posts', payload));
      if (isEditing) onUpdated?.(savedPost);
      else { setContent(''); setVisibility('FRIENDS_ONLY'); setImageFile(null); onCreated?.(savedPost); }
    } catch (requestError) {
      setError(requestError.response?.data?.message || (isEditing ? text.couldNotSavePost : text.couldNotPublishPost));
    } finally {
      setBusy(false);
    }
  };

  return <form onSubmit={submit} className="community-composer">
    <div className="community-composer-heading"><div><p className="community-eyebrow">{isEditing ? text.editPost : text.createSomething}</p><h2>{isEditing ? text.updatePost : text.whatMind}</h2><p>{isEditing ? text.chooseWho : text.shareIdea}</p></div>{isEditing && <button type="button" onClick={onCancel} className="community-button community-button-ghost">{text.cancel}</button>}</div>
    <div className="community-composer-input-row"><div className="community-composer-avatar">+</div><textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={5000} rows={4} className="input community-composer-textarea" placeholder={text.shareCommunity} /></div>
    <div className="community-composer-tools">
      <label className="community-composer-tool"><span className="community-tool-icon">+</span><span>{text.addImage}</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={selectImage} className="sr-only" /></label>
      <span className="community-composer-note">Images only · maximum 150 MB</span>
      {imageFile && <button type="button" onClick={() => setImageFile(null)} className="community-remove-media">{text.removeImage}</button>}
    </div>
    {imagePreview && <div className="community-media-preview"><img src={imagePreview} alt="Post preview" />{imageFile && <p>{imageFile.name} · {(imageFile.size / (1024 * 1024)).toFixed(1)} MB</p>}</div>}
    <div className="community-composer-footer"><label className="community-visibility-field"><span>{text.whoSeePost}</span><select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="PUBLIC">{text.public}</option><option value="FRIENDS_ONLY">{text.friendsOnly}</option><option value="PRIVATE">{text.onlyMe}</option></select><small>{visibility === 'PUBLIC' ? text.publicHelp : visibility === 'FRIENDS_ONLY' ? text.friendsHelp : text.privateHelp}</small></label><button type="submit" disabled={busy || !content.trim()} className="community-button community-button-primary">{busy ? (isEditing ? text.saving : text.publish) : (isEditing ? text.saveChanges : text.publishPost)}</button></div>
    {error && <p className="community-alert community-alert-inline">{error}</p>}
  </form>;
}
