import { useLanguage } from '../context/LanguageContext';
import BrandLogo from './BrandLogo';

export default function Loading({ label, fullScreen = false }) {
  const { t } = useLanguage();
  const message = label || t('loading');
  const content = <div className="loading-card flex w-full max-w-xs flex-col items-center justify-center rounded-[1.75rem] border border-white/70 bg-white/90 px-7 py-8 text-center shadow-[0_24px_70px_rgba(16,36,63,.16)] backdrop-blur-xl dark:border-slate-700 dark:bg-[#101c30]/95 dark:shadow-black/40" role="status" aria-live="polite" aria-label={message}>
    <div className="loading-logo-wrap relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#cdece1] bg-gradient-to-br from-[#d9fff1] via-white to-[#dcecff] p-2 shadow-lg dark:border-[#2d5570] dark:from-[#173f4f] dark:via-[#14263d] dark:to-[#1c2f4b]">
      <span className="loading-orbit absolute inset-[-.45rem] rounded-[1.35rem] border border-[#229ed9]/25" />
      <BrandLogo className="rounded-xl" />
    </div>
    <p className="mt-5 text-sm font-extrabold text-ink dark:text-white">{message}</p>
    <div className="mt-4 h-1.5 w-40 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="loading-progress h-full w-1/2 rounded-full bg-gradient-to-r from-[#229ed9] via-[#8de4ca] to-[#f47b67]" /></div>
    <div className="mt-4 flex items-center gap-1.5" aria-hidden="true"><span className="loading-dot h-1.5 w-1.5 rounded-full bg-[#229ed9]" /><span className="loading-dot loading-dot-delay-1 h-1.5 w-1.5 rounded-full bg-[#8de4ca]" /><span className="loading-dot loading-dot-delay-2 h-1.5 w-1.5 rounded-full bg-[#f47b67]" /></div>
  </div>;

  if (fullScreen) return <div className="loading-screen fixed inset-0 z-[200] flex min-h-screen items-center justify-center bg-slate-950/55 p-5 backdrop-blur-md">{content}</div>;
  return <div className="loading-screen flex min-h-[calc(100dvh-4.25rem)] w-full items-center justify-center px-4 py-10 text-sm text-slate-500">{content}</div>;
}
