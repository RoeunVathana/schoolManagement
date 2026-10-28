import { createContext, useContext, useState } from 'react';
import { useLanguage } from './LanguageContext';

const ConfirmContext = createContext(null);

function ConfirmDialog({ request, onClose }) {
  const { t } = useLanguage();

  return (
    <div className="confirm-overlay" role="presentation">
      <section
        className="confirm-panel w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
        aria-describedby="delete-confirm-message"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6m-9 4h12m-1 0-.7 12.1A2 2 0 0 1 14.3 21H9.7a2 2 0 0 1-2-1.9L7 7m3 4v6m4-6v6" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="delete-confirm-title" className="text-xl font-bold text-slate-900 dark:text-white">{t('delete')}?</h2>
            <p id="delete-confirm-message" className="mt-2 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">{request.message}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => onClose(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            {t('cancel')}
          </button>
          <button type="button" autoFocus onClick={() => onClose(true)} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:-translate-y-0.5 hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/20">
            {t('delete')}
          </button>
        </div>
      </section>
    </div>
  );
}

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);

  const ask = (message) => new Promise((resolve) => {
    setRequest({ message: String(message || ''), resolve });
  });

  const close = (confirmed) => {
    if (!request) return;
    request.resolve(confirmed);
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={{ ask }}>
      {children}
      {request && <ConfirmDialog request={request} onClose={close} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirmDialog must be used inside ConfirmProvider');
  return context;
}
