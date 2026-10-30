import { useEffect, useState } from 'react';
import api, { unwrap } from '../api/axios';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const MAX_IMAGE_SIZE = 150 * 1024 * 1024;
const visibilityOptions = [
  { value: 'PUBLIC', label: '🌎 Public', help: 'Anyone in the community can see it.' },
  { value: 'FRIENDS_ONLY', label: '👥 Friends only', help: 'Only accepted friends can see it.' },
  { value: 'PRIVATE', label: '🔒 Only me', help: 'Only you can see it.' },
];

export default function PostComposer({ post, onCreated, onUpdated, onCancel }) {
  const isEditing = Boolean(post?.id);
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
    if (!file.type.startsWith('image/')) { setImageFile(null); setError('Only image files are allowed. Videos and documents cannot be posted.'); return; }
    if (file.size > MAX_IMAGE_SIZE) { setImageFile(null); setError('Images must be 150 MB or smaller.'); return; }
    setError(''); setImageFile(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!content.trim()) return;
    setBusy(true); setError('');
    try {
      const payload = new FormData();
      payload.append('content', content.trim());
      payload.append('visibility', visibility);
      if (imageFile) payload.append('image', imageFile);
      const savedPost = unwrap(isEditing ? await api.patch(`/api/posts/${post.id}`, payload) : await api.post('/api/posts', payload));
      if (isEditing) onUpdated?.(savedPost);
      else { setContent(''); setVisibility('FRIENDS_ONLY'); setImageFile(null); onCreated?.(savedPost); }
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Could not ${isEditing ? 'save' : 'publish'} your post.`);
    } finally { setBusy(false); }
  };

  const selectedOption = visibilityOptions.find((option) => option.value === visibility) || visibilityOptions[1];
  return <form onSubmit={submit} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 sm:p-5">
    <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-coral">{isEditing ? 'Edit post' : 'Community post'}</p><p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{isEditing ? 'Update your post and who can see it.' : 'Share an update with your community.'}</p></div>{isEditing && <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-100 hover:text-navy dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>}</div>
    <div className="flex items-start gap-3"><div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-mint to-sky-200 text-sm font-black text-navy">✦</div><textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={5000} rows={3} className="input min-h-24 resize-none" placeholder="Share something with your community…" /></div>
    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 dark:border-slate-700"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-navy transition hover:border-mint hover:bg-mint/20 dark:border-slate-600 dark:text-white"><span>🖼️ Add image</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={selectImage} className="sr-only" /></label><span className="text-xs font-semibold text-slate-400">Images only · maximum 150 MB · no video or documents</span>{imageFile && <button type="button" onClick={() => setImageFile(null)} className="text-xs font-black text-red-600 hover:underline dark:text-red-300">Remove selected image</button>}</div>
    {imagePreview && <div className="relative mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"><img src={imagePreview} alt="Post preview" className="max-h-64 w-full object-contain" />{imageFile && <p className="border-t border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-300">{imageFile.name} · {(imageFile.size / (1024 * 1024)).toFixed(1)} MB</p>}</div>}
    <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-slate-700 sm:flex-row sm:items-end sm:justify-between"><label className="min-w-0 flex-1 text-sm font-semibold text-slate-600 dark:text-slate-300"><span className="block">Who can see your post?</span><select value={visibility} onChange={(event) => setVisibility(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-navy outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-mint sm:w-auto"><option value="PUBLIC">🌎 Public</option><option value="FRIENDS_ONLY">👥 Friends only</option><option value="PRIVATE">🔒 Only me</option></select><span className="mt-1 block text-xs font-medium text-slate-400">{selectedOption.help}</span></label><button type="submit" disabled={busy || !content.trim()} className="rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#1b3b5d] disabled:cursor-not-allowed disabled:opacity-50">{busy ? (isEditing ? 'Saving…' : 'Publishing…') : (isEditing ? 'Save changes' : 'Publish post')}</button></div>
    {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
  </form>;
}
