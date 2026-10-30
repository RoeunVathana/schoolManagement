import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { unwrap } from '../api/axios';
import { useAuth } from '../hooks/useAuth';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const MAX_IMAGE_SIZE = 150 * 1024 * 1024;
const visibilityOptions = [
  { value: 'PUBLIC', label: '🌎 Public' },
  { value: 'FRIENDS_ONLY', label: '👥 Friends only' },
  { value: 'PRIVATE', label: '🔒 Only me (Private)' },
];

const mediaUrl = (path) => path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;
const initials = (name) => name?.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';

export default function CommunityStories() {
  const { user } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);

  const load = useCallback(async () => {
    if (!['STUDENT', 'CUSTOMER'].includes(user?.role)) { setLoading(false); return; }
    setLoading(true); setError('');
    try { setStories(unwrap(await api.get('/api/stories')) || []); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Could not load stories.'); }
    finally { setLoading(false); }
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
  return <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 sm:p-5">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.2em] text-coral">Community stories</p><h2 className="mt-1 text-xl font-black text-ink dark:text-white">Share a moment</h2><p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Stories disappear after 24 hours.</p></div><button type="button" onClick={() => setComposerOpen(true)} className="rounded-xl bg-navy px-3 py-2 text-xs font-black text-white transition hover:bg-[#1b3b5d]">+ Create story</button></div>
    {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
    {loading ? <div className="mt-4 flex gap-3 overflow-hidden"><div className="h-36 w-24 shrink-0 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" /><div className="h-36 w-24 shrink-0 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" /><div className="h-36 w-24 shrink-0 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" /></div> : <div className="mt-4 flex gap-3 overflow-x-auto pb-1">{<button type="button" onClick={() => setComposerOpen(true)} className="group relative h-36 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-100 to-white text-left dark:border-slate-700 dark:from-slate-800 dark:to-slate-900"><div className="flex h-24 items-center justify-center bg-gradient-to-br from-[#1b6172] to-[#8de4ca] text-4xl text-white">+</div><div className="px-2 py-2 text-center text-xs font-black text-ink dark:text-white">Create story</div></button>}{groups.map((group) => <StoryTile key={group.author?.id || group.stories[0]?.authorId} group={group} own={group.author?.id === user.id} onOpen={() => setActiveGroup(group)} />)}{!groups.length && <p className="self-center px-2 text-sm font-semibold text-slate-500 dark:text-slate-400">No active stories yet. Be the first to share one.</p>}</div>}
    {composerOpen && <StoryComposer onClose={() => setComposerOpen(false)} onSaved={(story) => { setStories((current) => [...current, story]); setComposerOpen(false); }} />}
    {activeGroup && <StoryViewer group={activeGroup} viewerId={user.id} onClose={() => setActiveGroup(null)} onDeleted={() => { setActiveGroup(null); load(); }} />}
  </section>;
}

function StoryTile({ group, own, onOpen }) {
  const latest = group.stories[group.stories.length - 1];
  const avatar = group.author?.profile?.avatar || group.author?.profileImageUrl;
  return <button type="button" onClick={onOpen} className="group relative h-36 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-[#10243f] via-[#1b6172] to-[#ef8b78] text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700"><div className="absolute inset-0">{latest.imageUrl ? <img src={mediaUrl(latest.imageUrl)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center p-2 text-center text-sm font-bold leading-5 text-white">{latest.content || 'New story'}</div>}</div><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/10" /><div className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-sky-400 bg-navy text-[10px] font-black text-mint shadow-lg">{avatar ? <img src={mediaUrl(avatar)} alt="" className="h-full w-full object-cover" /> : initials(group.author?.fullName)}</div><span className="absolute inset-x-2 bottom-2 line-clamp-2 text-xs font-black leading-4 text-white">{own ? 'Your story' : group.author?.fullName || 'Community member'}</span></button>;
}

function StoryComposer({ onClose, onSaved }) {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('FRIENDS_ONLY');
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!imageFile) { setPreview(''); return undefined; } const url = URL.createObjectURL(imageFile); setPreview(url); return () => URL.revokeObjectURL(url); }, [imageFile]);
  const selectImage = (event) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (!file.type.startsWith('image/')) { setError('Only image files are allowed. Videos and documents cannot be posted.'); return; } if (file.size > MAX_IMAGE_SIZE) { setError('Images must be 150 MB or smaller.'); return; } setError(''); setImageFile(file); };
  const submit = async (event) => {
    event.preventDefault();
    if (!content.trim() && !imageFile) { setError('Add story text or choose an image.'); return; }
    setBusy(true); setError('');
    try { const form = new FormData(); if (content.trim()) form.append('content', content.trim()); form.append('visibility', visibility); if (imageFile) form.append('image', imageFile); onSaved(unwrap(await api.post('/api/stories', form))); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Could not publish your story.'); }
    finally { setBusy(false); }
  };
  return <Modal title="Create story" onClose={onClose}><form onSubmit={submit} className="space-y-4"><textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={500} rows={4} className="input resize-none" placeholder="Share a quick update…" /><label className="block text-sm font-bold text-slate-600 dark:text-slate-300">Who can see your story?<select value={visibility} onChange={(event) => setVisibility(event.target.value)} className="input mt-2">{visibilityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-black text-navy transition hover:border-mint hover:bg-mint/10 dark:border-slate-600 dark:text-white"><span>🖼️ Add image · max 150 MB</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={selectImage} className="sr-only" /></label>{preview && <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"><img src={preview} alt="Story preview" className="max-h-72 w-full object-contain" /><p className="border-t border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-300">{imageFile.name} · {(imageFile.size / (1024 * 1024)).toFixed(1)} MB</p></div>}{error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-black text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button><button type="submit" disabled={busy} className="rounded-xl bg-navy px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">{busy ? 'Publishing…' : 'Share story'}</button></div></form></Modal>;
}

function StoryViewer({ group, viewerId, onClose, onDeleted }) {
  const [index, setIndex] = useState(group.stories.length - 1);
  const story = group.stories[index];
  const own = story.authorId === viewerId;
  const remove = async () => { if (!window.confirm('Delete this story?')) return; try { await api.delete(`/api/stories/${story.id}`); onDeleted(); } catch (requestError) { window.alert(requestError.response?.data?.message || 'Could not delete this story.'); } };
  return <Modal title={group.author?.id === viewerId ? 'Your story' : `${group.author?.fullName || 'Community member'}’s story`} onClose={onClose}><div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#10243f] via-[#1b6172] to-[#ef8b78]">{story.imageUrl ? <img src={mediaUrl(story.imageUrl)} alt="Story" className="max-h-[62vh] w-full object-contain" /> : <div className="flex min-h-64 items-center justify-center p-8 text-center text-xl font-black leading-8 text-white">{story.content}</div>}<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-4 pt-16 text-white"><p className="text-xs font-bold text-white/70">{story.visibility === 'PRIVATE' ? '🔒 Only me' : story.visibility === 'FRIENDS_ONLY' ? '👥 Friends only' : '🌎 Public'} · {new Date(story.createdAt).toLocaleString()}</p>{story.content && story.imageUrl && <p className="mt-2 text-sm font-semibold">{story.content}</p>}</div>{group.stories.length > 1 && <><button type="button" onClick={() => setIndex((current) => Math.max(0, current - 1))} disabled={index === 0} className="absolute left-3 top-1/2 rounded-full bg-black/40 px-3 py-2 text-white disabled:opacity-30">‹</button><button type="button" onClick={() => setIndex((current) => Math.min(group.stories.length - 1, current + 1))} disabled={index === group.stories.length - 1} className="absolute right-3 top-1/2 rounded-full bg-black/40 px-3 py-2 text-white disabled:opacity-30">›</button></>}</div><div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Story {index + 1} of {group.stories.length} · expires after 24 hours</p>{own && <button type="button" onClick={remove} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300">Delete story</button>}</div></Modal>;
}

function Modal({ title, onClose, children }) { return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-black text-ink dark:text-white">{title}</h2><button type="button" onClick={onClose} aria-label="Close" className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">×</button></div>{children}</div></div>; }
