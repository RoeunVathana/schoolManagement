import { useState } from 'react';
import api, { unwrap } from '../api/axios';

export default function PostComposer({ onCreated }) {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('FRIENDS_ONLY');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!content.trim()) return;
    setBusy(true); setError('');
    try {
      const post = unwrap(await api.post('/api/posts', { content: content.trim(), visibility }));
      setContent(''); onCreated?.(post);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not publish your post.');
    } finally { setBusy(false); }
  };

  return <form onSubmit={submit} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 sm:p-5"><div className="flex items-start gap-3"><div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-mint to-sky-200 text-sm font-black text-navy">✦</div><textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={5000} rows={3} className="input min-h-24 resize-none" placeholder="Share something with your community…" /></div><div className="mt-3 flex flex-col justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-700 sm:flex-row sm:items-center"><label className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"><span>Who can see your post?</span><select value={visibility} onChange={(event) => setVisibility(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-navy outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-mint"><option value="PUBLIC">🌎 Public</option><option value="FRIENDS_ONLY">👥 Friends</option><option value="PRIVATE">🔒 Only me</option></select></label><button type="submit" disabled={busy || !content.trim()} className="rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#1b3b5d] disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Publishing…' : 'Publish post'}</button></div>{error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}</form>;
}
