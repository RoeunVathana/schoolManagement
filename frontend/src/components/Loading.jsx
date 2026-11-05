import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function Loading({ label, fullScreen = false, inline = false }) {
  const { t } = useLanguage();
  const message = label || t('loading');
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    if (!fullScreen) return undefined;
    const timer = window.setTimeout(() => setShowRecovery(true), 8000);
    return () => window.clearTimeout(timer);
  }, [fullScreen]);

  const content = <div className="loading-content" role="status" aria-live="polite" aria-busy="true" aria-label={message}>
    <div className="loading-spinner-shell" aria-hidden="true">
      <span className="loading-spinner-pulse" />
      <span className="loading-spinner-orbit" />
      <span className="loading-spinner-ring" />
      <span className="loading-spinner-tick loading-spinner-tick-one" />
      <span className="loading-spinner-tick loading-spinner-tick-two" />
      <span className="loading-spinner-core" />
    </div>
    {showRecovery && <div className="mt-4 text-center">
      <p className="text-xs font-semibold text-slate-300">This is taking longer than expected.</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-3 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-white/20">
        Reload page
      </button>
    </div>}
  </div>;

  if (fullScreen) return <div className="loading-screen fixed inset-0 z-[200] flex min-h-screen items-center justify-center bg-slate-950/45 p-6 backdrop-blur-md"><div className="loading-panel">{content}</div></div>;
  return <div className={`loading-screen ${inline ? 'loading-screen-inline' : 'loading-screen-page'} flex w-full items-center justify-center px-4 py-10 text-sm text-slate-500`}><div className="loading-panel loading-panel-inline">{content}</div></div>;
}
