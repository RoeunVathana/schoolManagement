import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { unwrap } from '../../api/axios';
import BrandLogo from '../../components/BrandLogo';
import CommunityLanguageSwitch from '../../components/CommunityLanguageSwitch';
import CommunityAiSupport from '../../components/CommunityAiSupport';
import TelegramSupport from '../../components/TelegramSupport';
import ThemeSwitch from '../../components/ThemeSwitch';
import UserAvatar from '../../components/UserAvatar';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { roleHome } from '../../utils/roles';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const mediaUrl = (path) => path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;

const copy = {
  en: {
    marketplace: 'Learning community', courses: 'Courses', community: 'Community', why: 'Why CampusFlow', faq: 'FAQ', login: 'Login', register: 'Create account', dashboard: 'Dashboard', signOut: 'Sign out',
    heroKicker: 'CampusFlow community', heroOne: 'Learn together.', heroTwo: 'Go further.', heroDescription: 'Meet students and customers who are learning practical skills, sharing progress, and building their next opportunity.', join: 'Join the community', open: 'Open your community', explore: 'Explore courses', activeMembers: 'active members', publicUpdates: 'public updates', storyMoments: 'story moments',
    feedKicker: 'From the community', feedTitle: 'Public updates', feedDescription: 'See what people are learning and sharing right now.', openCommunity: 'Open community', signInToPost: 'Sign in to post', people: 'People to meet', growing: 'Growing together', peopleDescription: 'Connect with people who are turning curiosity into practical skills.', meet: 'Meet the community', keepLearning: 'Keep learning', courseTitle: 'Community and courses, in one place.', courseDescription: 'Browse practical courses, then connect with people learning alongside you.', browseCourses: 'Browse courses', public: 'Public', shared: 'Shared with the CampusFlow community', signInConnect: 'Sign in to connect', emptyTitle: 'Your next update could be here.', emptyDescription: 'Join CampusFlow to share your learning progress with the community.', createAccount: 'Create a free account', footer: 'Practical learning. Helpful people. A community that moves with you.', loading: 'Loading your community...',
  },
  km: {
    marketplace: 'សហគមន៍សិក្សា', courses: 'វគ្គសិក្សា', community: 'សហគមន៍', why: 'ហេតុអ្វី CampusFlow', faq: 'សំណួរ', login: 'ចូលគណនី', register: 'បង្កើតគណនី', dashboard: 'ផ្ទាំងគ្រប់គ្រង', signOut: 'ចាកចេញ',
    heroKicker: 'សហគមន៍ CampusFlow', heroOne: 'រៀនជាមួយគ្នា។', heroTwo: 'ឈានទៅមុខ។', heroDescription: 'ជួបសិស្ស និងអតិថិជនដែលកំពុងរៀនជំនាញជាក់ស្តែង ចែករំលែកការរីកចម្រើន និងកសាងឱកាសថ្មី។', join: 'ចូលរួមសហគមន៍', open: 'បើកសហគមន៍របស់អ្នក', explore: 'ស្វែងរកវគ្គសិក្សា', activeMembers: 'សមាជិកសកម្ម', publicUpdates: 'ការចែករំលែកសាធារណៈ', storyMoments: 'រឿងរ៉ាវ ២៤ ម៉ោង',
    feedKicker: 'ពីសហគមន៍', feedTitle: 'ការចែករំលែកថ្មីៗ', feedDescription: 'មើលអ្វីដែលមនុស្សកំពុងរៀន និងចែករំលែកនៅពេលនេះ។', openCommunity: 'បើកសហគមន៍', signInToPost: 'ចូលគណនីដើម្បីបង្ហោះ', people: 'មនុស្សដែលអាចស្គាល់', growing: 'រីកចម្រើនជាមួយគ្នា', peopleDescription: 'ភ្ជាប់ទំនាក់ទំនងជាមួយមនុស្សដែលកំពុងបម្លែងការចង់ដឹងទៅជាជំនាញជាក់ស្តែង។', meet: 'ជួបសហគមន៍', keepLearning: 'បន្តការរៀន', courseTitle: 'សហគមន៍ និងវគ្គសិក្សា នៅកន្លែងតែមួយ។', courseDescription: 'ស្វែងរកវគ្គសិក្សាជាក់ស្តែង ហើយភ្ជាប់ជាមួយមនុស្សដែលកំពុងរៀនជាមួយអ្នក។', browseCourses: 'មើលវគ្គសិក្សា', public: 'សាធារណៈ', shared: 'បានចែករំលែកក្នុងសហគមន៍ CampusFlow', signInConnect: 'ចូលគណនីដើម្បីភ្ជាប់ទំនាក់ទំនង', emptyTitle: 'ការចែករំលែកបន្ទាប់អាចជារបស់អ្នក។', emptyDescription: 'ចូលរួម CampusFlow ដើម្បីចែករំលែកការរីកចម្រើនក្នុងការរៀនរបស់អ្នក។', createAccount: 'បង្កើតគណនីឥតគិតថ្លៃ', footer: 'ការរៀនជាក់ស្តែង មនុស្សដែលជួយគ្នា និងសហគមន៍ដែលជំរុញអ្នកទៅមុខ។', loading: 'កំពុងផ្ទុកសហគមន៍របស់អ្នក...',
  },
};

