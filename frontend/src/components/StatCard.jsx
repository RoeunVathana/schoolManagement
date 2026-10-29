export default function StatCard({ label, value, accent = 'bg-mint', note, trend, icon }) {
  return <article className="group relative overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_rgba(16,36,63,.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(16,36,63,.12)] dark:border-slate-700/80 dark:bg-[#121f35]">
    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-slate-100/80 blur-2xl transition group-hover:scale-125 dark:bg-white/5" />
    <div className="relative flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${accent}`} /><p className="truncate text-xs font-extrabold uppercase tracking-[.12em] text-slate-500 dark:text-slate-400">{label}</p></div>
        <p className="mt-4 text-3xl font-extrabold tracking-tight text-ink dark:text-white">{value ?? '—'}</p>
        {note && <p className="mt-2 truncate text-xs font-medium text-slate-400 dark:text-slate-500">{note}</p>}
      </div>
      {icon && <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 ring-1 ring-slate-200/80 dark:bg-slate-800/80 dark:text-slate-300 dark:ring-slate-700">{icon}</span>}
    </div>
    {trend && <div className="relative mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{trend}</div>}
  </article>;
}
