import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { unwrap } from '../api/axios';
import UserAvatar from './UserAvatar';
import ReactionPicker from './ReactionPicker';
import { useAuth } from '../hooks/useAuth';
import { useCommunityText } from '../context/communityTranslations';

function formatCommentDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function PostCommentsAll({ post }) {
  const { user } = useAuth();
  const text = useCommunityText();
  const editLabel = text.editComment || 'Edit';
  const saveLabel = text.saveComment || 'Save';
  const cancelLabel = text.cancelComment || 'Cancel';
  const editedLabel = text.editedComment || 'edited';
  const replyLabel = text.replyComment || 'Reply';
  const replyPlaceholder = text.replyPlaceholder || 'Write a reply...';
  const cancelReplyLabel = text.cancelComment || 'Cancel';
  const updateFailedLabel = text.commentUpdateFailed || 'Could not update comment.';
  const [comments, setComments] = useState(post.comments || []);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [open, setOpen] = useState(Boolean(post.comments?.length));
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reactionBusy, setReactionBusy] = useState({});
  const [reactionMenuId, setReactionMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [replyingId, setReplyingId] = useState(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [replyBusyId, setReplyBusyId] = useState(null);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setComments(post.comments || []);
    setCommentCount(post.commentCount || 0);
    setOpen(Boolean(post.comments?.length));
    setLoaded(false);
    setDraft('');
    setReplyingId(null);
    setReplyDraft('');
    setNotice('');
    setReactionBusy({});
    setReactionMenuId(null);
    setEditingId(null);
    setEditDraft('');
  }, [post.id]);

  const loadComments = async () => {
    if (loaded || loading || !user) return;
    setLoading(true);
    setNotice('');
    try {
      const result = unwrap(await api.get(`/api/posts/${post.id}/comments`, { params: { limit: 50 } })) || {};
      setComments(result.items || []);
      setCommentCount(result.total ?? result.items?.length ?? 0);
      setLoaded(true);
    } catch (requestError) {
      setNotice(requestError.response?.data?.message || text.commentFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && user && !loaded) loadComments();
  }, [open, user, loaded, post.id]);

  const toggleComments = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) loadComments();
  };

  const submit = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || busy) return;
    setBusy(true);
    setNotice('');
    try {
      const result = unwrap(await api.post(`/api/posts/${post.id}/comments`, { content })) || {};
      if (result.comment) setComments((current) => [result.comment, ...current.filter((item) => item.id !== result.comment.id)]);
      setCommentCount(result.commentCount ?? commentCount + 1);
      setDraft('');
      setOpen(true);
      setLoaded(true);
    } catch (requestError) {
      setNotice(requestError.response?.data?.message || text.commentPostFailed);
    } finally {
      setBusy(false);
    }
  };

  const submitReply = async (event, parentComment) => {
    event.preventDefault();
    const content = replyDraft.trim();
    if (!content || replyBusyId) return;
    setReplyBusyId(parentComment.id);
    setNotice('');
    try {
      const result = unwrap(await api.post(`/api/posts/${post.id}/comments`, { content, parentId: parentComment.id })) || {};
      if (result.comment) setComments((current) => [...current, result.comment]);
      setCommentCount(result.commentCount ?? commentCount + 1);
      setReplyDraft('');
      setReplyingId(null);
      setOpen(true);
      setLoaded(true);
    } catch (requestError) {
      setNotice(requestError.response?.data?.message || text.replyFailed || text.commentPostFailed);
    } finally {
      setReplyBusyId(null);
    }
  };

  const remove = async (comment) => {
    if (!window.confirm(text.deleteCommentConfirm)) return;
    setNotice('');
    try {
      const result = unwrap(await api.delete(`/api/posts/${post.id}/comments/${comment.id}`)) || {};
      setComments((current) => {
        const removedIds = new Set([comment.id]);
        let changed = true;
        while (changed) {
          changed = false;
          current.forEach((item) => {
            if (item.parentId && removedIds.has(item.parentId) && !removedIds.has(item.id)) {
              removedIds.add(item.id);
              changed = true;
            }
          });
        }
        return current.filter((item) => !removedIds.has(item.id));
      });
      setCommentCount(result.commentCount ?? Math.max(0, commentCount - 1));
    } catch (requestError) {
      setNotice(requestError.response?.data?.message || text.commentFailed);
    }
  };

  const startEdit = (comment) => {
    setEditingId(comment.id);
    setEditDraft(comment.content || '');
    setNotice('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const saveEdit = async (event, comment) => {
    event.preventDefault();
    const content = editDraft.trim();
    if (!content || editBusy) return;
    setEditBusy(true);
    setNotice('');
    try {
      const result = unwrap(await api.patch(`/api/posts/${post.id}/comments/${comment.id}`, { content })) || {};
      const updated = result.comment || result;
      setComments((current) => current.map((item) => item.id === comment.id ? { ...item, ...updated } : item));
      cancelEdit();
    } catch (requestError) {
      setNotice(requestError.response?.data?.message || updateFailedLabel);
    } finally {
      setEditBusy(false);
    }
  };

  const toggleReaction = async (comment, nextType) => {
    if (!user) {
      setNotice(text.signInToComment);
      return;
    }
    if (reactionBusy[comment.id]) return;
    setReactionBusy((current) => ({ ...current, [comment.id]: true }));
    setNotice('');
    try {
      const result = unwrap(nextType
        ? await api.post(`/api/posts/${post.id}/comments/${comment.id}/like`, { type: nextType })
        : await api.delete(`/api/posts/${post.id}/comments/${comment.id}/like`)) || {};
      setComments((current) => current.map((item) => item.id === comment.id ? {
        ...item,
        likeCount: result.likeCount ?? item.likeCount ?? 0,
        reactionCount: result.reactionCount ?? item.reactionCount ?? 0,
        reactionCounts: result.reactionCounts || item.reactionCounts || {},
        viewerReaction: result.viewerReaction || null,
        viewerLiked: result.viewerReaction === 'LIKE',
      } : item));
      setReactionMenuId(null);
    } catch (requestError) {
      setNotice(requestError.response?.data?.message || text.commentLikeFailed);
    } finally {
      setReactionBusy((current) => ({ ...current, [comment.id]: false }));
    }
  };

  const shareComment = async (comment) => {
    const url = `${window.location.origin}/community#comment-${comment.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice(text.postLinkCopied || 'Comment link copied.');
    } catch {
      setNotice(text.shareFailed || 'Could not share this comment.');
    }
  };

  const renderComment = (comment, depth = 0) => {
    const isOwner = user?.id === comment.authorId;
    const canDelete = isOwner || user?.role === 'ADMIN';
    const replies = comments.filter((item) => item.parentId === comment.id);
    const replyCount = Math.max(comment.replyCount || 0, replies.length);

    return <article key={comment.id} id={`comment-${comment.id}`} className={`community-post-comment ${depth ? 'is-reply' : ''}`}>
      <UserAvatar person={comment.author} size="sm" />
      <div className="community-post-comment-body">
        {editingId === comment.id ? <form className="community-post-comment-edit-form" onSubmit={(event) => saveEdit(event, comment)}>
          <textarea value={editDraft} onChange={(event) => setEditDraft(event.target.value)} maxLength={2000} rows={3} aria-label={editLabel} autoFocus />
          <div>
            <button type="button" onClick={cancelEdit} disabled={editBusy}>{cancelLabel}</button>
            <button type="submit" disabled={editBusy || !editDraft.trim()}>{editBusy ? '...' : saveLabel}</button>
          </div>
        </form> : <>
          <div className="community-post-comment-bubble"><strong>{comment.author?.fullName || text.communityMember}</strong><p>{comment.content}</p></div>
          <div className="community-post-comment-meta"><time dateTime={comment.updatedAt || comment.createdAt}>{formatCommentDate(comment.updatedAt || comment.createdAt)}</time>{comment.updatedAt && comment.updatedAt !== comment.createdAt ? ` · ${editedLabel}` : ''}</div>
          <div className="community-post-comment-actions">
            <ReactionPicker selected={comment.viewerReaction} count={comment.reactionCount ?? comment.likeCount ?? 0} counts={comment.reactionCounts || {}} open={reactionMenuId === comment.id} onToggle={() => setReactionMenuId((current) => current === comment.id ? null : comment.id)} onSelect={(nextType) => toggleReaction(comment, nextType)} disabled={Boolean(reactionBusy[comment.id])} label={text.likeComment} />
            <button type="button" className="community-post-comment-share" onClick={() => shareComment(comment)}><span aria-hidden="true">↗</span>{text.share}</button>
            {user && <button type="button" onClick={() => { setReplyingId(comment.id); setReplyDraft(''); setNotice(''); }}>{replyLabel}{replyCount ? ` · ${replyCount}` : ''}</button>}
            {isOwner && <button type="button" onClick={() => startEdit(comment)}>{editLabel}</button>}
            {canDelete && <button type="button" onClick={() => remove(comment)}>{text.deleteComment}</button>}
          </div>
          {replyingId === comment.id && user && <form id={`reply-form-${comment.id}`} className="community-post-comment-reply-form" onSubmit={(event) => submitReply(event, comment)}>
            <UserAvatar person={user} size="sm" />
            <input value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} placeholder={replyPlaceholder} maxLength={2000} aria-label={replyPlaceholder} autoFocus />
            <div className="community-post-comment-reply-actions">
              <button type="button" className="community-post-comment-reply-cancel" onClick={() => { setReplyingId(null); setReplyDraft(''); }} disabled={replyBusyId === comment.id}>{cancelReplyLabel}</button>
              <button type="submit" disabled={replyBusyId === comment.id || !replyDraft.trim()}>{replyBusyId === comment.id ? '...' : text.comment}</button>
            </div>
          </form>}
          {replies.length > 0 && <div className="community-post-comment-replies">{replies.map((reply) => renderComment(reply, depth + 1))}</div>}
        </>}
      </div>
    </article>;
  };

  const rootComments = comments.filter((comment) => !comment.parentId);

  return <section className="community-post-comments" aria-label={text.comments}>
    <button type="button" className="community-post-comments-toggle" onClick={toggleComments} aria-expanded={open}>
      <span aria-hidden="true">💬</span>{open ? text.hideComments : text.viewComments}{commentCount > 0 ? ` · ${commentCount}` : ''}
    </button>
    {open && <div className="community-post-comments-panel">
      {loading ? <p className="community-post-comments-state">{text.loadingComments}</p> : rootComments.length ? <div className="community-post-comments-list">{rootComments.map((comment) => renderComment(comment))}</div> : <p className="community-post-comments-state">{text.noComments}</p>}
      {notice && <p className="community-post-comments-notice" role="alert">{notice}</p>}
      {user ? <form className="community-post-comment-form" onSubmit={submit}><UserAvatar person={user} size="sm" /><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={text.writeComment} maxLength={2000} aria-label={text.writeComment} /><button type="submit" disabled={busy || !draft.trim()}>{busy ? '...' : text.comment}</button></form> : <p className="community-post-comments-login"><Link to="/login/student">{text.signInToComment}</Link></p>}
    </div>}
  </section>;
}
