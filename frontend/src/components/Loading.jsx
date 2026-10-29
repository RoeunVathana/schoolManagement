import { useLanguage } from '../context/LanguageContext';
export default function Loading({ label, fullScreen = false }) {
  const { t } = useLanguage();
  const message = label || t('loading');
  const content = <div className="flex flex-col items-center justify-center gap-4 text-center" role="status" aria-live="polite" aria-label={message}>
    <div className="relative flex h-16 w-16 items-center justify-center">
      <span className="absolute inset-0 animate-ping rounded-full bg-coral/20" />
      <span className="absolute inset-1 rounded-full border-2 border-slate-200 border-t-coral shadow-lg shadow-coral/10 animate-spin dark:border-slate-600 dark:border-t-mint" />
      <span className="relative h-5 w-5 rounded-full bg-gradient-to-br from-coral via-[#f49b7f] to-mint shadow-[0_0_22px_rgba(244,123,103,.45)]" />
    </div>
    <div>
      <p className="font-semibold text-ink dark:text-white">{message}</p>
      <div className="mx-auto mt-3 h-1.5 w-36 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className="h-full w-1/2 animate-shimmer rounded-full bg-gradient-to-r from-transparent via-coral to-transparent" />
      </div>
    </div>
  </div>;

  if (fullScreen) return <div className="fixed inset-0 z-[200] flex min-h-screen items-center justify-center bg-slate-950/45 p-6 backdrop-blur-md"><div className="w-full max-w-xs rounded-[2rem] border border-white/70 bg-white/95 px-8 py-9 shadow-2xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-black/40">{content}</div></div>;
  return <div className="flex min-h-[calc(100dvh-7rem)] w-full items-center justify-center px-4 py-10 text-sm text-slate-500">{content}</div>;
}
