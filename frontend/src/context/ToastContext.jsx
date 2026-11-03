import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLanguage } from './LanguageContext';

const ToastContext = createContext(null);

function fallbackMessage(kind, language) {
  const messages = {
    en: { create: 'Created successfully.', update: 'Updated successfully.', delete: 'Deleted successfully.' },
    km: { create: 'បានបង្កើតដោយជោគជ័យ។', update: 'បានកែប្រែដោយជោគជ័យ។', delete: 'បានលុបដោយជោគជ័យ។' },
  };
  return messages[language]?.[kind] || messages.en[kind] || messages.en.update;
}

export function notifyToast(message, type = 'success', kind = 'update') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('campusflow:toast', { detail: { message, type, kind } }));
}

export function ToastProvider({ children }) {
  const { language } = useLanguage();
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((detail = {}) => {
    const type = detail.type || 'success';
    const kind = detail.kind || 'update';
    const message = String(detail.message || fallbackMessage(kind, language));
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((current) => [...current.slice(-3), { id, type, message }]);
    window.setTimeout(() => dismiss(id), detail.duration || 3600);
  }, [dismiss, language]);

  useEffect(() => {
    const handleToast = (event) => push(event.detail || {});
    window.addEventListener('campusflow:toast', handleToast);
    return () => window.removeEventListener('campusflow:toast', handleToast);
  }, [push]);

  return <ToastContext.Provider value={{ push, dismiss }}>
    {children}
    <div className="campusflow-toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => <div key={toast.id} className={`campusflow-toast campusflow-toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
        <span className="campusflow-toast-icon" aria-hidden="true">{toast.type === 'error' ? '!' : '✓'}</span>
        <span className="campusflow-toast-message">{toast.message}</span>
        <button type="button" className="campusflow-toast-close" onClick={() => dismiss(toast.id)} aria-label="Close notification">×</button>
      </div>)}
    </div>
  </ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
