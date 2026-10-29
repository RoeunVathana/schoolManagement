export default function Pagination({ value, onChange }) {
  if (!value || value.totalPages <= 1) return null;

  return <nav className="pagination-shell mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500" aria-label="Pagination">
    <span className="pagination-count rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold dark:bg-slate-800 dark:text-slate-300">{value.total} records</span>
    <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
      <button type="button" disabled={value.page <= 1} onClick={() => onChange(value.page - 1)} className="pagination-button rounded-lg px-3 py-1.5 text-xs font-bold transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800" aria-label="Previous page">Previous</button>
      <span className="min-w-16 px-2 text-center text-xs font-extrabold text-ink dark:text-white">{value.page} / {value.totalPages}</span>
      <button type="button" disabled={value.page >= value.totalPages} onClick={() => onChange(value.page + 1)} className="pagination-button rounded-lg px-3 py-1.5 text-xs font-bold transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800" aria-label="Next page">Next</button>
    </div>
  </nav>;
}
