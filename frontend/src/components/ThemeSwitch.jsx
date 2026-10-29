import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function ThemeSwitch() {
  const { isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const label = isDark ? t('light') : t('dark');

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-navy hover:text-navy dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:border-mint dark:hover:text-mint"
    >
      <span aria-hidden="true" className="text-sm">{isDark ? '☀️' : '🌙'}</span>
      <span className="theme-switch-label">{label}</span>
    </button>
  );
}
