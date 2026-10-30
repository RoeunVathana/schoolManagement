import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';

const flags = {
  en: { src: 'https://flagcdn.com/w40/gb.png', alt: 'United Kingdom', label: 'English', short: 'EN' },
  km: { src: 'https://flagcdn.com/w40/kh.png', alt: 'Cambodia', label: 'ខ្មែរ', short: 'KH' },
};

export default function LanguageSwitcher({ variant = 'dashboard' }) {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const selected = flags[language] || flags.en;

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-language-switcher]')) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const choose = async (next) => {
    setLanguage(next);
    setOpen(false);
    if (user?.id) await api.patch('/auth/profile', { language: next }).catch(() => undefined);
  };

  return <div className={`language-switcher language-switcher-${variant}`} data-language-switcher="" data-dashboard-language={variant === 'dashboard' ? '' : undefined}>
    <button type="button" onClick={() => setOpen((current) => !current)} className="language-switcher-trigger" aria-haspopup="menu" aria-expanded={open} aria-label={t('language')} title={t('language')}>
      <span className="language-switcher-flag" aria-hidden="true"><img src={selected.src} alt="" /></span>
      <span className="language-switcher-current">{selected.label}</span>
      <span className={`language-switcher-chevron ${open ? 'is-open' : ''}`} aria-hidden="true">⌄</span>
    </button>
    {open && <div className="language-switcher-menu" role="menu">
      <div className="language-switcher-menu-heading"><span>{t('language')}</span><b>{selected.short}</b></div>
      {Object.entries(flags).map(([key, option]) => <button type="button" key={key} role="menuitemradio" aria-checked={language === key} onClick={() => choose(key)} className={`language-switcher-option ${language === key ? 'is-selected' : ''}`}>
        <span className="language-switcher-option-flag"><img src={option.src} alt={option.alt} /></span><span>{option.label}</span>{language === key && <span className="language-switcher-check" aria-hidden="true">✓</span>}
      </button>)}
    </div>}
  </div>;
}
