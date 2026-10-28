export default function Modal({ open, title, children, onClose, fullScreen = false }) {
  if (!open) return null;

  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-md sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        className={`modal-panel flex w-full flex-col overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-2xl shadow-slate-950/30 ${fullScreen ? 'modal-panel-fullscreen h-[calc(100vh-1rem)] max-h-none max-w-6xl rounded-2xl sm:h-[calc(100vh-2rem)] sm:rounded-[2rem]' : 'max-h-[calc(100vh-1.5rem)] max-w-3xl sm:max-h-[calc(100vh-2.5rem)]'}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="modal-header flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7 sm:py-5">
          <h2 className="min-w-0 text-lg font-extrabold leading-tight text-ink sm:text-xl">{title}</h2>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="modal-close inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-2xl leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-navy/10"
          >
            ×
          </button>
        </header>
        <div className={`modal-body min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6 ${fullScreen ? 'modal-body-fullscreen' : ''}`}>
          {children}
        </div>
      </section>
    </div>
  );
}
