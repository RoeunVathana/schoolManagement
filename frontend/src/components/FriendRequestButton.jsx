import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { unwrap } from '../api/axios';
import { useCommunityText } from '../context/communityTranslations';

const buttonBase = 'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60';

export default function FriendRequestButton({ userId, status = 'NONE', requestId, onChange, onMessage, ownProfilePath }) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentRequestId, setCurrentRequestId] = useState(requestId);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const text = useCommunityText();

  useEffect(() => { setCurrentStatus(status); setCurrentRequestId(requestId); }, [status, requestId]);

  const update = (nextStatus, nextRequestId = null) => {
    setCurrentStatus(nextStatus);
    setCurrentRequestId(nextRequestId);
    onChange?.(nextStatus, nextRequestId);
  };

  const act = async (action) => {
    setBusy(true);
    try {
      const result = await action();
      return unwrap(result);
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    try {
      const result = await act(() => api.post('/api/friends/request', { receiverId: userId }));
      update('REQUEST_SENT', result?.id || null);
    } catch (error) {
      onChange?.(currentStatus, currentRequestId, error);
    }
  };

  const cancel = async () => {
    if (!currentRequestId) return;
    try { await act(() => api.delete(`/api/friends/request/${currentRequestId}`)); update('NONE'); } catch (error) { onChange?.(currentStatus, currentRequestId, error); }
  };

  const accept = async () => {
    if (!currentRequestId) return;
    try { await act(() => api.patch(`/api/friends/request/${currentRequestId}/accept`)); update('FRIENDS'); } catch (error) { onChange?.(currentStatus, currentRequestId, error); }
  };

  const decline = async () => {
    if (!currentRequestId) return;
    try { await act(() => api.patch(`/api/friends/request/${currentRequestId}/reject`)); update('NONE'); } catch (error) { onChange?.(currentStatus, currentRequestId, error); }
  };

  const unfriend = async () => {
    setMenuOpen(false);
    try { await act(() => api.delete(`/api/friends/${userId}`)); update('NONE'); } catch (error) { onChange?.(currentStatus, currentRequestId, error); }
  };

  if (currentStatus === 'SELF') return <Link to={ownProfilePath || `/profile/${userId}`} className={`${buttonBase} bg-navy text-white shadow-lg shadow-navy/15 hover:-translate-y-0.5 hover:bg-[#1b3b5d]`}>{text.editProfile}</Link>;

  return <div className="flex flex-wrap items-center gap-2">
    {currentStatus === 'NONE' && <button type="button" disabled={busy} onClick={send} className={`${buttonBase} bg-navy text-white shadow-lg shadow-navy/15 hover:-translate-y-0.5 hover:bg-[#1b3b5d]`}>{busy ? text.sendingRequest : text.addFriend}</button>}
    {currentStatus === 'REQUEST_SENT' && <button type="button" disabled={busy} onClick={cancel} className={`${buttonBase} border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200`}>{busy ? text.updating : text.requested}</button>}
    {currentStatus === 'REQUEST_RECEIVED' && <><button type="button" disabled={busy} onClick={accept} className={`${buttonBase} bg-mint text-navy hover:-translate-y-0.5`}>{busy ? text.updating : text.accept}</button><button type="button" disabled={busy} onClick={decline} className={`${buttonBase} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200`}>{text.decline}</button></>}
    {currentStatus === 'FRIENDS' && <div className="relative"><button type="button" disabled={busy} onClick={() => setMenuOpen((open) => !open)} className={`${buttonBase} border border-mint/50 bg-mint/20 text-emerald-800 hover:bg-mint/35 dark:text-mint`}>{busy ? text.updating : text.friendsButton} <span className="ml-2 text-xs">v</span></button>{menuOpen && <div className="absolute left-0 top-[calc(100%+.5rem)] z-20 min-w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800"><Link to={`/profile/${userId}`} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700">{text.viewFriendship}</Link><button type="button" onClick={unfriend} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">{text.unfriend}</button></div>}</div>}
    {currentStatus === 'FRIENDS' && <button type="button" onClick={() => onMessage?.(userId)} className={`${buttonBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200`}>{text.message}</button>}
  </div>;
}
