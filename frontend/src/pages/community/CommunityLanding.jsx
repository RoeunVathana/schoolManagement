import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { unwrap } from '../../api/axios';
import BrandLogo from '../../components/BrandLogo';
import ThemeSwitch from '../../components/ThemeSwitch';
import UserAvatar from '../../components/UserAvatar';
import { useAuth } from '../../hooks/useAuth';
import { roleHome } from '../../utils/roles';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const mediaUrl = (path) => path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;
const initials = (name) => name?.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';

export default function CommunityLanding() {
  const { user, authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [feed, setFeed] = useState({ members: [], posts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/api/community')
      .then((response) => { if (active) setFeed(unwrap(response) || { members: [], posts: [] }); })
      .catch(() => { if (active) setError('The community feed is taking a moment to load.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const communityPath = user ? '/friends' : '/login/student';
  const dashboardPath = user ? roleHome(user.role) : '/courses';
  const displayName = user?.fullName?.split(' ')[0] || 'learner';

  const handleLogout = async () => {
    await logout();
    navigate('/community', { replace: true });
  };

  return <div className="public-community-page">
    <header className="public-community-nav">
      <Link to="/" className="public-community-brand"><span className="public-community-logo"><BrandLogo /></span><span><strong>Campus<span>Flow</span></strong><small>Learning community</small></span></Link>
      <nav className="public-community-nav-links"><Link to="/courses">Courses</Link><Link to="/community" className="is-active">Community</Link><a href="/courses#about">Why CampusFlow</a><a href="/courses#faq">FAQ</a></nav>
      <div className="public-community-nav-actions"><ThemeSwitch />{!authLoading && (user ? <><Link to={dashboardPath} className="public-community-nav-button">Dashboard</Link><button type="button" onClick={handleLogout} className="public-community-nav-logout">Sign out</button></> : <><Link to="/login/student" className="public-community-nav-login">Login</Link><Link to="/register" className="public-community-nav-button">Create account</Link></>)}</div>
    </header>

    <main>
      <section className="public-community-hero">
        <div className="public-community-hero-glow public-community-hero-glow-one" /><div className="public-community-hero-glow public-community-hero-glow-two" />
        <div className="public-community-hero-copy"><p className="public-community-kicker">CampusFlow community</p><h1>Learn together.<br /><span>Go further.</span></h1><p>Meet students and customers who are learning practical skills, sharing progress, and building their next opportunity.</p><div className="public-community-hero-actions"><Link to={communityPath} state={!user ? { message: 'Sign in to join the CampusFlow community.', from: '/friends' } : undefined} className="public-community-button public-community-button-primary">{user ? `Open your community, ${displayName}` : 'Join the community'} <span aria-hidden="true">→</span></Link><Link to="/courses#courses" className="public-community-button public-community-button-outline">Explore courses</Link></div><div className="public-community-proof"><span><strong>{feed.members.length || '—'}</strong> active members</span><span><strong>{feed.posts.length || '—'}</strong> public updates</span><span><strong>24h</strong> story moments</span></div></div>
        <div className="public-community-hero-art"><div className="public-community-art-orbit public-community-art-orbit-one" /><div className="public-community-art-orbit public-community-art-orbit-two" /><div className="public-community-art-card"><div className="public-community-art-card-top"><span className="public-community-art-pill">CAMPUSFLOW</span><span>COMMUNITY</span></div><p>Small steps.<br /><strong>Real progress.</strong></p><div className="public-community-art-steps"><span><b>01</b> Learn</span><span><b>02</b> Connect</span><span><b>03</b> Grow</span></div></div><div className="public-community-floating-card"><span>+ New connections</span><strong>Build your circle</strong><small>Students · Customers · Teachers</small></div></div>
      </section>

      <section className="public-community-section public-community-feed-layout"><div className="public-community-feed-column"><div className="public-community-section-heading"><div><p className="public-community-kicker">From the community</p><h2>Public updates</h2><p>See what people are learning and sharing right now.</p></div><Link to={communityPath} state={!user ? { message: 'Sign in to join the CampusFlow community.', from: '/friends' } : undefined} className="public-community-small-link">{user ? 'Open community' : 'Sign in to post'} →</Link></div>{error && <div className="public-community-alert">{error}</div>}{loading ? <div className="public-community-loading"><span /><span /><span /></div> : feed.posts.length ? <div className="public-community-post-list">{feed.posts.map((post) => <PublicPost key={post.id} post={post} />)}</div> : <div className="public-community-empty"><span>+</span><h3>Your next update could be here.</h3><p>Join CampusFlow to share your learning progress with the community.</p><Link to="/register" className="public-community-small-link">Create a free account →</Link></div>}</div><aside className="public-community-sidebar"><section className="public-community-side-card public-community-members-card"><div className="public-community-side-heading"><div><p className="public-community-kicker">People to meet</p><h2>Growing together</h2></div><span className="public-community-side-dot" /></div><p>Connect with people who are turning curiosity into practical skills.</p><div className="public-community-member-list">{feed.members.slice(0, 6).map((member) => <Link to={user ? `/profile/${member.id}` : '/login/student'} key={member.id} className="public-community-member"><span className="public-community-avatar">{member.profile?.avatar || member.profileImageUrl ? <img src={mediaUrl(member.profile?.avatar || member.profileImageUrl)} alt="" /> : initials(member.fullName)}</span><span><strong>{member.fullName}</strong><small>{member.role}</small></span><span aria-hidden="true">→</span></Link>)}</div>{!loading && !feed.members.length && <p className="public-community-muted">New members will appear here soon.</p>}<Link to={communityPath} state={!user ? { message: 'Sign in to see friends and messages.', from: '/friends' } : undefined} className="public-community-side-link">Meet the community <span aria-hidden="true">→</span></Link></section><section className="public-community-side-card public-community-course-card"><span className="public-community-side-icon">+</span><p className="public-community-kicker">Keep learning</p><h2>Community and courses, in one place.</h2><p>Browse practical courses, then connect with people learning alongside you.</p><Link to="/courses#courses" className="public-community-side-link">Browse courses <span aria-hidden="true">→</span></Link></section></aside></section>
    </main>

    <footer className="public-community-footer"><Link to="/" className="public-community-brand"><span className="public-community-logo"><BrandLogo /></span><span><strong>Campus<span>Flow</span></strong><small>Learning marketplace</small></span></Link><p>Practical learning. Helpful people. A community that moves with you.</p><span>© {new Date().getFullYear()} CampusFlow</span></footer>
  </div>;
}

function PublicPost({ post }) {
  const author = post.author || {};
  return <article className="public-community-post"><div className="public-community-post-header"><div className="public-community-post-author"><UserAvatar person={author} size="public" /><div><strong>{author.fullName || 'CampusFlow member'}</strong><span>{author.role || 'Community member'} · {new Date(post.createdAt).toLocaleDateString()}</span></div></div><span className="public-community-post-badge">Public</span></div><p className="public-community-post-content">{post.content}</p>{post.imageUrl && <img src={mediaUrl(post.imageUrl)} alt="Community update" className="public-community-post-image" />}<div className="public-community-post-footer"><span>Shared with the CampusFlow community</span><Link to="/login/student">Sign in to connect →</Link></div></article>;
}
