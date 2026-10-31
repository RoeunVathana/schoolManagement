import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { unwrap } from '../../api/axios';
import FriendRequestButton from '../../components/FriendRequestButton';
import CommunityStories from '../../components/CommunityStories';
import UserAvatar from '../../components/UserAvatar';
import { useAuth } from '../../hooks/useAuth';
import { useCommunityText } from '../../context/communityTranslations';

export default function Friends() {
  const FRIEND_PREVIEW_LIMIT = 3;
  const [data, setData] = useState({ incoming: [], outgoing: [], suggestions: [], friends: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [processingAll, setProcessingAll] = useState(false);
  const [showAllFriends, setShowAllFriends] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const text = useCommunityText();

  const load = useCallback(async ({ preserveError = false } = {}) => {
    setLoading(true);
    if (!preserveError) setError('');
    try {
      const [requests, suggestions, friends] = await Promise.all([
        api.get('/api/friends/requests'),
        api.get('/api/friends/suggestions'),
        api.get('/api/friends'),
      ]);
      setData({ ...unwrap(requests), suggestions: unwrap(suggestions) || [], friends: unwrap(friends) || [] });
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.couldNotLoadFriends);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const searchFriends = async (event) => {
    event.preventDefault();
    const term = searchQuery.trim();
    if (term.length < 2) {
      setSearchResults([]);
      setSearchActive(false);
      setError(text.searchMinimum);
      return;
    }
    setSearchLoading(true);
    setError('');
    try {
      const response = await api.get('/api/friends/search', { params: { q: term } });
      setSearchResults(unwrap(response) || []);
      setSearchActive(true);
    } catch (searchError) {
      setSearchResults([]);
      setSearchActive(true);
      setError(searchError.response?.data?.message || text.searchFailed);
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchActive(false);
    setError('');
  };

  const acceptAllRequests = async () => {
    if (!data.incoming.length || processingAll) return;
    setProcessingAll(true);
    setError('');
    try {
      const results = await Promise.allSettled(data.incoming.map((request) => api.patch(`/api/friends/request/${request.id}/accept`)));
      const failed = results.filter((result) => result.status === 'rejected').length;
      await load({ preserveError: failed > 0 });
      if (failed) setError(`${failed} ${failed === 1 ? text.requestFailed : text.requestsFailed}`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || text.actionFailed);
      await load({ preserveError: true });
    } finally {
      setProcessingAll(false);
    }
  };

  const person = (value) => value.user || value;
  const roleLabel = (role) => role === 'TEACHER' ? 'Teacher' : role === 'CUSTOMER' ? 'Customer' : 'Student';

  const renderPersonCard = (value, status, requestId) => {
    const target = person(value);
    return <article key={value.id} className="community-person-card">
      <Link to={`/profile/${target.id}`} className="community-person-link">
        <UserAvatar person={target} size="md" />
        <div className="community-person-copy">
          <p className="community-person-name">{target.fullName}</p>
          <p className={`community-person-role ${target.isOnline ? 'is-online' : 'is-offline'}`}><span className="community-presence-dot" aria-hidden="true" />{roleLabel(target.role)} · {target.isOnline ? 'Online' : 'Offline'}</p>
        </div>
      </Link>
      <FriendRequestButton
        userId={target.id}
        status={status}
        requestId={requestId}
        onChange={async (_next, _requestId, requestError) => {
          if (requestError) {
            const responseMessage = requestError.response?.data?.message;
            const message = Array.isArray(responseMessage) ? responseMessage.join(', ') : responseMessage || requestError.message || text.actionFailed;
            setError(message.toLowerCase().includes('no longer pending')
              ? 'This friend request was already handled. The friend list has been refreshed.'
              : message);
            await load({ preserveError: true });
            return;
          }
          await load();
        }}
        onMessage={() => status === 'FRIENDS'
          ? navigate('/chat', { state: { userId: target.id } })
          : setError(text.acceptBeforeChat)}
      />
    </article>;
  };

  return <div className="community-page">
    <section className="community-hero">
      <div className="community-hero-orb community-hero-orb-one" />
      <div className="community-hero-orb community-hero-orb-two" />
      <div className="community-hero-copy">
        <p className="community-eyebrow">{text.community}</p>
        <h1>{text.friendsTitle}</h1>
        <p>{user?.fullName ? `${user.fullName.split(' ')[0]}, ` : ''}{text.friendsDescription}</p>
      </div>
      <div className="community-hero-actions">
        <Link to="/chat" className="community-button community-button-primary">{text.openMessages}</Link>
        <Link to="/courses" className="community-button community-button-soft">{text.browseCourses}</Link>
      </div>
    </section>

    <div className="community-stat-grid" aria-label={text.community}>
      <Stat value={data.friends.length} label={text.yourFriends} tone="mint" />
      <Stat value={data.incoming.length} label={text.friendRequests} tone="coral" />
      <Stat value={data.suggestions.length} label={text.peopleYouMayKnow} tone="blue" />
    </div>

    <section className="community-stories-frame">
      <CommunityStories />
    </section>

    {error && <div className="community-alert" role="alert">{error}</div>}

    <section className="community-search-card" aria-labelledby="friend-search-title">
      <div className="community-search-heading">
        <div>
          <p className="community-eyebrow">{text.findFriends}</p>
          <h2 id="friend-search-title">{text.searchFriends}</h2>
          <p>{text.searchFriendsDescription}</p>
        </div>
      </div>
      <form className="community-search-form" onSubmit={searchFriends}>
        <label className="sr-only" htmlFor="friend-search">{text.searchFriendsPlaceholder}</label>
        <input id="friend-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={text.searchFriendsPlaceholder} autoComplete="off" />
        <button type="submit" className="community-button community-button-primary" disabled={searchLoading}>{searchLoading ? text.searching : text.search}</button>
        {searchActive && <button type="button" className="community-button community-button-soft" onClick={clearSearch}>{text.clearSearch}</button>}
      </form>
      {searchActive && <div className="community-search-results-wrap">
        <p className="community-search-results-title">{text.searchResults} <span>{searchResults.length}</span></p>
        {searchResults.length ? <div className="community-search-results">{searchResults.map((result) => renderPersonCard(result, result.friendshipStatus || 'NONE', result.friendRequestId))}</div> : <Empty text={text.noSearchResults} />}
      </div>}
    </section>

    {loading ? <div className="community-loading-grid" aria-label={text.loadingCommunity}>
      {[1, 2, 3].map((item) => <div className="community-skeleton-card" key={item}><span /><span /><span /></div>)}
    </div> : <div className="community-content-grid">
      <main className="community-main-column">
        <CommunitySection title={text.friendRequests} count={data.incoming.length} accent="coral" action={data.incoming.length ? (processingAll ? text.processingAll : text.acceptAll) : undefined} onAction={acceptAllRequests} actionDisabled={processingAll}>
          {data.incoming.length ? <div className="community-person-grid">{data.incoming.map((request) => renderPersonCard(request, 'REQUEST_RECEIVED', request.id))}</div> : <Empty text={text.noPendingRequests} />}
        </CommunitySection>

        <CommunitySection title={text.outgoingRequests} count={data.outgoing.length} accent="blue">
          {data.outgoing.length ? <div className="community-person-grid">{data.outgoing.map((request) => renderPersonCard(request, 'REQUEST_SENT', request.id))}</div> : <Empty text={text.noOutgoingRequests} />}
        </CommunitySection>

        <CommunitySection title={text.peopleYouMayKnow} count={data.suggestions.length} accent="blue">
          {data.suggestions.length ? <div className="community-person-grid">{data.suggestions.map((suggestion) => renderPersonCard(suggestion, 'NONE'))}</div> : <Empty text={text.noSuggestions} />}
        </CommunitySection>

        <CommunitySection title={text.yourFriends} count={data.friends.length} accent="mint" action={data.friends.length > FRIEND_PREVIEW_LIMIT ? (showAllFriends ? text.showLess : text.viewAll) : undefined} onAction={() => setShowAllFriends((current) => !current)}>
          {data.friends.length ? <div className="community-person-grid">{data.friends.slice(0, showAllFriends ? data.friends.length : FRIEND_PREVIEW_LIMIT).map((friend) => renderPersonCard(friend, 'FRIENDS'))}</div> : <Empty text={text.acceptedAppear} />}
        </CommunitySection>
      </main>

      <aside className="community-side-column">
        <section className="community-side-card community-guide-card">
          <span className="community-side-icon">+</span>
          <p className="community-eyebrow">{text.yourCircle}</p>
          <h2>{text.learnTogether}</h2>
          <p>{text.circleDescription}</p>
          <Link to="/chat" className="community-text-link">Go to conversations <span aria-hidden="true">→</span></Link>
        </section>
        <section className="community-side-card">
          <div className="community-side-card-heading"><div><p className="community-eyebrow">{text.quickLinks}</p><h2>{text.keepExploring}</h2></div><span className="community-side-dot" /></div>
          <div className="community-quick-links">
            <Link to="/courses"><span className="community-quick-icon">01</span><span><strong>{text.course}</strong><small>{text.learnUseful}</small></span><span aria-hidden="true">→</span></Link>
            <Link to="/chat"><span className="community-quick-icon">02</span><span><strong>{text.messages}</strong><small>{text.chatFriends}</small></span><span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </aside>
    </div>}
  </div>;
}

function Stat({ value, label, tone }) {
  return <div className={`community-stat community-stat-${tone}`}><strong>{value}</strong><span>{label}</span><i aria-hidden="true" /></div>;
}

function CommunitySection({ title, count, accent, action, onAction, actionDisabled = false, children }) {
  return <section className="community-section">
    <div className="community-section-heading"><div><span className={`community-section-marker community-section-marker-${accent}`} /><h2>{title}</h2>{typeof count === 'number' && <span className="community-section-count">{count}</span>}</div>{action && <button type="button" className="community-section-action" onClick={onAction} disabled={actionDisabled}>{action}{!actionDisabled && <span aria-hidden="true">→</span>}</button>}</div>
    <div className="community-section-body">{children}</div>
  </section>;
}

function Empty({ text }) {
  return <div className="community-empty"><span className="community-empty-mark">○</span><p>{text}</p></div>;
}
