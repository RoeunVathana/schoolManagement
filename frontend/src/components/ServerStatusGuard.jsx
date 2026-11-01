import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';

const HEALTH_CHECK_TIMEOUT = 5000;
const HEALTHY_POLL_INTERVAL = 30000;
const BUSY_RETRY_INTERVAL = 5000;

function isMonitoringEnabled() {
  return import.meta.env.PROD || import.meta.env.VITE_ENABLE_SERVER_STATUS === 'true';
}

export default function ServerStatusGuard({ children }) {
  const [serverBusy, setServerBusy] = useState(false);
  const serverBusyRef = useRef(false);
  const timerRef = useRef(null);
  const checkingRef = useRef(false);

  const setBusy = useCallback((busy) => {
    serverBusyRef.current = busy;
    setServerBusy(busy);
  }, []);

  const checkServer = useCallback(async () => {
    if (checkingRef.current) return !serverBusyRef.current;

    checkingRef.current = true;
    try {
      await api.get('/health', { timeout: HEALTH_CHECK_TIMEOUT });
      setBusy(false);
      return true;
    } catch {
      setBusy(true);
      return false;
    } finally {
      checkingRef.current = false;
    }
  }, [setBusy]);

  useEffect(() => {
    if (!isMonitoringEnabled()) return undefined;

    let stopped = false;

    const scheduleCheck = () => {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(async () => {
        if (stopped) return;
        await checkServer();
        if (!stopped) scheduleCheck();
      }, serverBusyRef.current ? BUSY_RETRY_INTERVAL : HEALTHY_POLL_INTERVAL);
    };

    const handleServerBusy = () => {
      // A single page request can return 502/503/504 while the API health
      // endpoint is still available. Confirm the service itself is down
      // before covering the whole application with the busy screen.
      checkServer().finally(() => {
        if (!stopped) scheduleCheck();
      });
    };

    window.addEventListener('campusflow:server-busy', handleServerBusy);
    checkServer().then(() => {
      if (!stopped) scheduleCheck();
    });

    return () => {
      stopped = true;
      window.removeEventListener('campusflow:server-busy', handleServerBusy);
      window.clearTimeout(timerRef.current);
    };
  }, [checkServer, setBusy]);

  if (!serverBusy) return children;

  return (
    <>
      {children}
      <div className="fixed inset-0 z-[300] flex min-h-screen items-center justify-center bg-slate-950/70 p-5 backdrop-blur-md" role="alert" aria-live="assertive">
        <div className="w-full max-w-md rounded-[1.75rem] border border-white/15 bg-[#111827]/95 p-8 text-center text-white shadow-2xl shadow-black/40">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d9fff1] via-white to-[#dcecff] shadow-lg">
            <span className="h-7 w-7 animate-spin rounded-full border-4 border-[#229ed9]/25 border-t-[#229ed9]" aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-xl font-extrabold">Server is busy updating</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            We are applying an update or restarting the API. Your data is safe. Please wait a moment.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#8de4ca]">
            Retrying automatically…
          </p>
          <button
            type="button"
            onClick={checkServer}
            className="mt-6 rounded-xl bg-[#229ed9] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#1688bf] focus:outline-none focus:ring-2 focus:ring-[#8de4ca] focus:ring-offset-2 focus:ring-offset-[#111827]"
          >
            Retry now
          </button>
        </div>
      </div>
    </>
  );
}
