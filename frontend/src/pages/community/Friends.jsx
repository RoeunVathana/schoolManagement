import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { unwrap } from '../../api/axios';
import FriendRequestButton from '../../components/FriendRequestButton';
import CommunityStories from '../../components/CommunityStories';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const avatarUrl = (person) => {
  const path = person?.profile?.avatar || person?.profileImageUrl;
  return path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;
};

const initials = (name) => name?.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';

export default function Friends() {
  const [data, setData] = useState({ incoming: [], outgoing: [], suggestions: [], friends: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [requests, suggestions, friends] = await Promise.all([
        api.get('/api/friends/requests'),
        api.get('/api/friends/suggestions'),
        api.get('/api/friends'),
      ]);
      setData({ ...unwrap(requests), suggestions: unwrap(suggestions) || [], friends: unwrap(friends) || [] });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load your friends.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const person = (value) => value.user || value;

  const renderPersonCard = (value, status, requestId) => {
    const target = person(value);
    return <article key={value.id} className="community-person-card">
      <Link to={`/profile/${target.id}`} className="community-person-link">
        <div className="community-avatar community-avatar-md">
          {target.profile?.avatar || target.profileImageUrl ? <img src={avatarUrl(target)} alt={target.fullName} /> : initials(target.fullName)}
        </div>
        <div className="community-person-copy">
          <p className="community-person-name">{target.fullName}</p>
          <p className="community-person-role">{target.role}</p>
        </div>
      </Link>
      <FriendRequestButton
        userId={target.id}
        status={status}
        requestId={requestId}
        onChange={(_next, _requestId, requestError) => {
          if (requestError) setError(requestError.response?.data?.message || 'Action failed.');
          else load();
        }}
        onMessage={() => status === 'FRIENDS'
          ? navigate('/chat', { state: { userId: target.id } })
          : setError('Accept the friend request before starting a chat.')}
      />
    </article>;
  };

  return <div className="community-page">
    <section className="community-hero">
      <div className="community-hero-orb community-hero-orb-one" />
      <div className="community-hero-orb community-hero-orb-two" />
      <div className="community-hero-copy">
        <p className="community-eyebrow">CampusFlow community</p>
        <h1>Find your people.</h1>
        <p>Build your learning circle, share moments, and stay close to the people moving forward with you.</p>
      </div>
      <div className="community-hero-actions">
        <Link to="/chat" className="community-button community-button-primary">Open messages</Link>
        <Link to="/courses" className="community-button community-button-soft">Browse courses</Link>
      </div>
    </section>

    <div className="community-stat-grid" aria-label="Community overview">
      <Stat value={data.friends.length} label="Your friends" tone="mint" />
      <Stat value={data.incoming.length} label="New requests" tone="coral" />
      <Stat value={data.suggestions.length} label="People to meet" tone="blue" />
    </div>

    <section className="community-stories-frame">
      <CommunityStories />
    </section>

    {error && <div className="community-alert" role="alert">{error}</div>}

    {loading ? <div className="community-loading-grid" aria-label="Loading community">
      {[1, 2, 3].map((item) => <div className="community-skeleton-card" key={item}><span /><span /><span /></div>)}
    </div> : <div className="community-content-grid">
      <main className="community-main-column">
        <CommunitySection title="Friend requests" count={data.incoming.length} accent="coral" action={data.incoming.length ? 'Review now' : undefined}>
          {data.incoming.length ? <div className="community-person-grid">{data.incoming.map((request) => renderPersonCard(request, 'REQUEST_RECEIVED', request.id))}</div> : <Empty text="No pending requests. New invitations will appear here." />}
        </CommunitySection>

        <CommunitySection title="People you may know" count={data.suggestions.length} accent="blue">
          {data.suggestions.length ? <div className="community-person-grid">{data.suggestions.map((suggestion) => renderPersonCard(suggestion, 'NONE'))}</div> : <Empty text="No suggestions right now. Keep exploring the community." />}
        </CommunitySection>

        <CommunitySection title="Your friends" count={data.friends.length} accent="mint" action={data.friends.length ? 'View all' : undefined}>
          {data.friends.length ? <div className="community-person-grid">{data.friends.map((friend) => renderPersonCard(friend, 'FRIENDS'))}</div> : <Empty text="Your accepted friends will appear here." />}
        </CommunitySection>
      </main>

      <aside className="community-side-column">
        <section className="community-side-card community-guide-card">
          <span className="community-side-icon">+</span>
          <p className="community-eyebrow">Your circle</p>
          <h2>Learn together, grow together.</h2>
          <p>Connect with classmates and customers who share your goals. Accepted friends can message each other privately.</p>
          <Link to="/chat" className="community-text-link">Go to conversations <span aria-hidden="true">→</span></Link>
        </section>
        <section className="community-side-card">
          <div className="community-side-card-heading"><div><p className="community-eyebrow">Quick links</p><h2>Keep exploring</h2></div><span className="community-side-dot" /></div>
          <div className="community-quick-links">
            <Link to="/courses"><span className="community-quick-icon">01</span><span><strong>Courses</strong><small>Learn something useful</small></span><span aria-hidden="true">→</span></Link>
            <Link to="/chat"><span className="community-quick-icon">02</span><span><strong>Messages</strong><small>Chat with your friends</small></span><span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </aside>
    </div>}
  </div>;
}

function Stat({ value, label, tone }) {
  return <div className={`community-stat community-stat-${tone}`}><strong>{value}</strong><span>{label}</span><i aria-hidden="true" /></div>;
}

function CommunitySection({ title, count, accent, action, children }) {
  return <section className="community-section">
    <div className="community-section-heading"><div><span className={`community-section-marker community-section-marker-${accent}`} /><h2>{title}</h2>{typeof count === 'number' && <span className="community-section-count">{count}</span>}</div>{action && <button type="button" className="community-section-action">{action}<span aria-hidden="true">→</span></button>}</div>
    <div className="community-section-body">{children}</div>
  </section>;
}

function Empty({ text }) {
  return <div className="community-empty"><span className="community-empty-mark">○</span><p>{text}</p></div>;
}
