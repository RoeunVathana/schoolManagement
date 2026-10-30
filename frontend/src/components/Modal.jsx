import { createPortal } from 'react-dom';

export default function Modal({ open, title, children, onClose, fullScreen = false, className = '' }) {
  if (!open) return null;

  return createPortal(
    <div
      className="modal-overlay fixed inset-0 z-[210] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-2 backdrop-blur-md sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        className={`modal-panel flex w-full flex-col overflow-hidden rounded-[1.35rem] border border-white/70 bg-white shadow-2xl shadow-slate-950/30 ${fullScreen ? 'modal-panel-fullscreen h-[calc(100dvh-1rem)] max-h-none max-w-6xl rounded-2xl sm:h-[calc(100dvh-2rem)] sm:rounded-[2rem]' : 'max-h-[calc(100dvh-1rem)] max-w-3xl sm:max-h-[calc(100dvh-2.5rem)]'} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="modal-header flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-7 sm:py-5">
          <h2 className="min-w-0 break-words text-lg font-extrabold leading-tight text-ink sm:text-xl">{title}</h2>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="modal-close inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-2xl leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-navy/10">×</button>
        </header>
        <div className={`modal-body min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-7 sm:py-6 ${fullScreen ? 'modal-body-fullscreen' : ''}`}>
          {children}
        </div>
      </section>
    </div>,
    document.body,
  );
}
