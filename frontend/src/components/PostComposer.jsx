import { useEffect, useState } from 'react';
import api, { unwrap } from '../api/axios';
import { useLanguage } from '../context/LanguageContext';
import { useCommunityText } from '../context/communityTranslations';
import CommunityMedia from './CommunityMedia';
import UserAvatar from './UserAvatar';

const MAX_MEDIA_SIZE = 100 * 1024 * 1024;
const MAX_MEDIA_COUNT = 10;
const IMAGE_ACCEPT = 'image/*';
const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,video/x-m4v';

function mediaTypeFor(file) {
  return file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
}

function existingPostMedia(post) {
  if (post?.media?.length) return post.media;
  return post?.imageUrl ? [{ id: `${post.id || 'post'}-legacy`, url: post.imageUrl, mediaType: post.mediaType || 'IMAGE', sortOrder: 0 }] : [];
}

function friendName(friend) {
  return friend?.fullName || friend?.user?.fullName || friend?.email || 'Friend';
}

export default function PostComposer({ post, onCreated, onUpdated, onCancel }) {
  const isEditing = Boolean(post?.id);
  const { language } = useLanguage();
  const text = useCommunityText();
  const isKhmer = language === 'km';
  const copy = isKhmer ? {
    photo: 'រូបភាព',
    video: 'វីដេអូ',
    findFriend: 'ស្វែងរកមិត្តភក្តិ',
    tagFriends: 'ស្វែងរកមិត្តភក្តិដើម្បីដាក់ស្លាក',
    acceptedOnly: 'អាចដាក់ស្លាកបានតែមិត្តភក្តិដែលបានទទួលយល់ព្រមប៉ុណ្ណោះ។',
    loadingFriends: 'កំពុងផ្ទុកមិត្តភក្តិ...',
    noFriendsFound: 'រកមិនឃើញមិត្តភក្តិទេ។',
    noAcceptedFriends: 'មិនទាន់មានមិត្តភក្តិដែលបានទទួលយល់ព្រមទេ។',
    taggedFriends: 'មិត្តភក្តិដែលបានដាក់ស្លាក៖',
    tagLimit: 'ការបង្ហោះ និងស្លាកមិត្តភក្តិ ត្រូវមានអក្សរ ៥០០០ ឬតិចជាងនេះ។',
    mediaNote: `រូបភាព ឬវីដេអូអតិបរមា ${MAX_MEDIA_COUNT} · ទំហំអតិបរមា ១០០ MB ក្នុងមួយឯកសារ`,
  } : {
    photo: 'Photo',
    video: 'Video',
    findFriend: 'Find friend',
    tagFriends: 'Find friends to tag',
    acceptedOnly: 'Only accepted friends can be tagged.',
    loadingFriends: 'Loading friends...',
    noFriendsFound: 'No friends found.',
    noAcceptedFriends: 'No accepted friends yet.',
    taggedFriends: 'Tagged friends:',
    tagLimit: 'Your post and friend tags must be 5000 characters or fewer.',
    mediaNote: `Up to ${MAX_MEDIA_COUNT} images or videos · maximum 100 MB each`,
  };
  const [content, setContent] = useState(post?.content || '');
  const [visibility, setVisibility] = useState(post?.visibility || 'FRIENDS_ONLY');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [taggedFriends, setTaggedFriends] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [friendPickerOpen, setFriendPickerOpen] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setContent(post?.content || '');
    setVisibility(post?.visibility || 'FRIENDS_ONLY');
    setMediaFiles([]);
    setTaggedFriends([]);
    setFriendSearch('');
    setFriendPickerOpen(false);
    setError('');
  }, [post?.id]);

  useEffect(() => {
    const previews = mediaFiles.map((file) => ({ file, url: URL.createObjectURL(file), mediaType: mediaTypeFor(file), name: file.name }));
    setMediaPreviews(previews);
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [mediaFiles]);

  useEffect(() => {
    if (!friendPickerOpen || friends.length) return undefined;
    let active = true;
    setFriendsLoading(true);
    api.get('/api/friends')
      .then((response) => { if (active) setFriends(unwrap(response) || []); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || text.couldNotLoadFriends); })
      .finally(() => { if (active) setFriendsLoading(false); });
    return () => { active = false; };
  }, [friendPickerOpen, friends.length, text.couldNotLoadFriends]);

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

  const filteredFriends = friends
    .filter((friend) => !taggedFriends.some((selected) => selected.id === friend.id))
    .filter((friend) => {
      const query = friendSearch.trim().toLowerCase();
      return !query || `${friendName(friend)} ${friend.email || friend.user?.email || ''}`.toLowerCase().includes(query);
    })
    .slice(0, 8);

  const addFriendTag = (friend) => {
    setTaggedFriends((current) => current.some((item) => item.id === friend.id) ? current : [...current, friend]);
    setFriendSearch('');
  };

  const removeFriendTag = (friendId) => setTaggedFriends((current) => current.filter((friend) => friend.id !== friendId));

  const submit = async (event) => {
    event.preventDefault();
    if (!content.trim()) return;
    const tags = taggedFriends.map((friend) => `@${friendName(friend)}`).join(' ');
    const finalContent = [content.trim(), tags ? `${copy.taggedFriends} ${tags}` : ''].filter(Boolean).join('\n\n');
    if (finalContent.length > 5000) {
      setError(copy.tagLimit);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = new FormData();
      payload.append('content', finalContent);
      payload.append('visibility', visibility);
      mediaFiles.forEach((file) => payload.append('images', file));
      const savedPost = unwrap(isEditing ? await api.patch(`/api/posts/${post.id}`, payload) : await api.post('/api/posts', payload));
      if (isEditing) onUpdated?.(savedPost);
      else { setContent(''); setVisibility('FRIENDS_ONLY'); setMediaFiles([]); setTaggedFriends([]); onCreated?.(savedPost); }
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
      <label className="community-composer-tool"><span className="community-tool-icon">▧</span><span>{copy.photo}</span><input type="file" accept={IMAGE_ACCEPT} multiple onChange={selectMedia} className="sr-only" /></label>
      <label className="community-composer-tool"><span className="community-tool-icon">▶</span><span>{copy.video}</span><input type="file" accept={VIDEO_ACCEPT} multiple onChange={selectMedia} className="sr-only" /></label>
      {!isEditing && <button type="button" className={`community-composer-tool ${friendPickerOpen ? 'is-active' : ''}`} onClick={() => setFriendPickerOpen((open) => !open)} aria-expanded={friendPickerOpen}><span className="community-tool-icon">@</span><span>{copy.findFriend}</span></button>}
      <span className="community-composer-note">{copy.mediaNote}</span>
      {mediaFiles.length > 0 && <button type="button" onClick={() => setMediaFiles([])} className="community-remove-media">{text.removeImage}</button>}
    </div>
    {!isEditing && friendPickerOpen && <div className="community-tag-picker">
      <div className="community-tag-picker-heading"><strong>{copy.tagFriends}</strong><span>{copy.acceptedOnly}</span></div>
      <input value={friendSearch} onChange={(event) => setFriendSearch(event.target.value)} className="community-tag-search" placeholder={text.searchFriendsPlaceholder || 'Search friends by name or email...'} autoFocus />
      {taggedFriends.length > 0 && <div className="community-tag-chips">{taggedFriends.map((friend) => <button type="button" key={friend.id} className="community-tag-chip" onClick={() => removeFriendTag(friend.id)}><span>@{friendName(friend)}</span><span aria-hidden="true">×</span></button>)}</div>}
      {friendsLoading ? <p className="community-tag-empty">{copy.loadingFriends}</p> : filteredFriends.length ? <div className="community-tag-results">{filteredFriends.map((friend) => <button type="button" key={friend.id} className="community-tag-option" onClick={() => addFriendTag(friend)}><UserAvatar person={friend} size="sm" /><span><strong>{friendName(friend)}</strong><small>{friend.email || friend.user?.email || friend.role || ''}</small></span><span className="community-tag-add">+</span></button>)}</div> : <p className="community-tag-empty">{friends.length ? copy.noFriendsFound : copy.noAcceptedFriends}</p>}
    </div>}
    {previewItems.length > 0 && <div className={`community-media-preview-grid ${previewItems.length === 1 ? 'is-single' : ''}`}>
      {previewItems.map((item, index) => <div className="community-media-preview" key={item.id || item.url || `${item.name}-${index}`}><CommunityMedia url={item.url} mediaType={item.mediaType} alt={`Post media ${index + 1}`} /><p>{item.name || `Media ${index + 1}`}{item.file ? ` · ${(item.file.size / (1024 * 1024)).toFixed(1)} MB` : ''}</p>{mediaFiles.length > 0 && <button type="button" onClick={() => setMediaFiles((current) => current.filter((_file, fileIndex) => fileIndex !== index))} className="community-media-preview-remove" aria-label={text.removeImage}>×</button>}</div>)}
    </div>}
    <div className="community-composer-footer"><label className="community-visibility-field"><span>{text.whoSeePost}</span><select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="PUBLIC">{text.public}</option><option value="FRIENDS_ONLY">{text.friendsOnly}</option><option value="PRIVATE">{text.onlyMe}</option></select><small>{visibility === 'PUBLIC' ? text.publicHelp : visibility === 'FRIENDS_ONLY' ? text.friendsHelp : text.privateHelp}</small></label><button type="submit" disabled={busy || !content.trim()} className="community-button community-button-primary">{busy ? (isEditing ? text.saving : text.publish) : (isEditing ? text.saveChanges : text.publishPost)}</button></div>
    {error && <p className="community-alert community-alert-inline">{error}</p>}
  </form>;
}
