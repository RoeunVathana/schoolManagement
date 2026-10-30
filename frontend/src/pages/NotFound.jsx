import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import BrandLogo from '../components/BrandLogo';

const copy = {
  en: {
    eyebrow: 'CampusFlow',
    title: 'Page not found',
    description: 'The page you are looking for does not exist or may have moved.',
    home: 'Go to home',
    courses: 'Browse courses',
    community: 'Open community',
    back: 'Go back',
  },
  km: {
    eyebrow: 'CampusFlow',
    title: 'រកមិនឃើញទំព័រ',
    description: 'ទំព័រដែលអ្នកកំពុងស្វែងរកមិនមាន ឬអាចត្រូវបានផ្លាស់ទី។',
    home: 'ទៅទំព័រដើម',
    courses: 'មើលវគ្គសិក្សា',
    community: 'បើកសហគមន៍',
    back: 'ត្រឡប់ក្រោយ',
  },
};

export default function NotFound() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const text = copy[language] || copy.en;

  return <main className="not-found-page">
    <div className="not-found-glow not-found-glow-one" />
    <div className="not-found-glow not-found-glow-two" />
    <section className="not-found-card" aria-labelledby="not-found-title">
      <div className="not-found-brand"><BrandLogo /><span>{text.eyebrow}</span></div>
      <p className="not-found-code">404</p>
      <h1 id="not-found-title">{text.title}</h1>
      <p className="not-found-description">{text.description}</p>
      <div className="not-found-actions">
        <Link to="/" className="not-found-button not-found-button-primary">{text.home}</Link>
        <Link to="/courses" className="not-found-button not-found-button-soft">{text.courses}</Link>
        <Link to="/community" className="not-found-button not-found-button-soft">{text.community}</Link>
      </div>
      <button type="button" onClick={() => navigate(-1)} className="not-found-back">← {text.back}</button>
    </section>
  </main>;
}