export default function CommunityLanding() {
  const { user, authLoading, logout } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const text = copy[language] || copy.en;
  const [feed, setFeed] = useState({ members: [], posts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/api/community')
      .then((response) => { if (active) setFeed(unwrap(response) || { members: [], posts: [] }); })
      .catch(() => { if (active) setError(language === 'km' ? 'ការផ្ទុកសហគមន៍ចំណាយពេលបន្តិច។' : 'The community feed is taking a moment to load.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [language]);

  const communityPath = user ? '/friends' : '/login/student';
  const dashboardPath = user ? roleHome(user.role) : '/courses';
  const displayName = user?.fullName?.split(' ')[0] || '';
  const joinState = !user ? { message: language === 'km' ? 'សូមចូលគណនីដើម្បីចូលរួមសហគមន៍។' : 'Sign in to join the CampusFlow community.', from: '/friends' } : undefined;

  if (loading && !feed.members.length && !feed.posts.length) return <CommunityLoading text={text.loading} />;

  const handleLogout = async () => {
    await logout();
    navigate('/community', { replace: true });
  };

  return <div className="public-community-page">
    <header className="public-community-nav">
      <Link to="/" className="public-community-brand"><span className="public-community-logo"><BrandLogo /></span><span><strong>Campus<span>Flow</span></strong><small>{text.marketplace}</small></span></Link>
      <nav className="public-community-nav-links"><Link to="/courses">{text.courses}</Link><Link to="/community" className="is-active">{text.community}</Link><a href="/courses#about">{text.why}</a><a href="/courses#faq">{text.faq}</a></nav>
      <div className="public-community-nav-actions"><CommunityLanguageSwitch /><ThemeSwitch />{!authLoading && (user ? <><Link to={dashboardPath} className="public-community-nav-button">{text.dashboard}</Link><button type="button" onClick={handleLogout} className="public-community-nav-logout">{text.signOut}</button></> : <><Link to="/login/student" className="public-community-nav-login">{text.login}</Link><Link to="/register" className="public-community-nav-button">{text.register}</Link></>)}</div>
    </header>

    <main>
      <section className="public-community-hero">
        <div className="public-community-hero-glow public-community-hero-glow-one" /><div className="public-community-hero-glow public-community-hero-glow-two" />
        <div className="public-community-hero-copy"><p className="public-community-kicker">{text.heroKicker}</p><h1>{text.heroOne}<br /><span>{text.heroTwo}</span></h1><p>{displayName ? `${displayName}, ` : ''}{text.heroDescription}</p><div className="public-community-hero-actions"><Link to={communityPath} state={joinState} className="public-community-button public-community-button-primary">{user ? text.open : text.join} <span aria-hidden="true">→</span></Link><Link to="/courses#courses" className="public-community-button public-community-button-outline">{text.explore}</Link></div><div className="public-community-proof"><span><strong>{feed.members.length || '—'}</strong> {text.activeMembers}</span><span><strong>{feed.posts.length || '—'}</strong> {text.publicUpdates}</span><span><strong>24h</strong> {text.storyMoments}</span></div></div>
        <div className="public-community-hero-art"><div className="public-community-art-orbit public-community-art-orbit-one" /><div className="public-community-art-orbit public-community-art-orbit-two" /><div className="public-community-art-card"><div className="public-community-art-card-top"><span className="public-community-art-pill">CAMPUSFLOW</span><span>{text.community.toUpperCase()}</span></div><p>{language === 'km' ? <>ជំហានតូចៗ។<br /><strong>ការរីកចម្រើនពិតប្រាកដ។</strong></> : <>Small steps.<br /><strong>Real progress.</strong></>}</p><div className="public-community-art-steps"><span><b>01</b> {language === 'km' ? 'រៀន' : 'Learn'}</span><span><b>02</b> {language === 'km' ? 'ភ្ជាប់' : 'Connect'}</span><span><b>03</b> {language === 'km' ? 'រីកចម្រើន' : 'Grow'}</span></div></div><div className="public-community-floating-card"><span>+ {language === 'km' ? 'ទំនាក់ទំនងថ្មី' : 'New connections'}</span><strong>{language === 'km' ? 'កសាងរង្វង់របស់អ្នក' : 'Build your circle'}</strong><small>{language === 'km' ? 'សិស្ស · អតិថិជន · គ្រូ' : 'Students · Customers · Teachers'}</small></div></div>
      </section>

      <section className="public-community-section public-community-feed-layout"><div className="public-community-feed-column"><div className="public-community-section-heading"><div><p className="public-community-kicker">{text.feedKicker}</p><h2>{text.feedTitle}</h2><p>{text.feedDescription}</p></div><Link to={communityPath} state={joinState} className="public-community-small-link">{user ? text.openCommunity : text.signInToPost} →</Link></div>{error && <div className="public-community-alert">{error}</div>}{loading ? <div className="public-community-loading"><span /><span /><span /></div> : feed.posts.length ? <div className="public-community-post-list">{feed.posts.map((post) => <PublicPost key={post.id} post={post} text={text} />)}</div> : <div className="public-community-empty"><span>+</span><h3>{text.emptyTitle}</h3><p>{text.emptyDescription}</p><Link to="/register" className="public-community-small-link">{text.createAccount} →</Link></div>}</div><aside className="public-community-sidebar"><section className="public-community-side-card public-community-members-card"><div className="public-community-side-heading"><div><p className="public-community-kicker">{text.people}</p><h2>{text.growing}</h2></div><span className="public-community-side-dot" /></div><p>{text.peopleDescription}</p><div className="public-community-member-list">{feed.members.slice(0, 6).map((member) => <Link to={user ? `/profile/${member.id}` : '/login/student'} key={member.id} className="public-community-member"><UserAvatar person={member} size="public-small" /><span><strong>{member.fullName}</strong><small>{member.role}</small></span><span aria-hidden="true">→</span></Link>)}</div>{!loading && !feed.members.length && <p className="public-community-muted">{language === 'km' ? 'សមាជិកថ្មីនឹងបង្ហាញនៅទីនេះ។' : 'New members will appear here soon.'}</p>}<Link to={communityPath} state={joinState} className="public-community-side-link">{text.meet} <span aria-hidden="true">→</span></Link></section><section className="public-community-side-card public-community-course-card"><span className="public-community-side-icon">+</span><p className="public-community-kicker">{text.keepLearning}</p><h2>{text.courseTitle}</h2><p>{text.courseDescription}</p><Link to="/courses#courses" className="public-community-side-link">{text.browseCourses} <span aria-hidden="true">→</span></Link></section></aside></section>
    </main>

    <footer className="public-community-footer"><Link to="/" className="public-community-brand"><span className="public-community-logo"><BrandLogo /></span><span><strong>Campus<span>Flow</span></strong><small>{text.marketplace}</small></span></Link><p>{text.footer}</p><span>© {new Date().getFullYear()} CampusFlow</span></footer>
    <CommunityAiSupport publicMode />
    <TelegramSupport alwaysShow publicMode />
  </div>;
}

function PublicPost({ post, text }) {
  const author = post.author || {};
  return <article className="public-community-post"><div className="public-community-post-header"><div className="public-community-post-author"><UserAvatar person={author} size="public" /><div><strong>{author.fullName || 'CampusFlow member'}</strong><span>{author.role || 'Community member'} · {new Date(post.createdAt).toLocaleDateString()}</span></div></div><span className="public-community-post-badge">{text.public}</span></div><p className="public-community-post-content">{post.content}</p>{post.imageUrl && <img src={mediaUrl(post.imageUrl)} alt="Community update" className="public-community-post-image" />}<div className="public-community-post-footer"><span>{text.shared}</span><Link to="/login/student">{text.signInConnect} →</Link></div></article>;
}

function CommunityLoading({ text }) {
  return <main className="public-community-loading-screen" aria-live="polite" aria-busy="true"><div className="public-community-loader-card"><div className="public-community-loader-orbit"><span className="public-community-loader-logo"><BrandLogo /></span></div><p className="public-community-kicker">CAMPUSFLOW COMMUNITY</p><h1>{text}</h1><div className="public-community-loader-progress"><span /></div><div className="public-community-loader-dots" aria-hidden="true"><span /><span /><span /></div></div></main>;
}
