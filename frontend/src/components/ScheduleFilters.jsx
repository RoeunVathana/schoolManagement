import { useLanguage } from '../context/LanguageContext';

const toMinutes = (value) => {
  if (!value) return null;
  const [hours, minutes] = String(value).split(':').map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
};

export function filterScheduleRows(rows, filters) {
  const from = toMinutes(filters?.from || '');
  const to = toMinutes(filters?.to || '');
  if (from === null && to === null) return rows;
  if (from !== null && to !== null && from > to) return [];
  return rows.filter((row) => {
    const start = toMinutes(row.startTime);
    const end = toMinutes(row.endTime) ?? start;
    if (start === null) return false;
    return (from === null || end >= from) && (to === null || start <= to);
  });
}

export default function ScheduleFilters({ value, onChange }) {
  const { t } = useLanguage();
  const hasFilter = Boolean(value?.from || value?.to);
  return <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
    <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-sm font-extrabold text-ink dark:text-white">Filter by time</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Show classes that overlap the selected time range.</p></div><button type="button" disabled={!hasFilter} onClick={() => onChange({ from: '', to: '' })} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-navy disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-mint">Clear</button></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('startTime')}<input type="time" value={value?.from || ''} onChange={(event) => onChange({ ...value, from: event.target.value })} className="input mt-2" /></label><label className="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('endTime')}<input type="time" value={value?.to || ''} onChange={(event) => onChange({ ...value, to: event.target.value })} className="input mt-2" /></label></div>
  </div>;
}
