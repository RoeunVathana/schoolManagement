import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const loadingStages = ['Connecting securely', 'Preparing your workspace', 'Syncing your data'];

export default function Loading({ label, fullScreen = false }) {
  const { t } = useLanguage();
  const message = label || t('loading');
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStage((current) => (current + 1) % loadingStages.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, []);

  const content = <div className="loading-content" role="status" aria-live="polite" aria-busy="true" aria-label={message}>
    <div className="loading-kicker"><span className="loading-kicker-dot" /> CAMPUSFLOW <span className="loading-kicker-divider">/</span> WORKSPACE</div>
    <div className="loading-spinner-shell" aria-hidden="true">
      <span className="loading-spinner-pulse" />
      <span className="loading-spinner-orbit" />
      <span className="loading-spinner-ring" />
      <span className="loading-spinner-tick loading-spinner-tick-one" />
      <span className="loading-spinner-tick loading-spinner-tick-two" />
      <span className="loading-spinner-core" />
    </div>
    <div className="loading-copy">
      <p className="loading-title">{message}</p>
      <p className="loading-subtitle">Preparing your workspace</p>
      <div className="loading-progress" aria-hidden="true"><span /></div>
    </div>
    <div className="loading-status"><span className="loading-status-line" /><span className="loading-status-label" key={loadingStages[stage]}>{loadingStages[stage]}</span><span className="loading-dots" aria-hidden="true"><span /><span /><span /></span></div>
  </div>;

  if (fullScreen) return <div className="loading-screen fixed inset-0 z-[200] flex min-h-screen items-center justify-center bg-slate-950/45 p-6 backdrop-blur-md"><div className="loading-panel">{content}</div></div>;
  return <div className="loading-screen flex min-h-40 w-full items-center justify-center px-4 py-10 text-sm text-slate-500"><div className="loading-panel loading-panel-inline">{content}</div></div>;
}
