import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { unwrap } from '../../api/axios';
import UserAvatar from '../../components/UserAvatar';
import { useCommunityText } from '../../context/communityTranslations';

const initialForm = { name: '', description: '', visibility: 'PUBLIC' };

export default function Groups() {
  const text = useCommunityText();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [invitations, setInvitations] = useState({ incoming: [], outgoing: [] });
  const [inviteGroup, setInviteGroup] = useState(null);
  const [inviteFriends, setInviteFriends] = useState([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteBusyId, setInviteBusyId] = useState('');

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setGroups(unwrap(await api.get('/api/groups')) || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.groupsLoadFailed);
    } finally {
      setLoading(false);
    }
  }, [text.groupsLoadFailed]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const loadInvitations = useCallback(async () => {
    try {
      setInvitations(unwrap(await api.get('/api/groups/invites')) || { incoming: [], outgoing: [] });
    } catch {
      setInvitations({ incoming: [], outgoing: [] });
    }
  }, []);

  useEffect(() => { loadInvitations(); }, [loadInvitations]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError(text.groupNameRequired);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = unwrap(await api.post('/api/groups', { ...form, name: form.name.trim(), description: form.description.trim() }));
      setGroups((current) => [created, ...current]);
      setForm(initialForm);
      setShowCreate(false);
      setNotice(text.groupCreated);
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.groupActionFailed);
    } finally {
      setSaving(false);
    }
  };

  const join = async (group) => {
    setBusyId(group.id);
    setError('');
    try {
      const updated = unwrap(await api.post(`/api/groups/${group.id}/join`));
      setGroups((current) => current.map((item) => item.id === group.id ? updated : item));
      setNotice(text.joined);
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.groupActionFailed);
    } finally {
      setBusyId('');
    }
  };

  const leave = async (group) => {
    setBusyId(group.id);
    setError('');
    try {
      await api.delete(`/api/groups/${group.id}/leave`);
      setGroups((current) => current.filter((item) => item.id !== group.id || item.visibility === 'PUBLIC').map((item) => item.id === group.id ? { ...item, isMember: false, memberRole: null, memberCount: Math.max(0, item.memberCount - 1) } : item));
      setNotice(text.leaveGroup);
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.groupActionFailed);
    } finally {
      setBusyId('');
    }
  };

  const remove = async (group) => {
    if (!window.confirm(text.deleteGroupConfirm)) return;
    setBusyId(group.id);
    setError('');
    try {
      await api.delete(`/api/groups/${group.id}`);
      setGroups((current) => current.filter((item) => item.id !== group.id));
      setNotice(text.deleteGroup);
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.groupActionFailed);
    } finally {
      setBusyId('');
    }
  };

  const openInvite = async (group) => {
    setInviteGroup(group);
    setInviteFriends([]);
    setInviteLoading(true);
    setError('');
    try {
      const [friendsResult, groupResult] = await Promise.all([api.get('/api/friends'), api.get(`/api/groups/${group.id}`)]);
      const friends = unwrap(friendsResult) || [];
      const detail = unwrap(groupResult) || {};
      const memberIds = new Set((detail.members || []).map((member) => member.id));
      const pendingIds = new Set(invitations.outgoing.filter((invite) => invite.groupId === group.id).map((invite) => invite.invitee?.id));
      setInviteFriends(friends.filter((friend) => !memberIds.has(friend.id) && !pendingIds.has(friend.id)));
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.groupActionFailed);
    } finally {
      setInviteLoading(false);
    }
  };

  const inviteFriend = async (friend) => {
    if (!inviteGroup) return;
    setInviteBusyId(friend.id);
    setError('');
    try {
      const created = unwrap(await api.post(`/api/groups/${inviteGroup.id}/invites`, { inviteeId: friend.id }));
      setInviteFriends((current) => current.filter((item) => item.id !== friend.id));
      setInvitations((current) => ({ ...current, outgoing: [created, ...current.outgoing] }));
      setNotice(text.inviteSent);
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.inviteFailed);
    } finally {
      setInviteBusyId('');
    }
  };

  const acceptInvite = async (invite) => {
    setBusyId(`invite-${invite.id}`);
    setError('');
    try {
      const joined = unwrap(await api.patch(`/api/groups/invites/${invite.id}/accept`));
      setInvitations((current) => ({ ...current, incoming: current.incoming.filter((item) => item.id !== invite.id) }));
      setGroups((current) => [joined, ...current.filter((item) => item.id !== joined.id)]);
      setNotice(text.inviteAccepted);
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.inviteFailed);
    } finally {
      setBusyId('');
    }
  };

  const declineInvite = async (invite) => {
    setBusyId(`invite-${invite.id}`);
    setError('');
    try {
      await api.patch(`/api/groups/invites/${invite.id}/decline`);
      setInvitations((current) => ({ ...current, incoming: current.incoming.filter((item) => item.id !== invite.id) }));
      setNotice(text.inviteDeclined);
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.inviteFailed);
    } finally {
      setBusyId('');
    }
  };

  return <div className="community-page community-groups-page">
    <section className="community-hero community-hero-compact">
      <div className="community-hero-orb community-hero-orb-one" />
      <div className="community-hero-orb community-hero-orb-two" />
      <div className="community-hero-copy">
        <p className="community-eyebrow">{text.community} · {text.groups}</p>
        <h1>{text.groups}</h1>
        <p>{text.groupsDescription}</p>
      </div>
      <div className="community-hero-actions">
        <button type="button" className="community-button community-button-primary" onClick={() => { setNotice(''); setShowCreate(true); }}>+ {text.createGroup}</button>
        <Link to="/friends" className="community-button community-button-soft">{text.yourCircle}</Link>
      </div>
    </section>

    {notice && <div className="community-notice" role="status">{notice}</div>}
    {error && <div className="community-alert" role="alert">{error}</div>}

    {invitations.incoming.length > 0 && <section className="community-group-invitations" aria-labelledby="group-invitations-title">
      <div className="community-section-heading"><div><p className="community-eyebrow">{text.community}</p><h2 id="group-invitations-title">{text.groupInvitations}</h2></div><span className="community-group-invite-count">{invitations.incoming.length}</span></div>
      <div className="community-group-invite-list">{invitations.incoming.map((invite) => <article className="community-group-invite-card" key={invite.id}><div className="community-group-invite-person"><UserAvatar person={invite.inviter} size="sm" /><div><strong>{invite.group?.name}</strong><span>{text.invitedBy} {invite.inviter?.fullName}</span></div></div><div className="community-group-actions"><button type="button" className="community-button community-button-primary" disabled={busyId === `invite-${invite.id}`} onClick={() => acceptInvite(invite)}>{busyId === `invite-${invite.id}` ? '...' : text.acceptInvite}</button><button type="button" className="community-button community-button-soft" disabled={busyId === `invite-${invite.id}`} onClick={() => declineInvite(invite)}>{text.declineInvite}</button></div></article>)}</div>
    </section>}

    {loading ? <div className="community-loading-grid"><div className="community-skeleton-card"><span /><span /><span /></div><div className="community-skeleton-card"><span /><span /><span /></div></div> : groups.length ? <section className="community-groups-grid" aria-label={text.groups}>
      {groups.map((group) => <article className="community-group-card" key={group.id}>
        <div className="community-group-card-top"><span className="community-group-mark">{group.name.slice(0, 1).toUpperCase()}</span><span className={`community-group-visibility is-${group.visibility.toLowerCase()}`}>{group.visibility === 'PUBLIC' ? text.groupPublic : text.groupPrivate}</span></div>
        <h2>{group.name}</h2>
        <p>{group.description || text.groupsDescription}</p>
        <div className="community-group-owner"><UserAvatar person={group.owner} size="sm" /><span><strong>{group.owner?.fullName}</strong><small>{group.isOwner ? text.owner : group.owner?.role}</small></span></div>
        <div className="community-group-footer"><span>{group.memberCount} {text.members}</span><div className="community-group-actions">
          {group.isMember && <Link to="/chat" state={{ groupId: group.id }} className="community-button community-button-primary">{text.openGroupChat || 'Group chat'}</Link>}
          {group.isLeader && <button type="button" className="community-button community-button-soft" disabled={busyId === group.id} onClick={() => openInvite(group)}>{text.inviteFriends}</button>}
          {group.isOwner ? <button type="button" className="community-button community-button-danger" disabled={busyId === group.id} onClick={() => remove(group)}>{text.deleteGroup}</button> : group.isMember ? <button type="button" className="community-button community-button-soft" disabled={busyId === group.id} onClick={() => leave(group)}>{text.leaveGroup}</button> : <button type="button" className="community-button community-button-primary" disabled={busyId === group.id} onClick={() => join(group)}>{busyId === group.id ? '...' : text.joinGroup}</button>}
        </div></div>
      </article>)}
    </section> : <section className="community-empty community-empty-large"><span className="community-empty-mark">+</span><p className="community-empty-title">{text.noGroups}</p><p>{text.noGroupsDescription}</p><button type="button" className="community-button community-button-primary" onClick={() => setShowCreate(true)}>{text.createGroup}</button></section>}

    {showCreate && <div className="community-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}><section className="community-modal" role="dialog" aria-modal="true" aria-labelledby="create-group-title">
      <div className="community-modal-heading"><h2 id="create-group-title">{text.createGroup}</h2><button type="button" className="community-modal-close" onClick={() => setShowCreate(false)} aria-label={text.close}>×</button></div>
      <form className="community-modal-form" onSubmit={submit}>
        <label className="community-field-label">{text.groupName}<input className="community-form-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={80} autoFocus required /></label>
        <label className="community-field-label">{text.groupDescription}<textarea className="community-form-input community-form-textarea" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={500} rows={4} /></label>
        <fieldset className="community-group-visibility-field"><legend className="community-field-label">{text.groupVisibility}</legend><label><input type="radio" name="group-visibility" checked={form.visibility === 'PUBLIC'} onChange={() => setForm((current) => ({ ...current, visibility: 'PUBLIC' }))} /> <strong>{text.publicGroup}</strong><small>{text.publicGroupHelp}</small></label><label><input type="radio" name="group-visibility" checked={form.visibility === 'PRIVATE'} onChange={() => setForm((current) => ({ ...current, visibility: 'PRIVATE' }))} /> <strong>{text.privateGroup}</strong><small>{text.privateGroupHelp}</small></label></fieldset>
        <div className="community-modal-actions"><button type="button" className="community-button community-button-soft" onClick={() => setShowCreate(false)}>{text.cancel}</button><button type="submit" className="community-button community-button-primary" disabled={saving}>{saving ? text.creating : text.create}</button></div>
      </form>
    </section></div>}

    {inviteGroup && <div className="community-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setInviteGroup(null); }}><section className="community-modal community-group-invite-modal" role="dialog" aria-modal="true" aria-labelledby="invite-friends-title">
      <div className="community-modal-heading"><h2 id="invite-friends-title">{text.inviteFriends}</h2><button type="button" className="community-modal-close" onClick={() => setInviteGroup(null)} aria-label={text.close}>×</button></div>
      <p className="community-group-invite-modal-title">{inviteGroup.name}</p>
      {inviteLoading ? <div className="community-loading-grid"><div className="community-skeleton-card"><span /><span /><span /></div></div> : inviteFriends.length ? <div className="community-group-friend-picker">{inviteFriends.map((friend) => <div className="community-group-friend-row" key={friend.id}><div className="community-group-invite-person"><UserAvatar person={friend} size="sm" /><div><strong>{friend.fullName}</strong><span>{friend.role}</span></div></div><button type="button" className="community-button community-button-primary" disabled={inviteBusyId === friend.id} onClick={() => inviteFriend(friend)}>{inviteBusyId === friend.id ? '...' : text.inviteFriend}</button></div>)}</div> : <p className="community-empty-copy">{text.noFriendsToInvite}</p>}
    </section></div>}
  </div>;
}
