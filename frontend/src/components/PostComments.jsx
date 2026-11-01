import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { unwrap } from '../api/axios';
import UserAvatar from './UserAvatar';
import { useAuth } from '../hooks/useAuth';
import { useCommunityText } from '../context/communityTranslations';

function formatCommentDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function PostComments({ post }) {
  const { user } = useAuth();
  const text = useCommunityText();
  const [comments, setComments] = useState(post.comments || []);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [open, setOpen] = useState(Boolean(post.comments?.length));
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [likeBusy, setLikeBusy] = useState({});
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setComments(post.comments || []);
    setCommentCount(post.commentCount || 0);
    setOpen(Boolean(post.comments?.length));
    setLoaded(false);
    setDraft('');
    setNotice('');
    setLikeBusy({});
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

  const remove = async (comment) => {
    if (!window.confirm(text.deleteCommentConfirm)) return;
    setNotice('');
    try {
      const result = unwrap(await api.delete(`/api/posts/${post.id}/comments/${comment.id}`)) || {};
      setComments((current) => current.filter((item) => item.id !== comment.id));
      setCommentCount(result.commentCount ?? Math.max(0, commentCount - 1));
    } catch (requestError) {
      setNotice(requestError.response?.data?.message || text.commentFailed);
    }
  };

  const toggleLike = async (comment) => {
    if (!user) {
      setNotice(text.signInToComment);
      return;
    }
    if (likeBusy[comment.id]) return;
    const nextLiked = !comment.viewerLiked;
    setLikeBusy((current) => ({ ...current, [comment.id]: true }));
    setNotice('');
    try {
      const result = unwrap(nextLiked
        ? await api.post(`/api/posts/${post.id}/comments/${comment.id}/like`)
        : await api.delete(`/api/posts/${post.id}/comments/${comment.id}/like`)) || {};
      setComments((current) => current.map((item) => item.id === comment.id ? { ...item, likeCount: result.likeCount ?? item.likeCount ?? 0, viewerLiked: result.liked ?? nextLiked } : item));
    } catch (requestError) {
      setNotice(requestError.response?.data?.message || text.commentLikeFailed);
    } finally {
      setLikeBusy((current) => ({ ...current, [comment.id]: false }));
    }
  };

  return <section className="community-post-comments" aria-label={text.comments}>
    <button type="button" className="community-post-comments-toggle" onClick={toggleComments} aria-expanded={open}>
      <span aria-hidden="true">💬</span>{open ? text.hideComments : text.viewComments}{commentCount > 0 ? ` · ${commentCount}` : ''}
    </button>
    {open && <div className="community-post-comments-panel">
      {loading ? <p className="community-post-comments-state">{text.loadingComments}</p> : comments.length ? <div className="community-post-comments-list">
        {comments.map((comment) => <article key={comment.id} className="community-post-comment">
          <UserAvatar person={comment.author} size="sm" />
          <div className="community-post-comment-body"><div className="community-post-comment-bubble"><strong>{comment.author?.fullName || text.communityMember}</strong><p>{comment.content}</p></div><div className="community-post-comment-meta"><time dateTime={comment.createdAt}>{formatCommentDate(comment.createdAt)}</time><button type="button" className={`community-post-comment-like ${comment.viewerLiked ? 'is-liked' : ''}`} onClick={() => toggleLike(comment)} disabled={likeBusy[comment.id]} aria-pressed={Boolean(comment.viewerLiked)}>{comment.viewerLiked ? text.unlikeComment : text.likeComment}{comment.likeCount > 0 ? ` · ${comment.likeCount}` : ''}</button>{user?.id === comment.authorId && <button type="button" onClick={() => remove(comment)}>{text.deleteComment}</button>}</div></div>
        </article>)}
      </div> : <p className="community-post-comments-state">{text.noComments}</p>}
      {notice && <p className="community-post-comments-notice" role="alert">{notice}</p>}
      {user ? <form className="community-post-comment-form" onSubmit={submit}><UserAvatar person={user} size="sm" /><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={text.writeComment} maxLength={2000} aria-label={text.writeComment} /><button type="submit" disabled={busy || !draft.trim()}>{busy ? '...' : text.comment}</button></form> : <p className="community-post-comments-login"><Link to="/login/student">{text.signInToComment}</Link></p>}
    </div>}
  </section>;
}
