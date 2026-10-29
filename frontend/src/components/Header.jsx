import { useLanguage } from '../context/LanguageContext';

export default function Header({ eyebrow, title, description, action }) {
  const { t } = useLanguage();

  return <div className="page-header animate-fade-up mb-7 flex flex-col justify-between gap-5 sm:mb-8 lg:flex-row lg:items-end">
    <div className="min-w-0">
      <p className="mb-2 text-[10px] font-black uppercase tracking-[.24em] text-coral sm:text-xs">{t(eyebrow || 'CampusFlow')}</p>
      <h1 className="break-words text-2xl font-extrabold tracking-tight text-ink sm:text-3xl lg:text-4xl">{t(title)}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{t(description)}</p>}
    </div>
    {action && <div className="page-header-action flex w-full shrink-0 flex-wrap gap-2 sm:w-auto">{action}</div>}
  </div>;
}
