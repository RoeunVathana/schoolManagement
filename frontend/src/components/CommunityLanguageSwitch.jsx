import { useLanguage } from '../context/LanguageContext';

export default function CommunityLanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  return <div className="community-language-switch" role="group" aria-label="Language">
    <button type="button" onClick={() => setLanguage('en')} className={language === 'en' ? 'is-active' : ''} aria-pressed={language === 'en'}>EN</button>
    <button type="button" onClick={() => setLanguage('km')} className={language === 'km' ? 'is-active' : ''} aria-pressed={language === 'km'}>ខ្មែរ</button>
  </div>;
}
