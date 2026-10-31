import { useEffect, useMemo, useState } from 'react';
import Pagination from './Pagination';
import Modal from './Modal';
import { useLanguage } from '../context/LanguageContext';

const sensitiveKeys = new Set(['password', 'refreshToken', 'accessToken', 'botToken', 'apiKey', 'secret']);
const technicalKeys = new Set(['id', 'userId', 'studentId', 'teacherId', 'courseId', 'assignmentId', 'conversationId', 'groupId', 'submissionId', 'createdBy', 'updatedBy', 'createdAt', 'updatedAt']);

const labelFor = (key) => String(key || '')
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const isObject = (value) => value !== null && typeof value === 'object';

function DetailValue({ value, depth = 0, language = 'en' }) {
  if (value === null || value === undefined || value === '') return <span className="text-slate-400">-</span>;
  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-slate-400">-</span>;
    return <div className="max-h-64 space-y-2 overflow-y-auto pr-1">{value.map((item, index) => <div key={`${index}-${typeof item === 'object' ? item?.id || 'item' : String(item)}`} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/60"><p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">#{index + 1}</p>{isObject(item) ? <DetailGrid value={item} depth={depth + 1} language={language} /> : <DetailValue value={item} depth={depth + 1} language={language} />}</div>)}</div>;
  }
  if (isObject(value)) return <DetailGrid value={value} depth={depth} language={language} />;
  if (typeof value === 'boolean') return <span>{value ? (language === 'km' ? 'បាទ/ចាស' : 'Yes') : (language === 'km' ? 'ទេ' : 'No')}</span>;
  return <span className="break-words">{String(value)}</span>;
}

function DetailGrid({ value, depth = 0, language = 'en' }) {
  const entries = Object.entries(value || {}).filter(([key]) => !sensitiveKeys.has(key) && !technicalKeys.has(key));
  if (!entries.length) return <span className="text-slate-400">-</span>;
  return <dl className={`grid gap-3 ${depth === 0 ? 'sm:grid-cols-2' : ''}`}>{entries.map(([key, item]) => <div key={key} className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/70"><dt className="text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400">{labelFor(key)}</dt><dd className="mt-1.5 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200"><DetailValue value={item} depth={depth + 1} language={language} /></dd></div>)}</dl>;
}

export default function Table({ columns = [], rows = [], empty = 'No records found.', pageSize = 10, showDetails = true }) {
  const { language, t } = useLanguage();
  const [selectedRow, setSelectedRow] = useState(null);
  const [page, setPage] = useState(1);
  const safeRows = Array.isArray(rows) ? rows : [];
  const totalPages = Math.ceil(safeRows.length / pageSize);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const tableColumns = useMemo(() => {
    if (!showDetails) return columns;
    return [...columns, {
      key: '__details',
      label: t('viewDetails'),
      className: 'whitespace-nowrap',
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedRow(row)}
          className="inline-flex items-center rounded-lg bg-[#e8f7f2] px-3 py-2 text-xs font-extrabold text-emerald-800 transition hover:-translate-y-0.5 hover:bg-[#c9f1e3] focus:outline-none focus:ring-4 focus:ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/70"
          aria-label={`${t('viewDetails')}: ${row?.id || ''}`}
        >
          {t('viewDetails')}
        </button>
      ),
    }];
  }, [columns, showDetails, t]);

  useEffect(() => {
    setPage(1);
  }, [rows]);

  const visibleRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return safeRows.slice(start, start + pageSize);
  }, [currentPage, pageSize, safeRows]);

  return <>
    <div className="table-card overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-[#111c30]">
      <div className="table-desktop-view table-scroll overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-950/40 dark:text-slate-400"><tr>{tableColumns.map((column) => <th key={column.key} className={`whitespace-nowrap px-5 py-4 font-extrabold ${column.headerClassName || ''}`}>{column.label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibleRows.length ? visibleRows.map((row, index) => <tr key={row.id || index} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">{tableColumns.map((column) => <td key={column.key} className={`max-w-[22rem] px-5 py-4 text-slate-700 dark:text-slate-200 ${column.className || ''}`}>{column.render ? column.render(row) : row[column.key] ?? '-'}</td>)}</tr>) : <tr><td colSpan={tableColumns.length || 1} className="px-5 py-12 text-center text-slate-400">{empty}</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="table-mobile-view p-3">
        {visibleRows.length ? visibleRows.map((row, index) => <article key={row.id || index} className="table-mobile-record rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/45">
          {tableColumns.map((column) => <div key={column.key} className="table-mobile-field">
            <span className="table-mobile-label">{column.label}</span>
            <div className={`table-mobile-value ${column.key === 'actions' ? 'table-mobile-actions' : ''}`}>{column.render ? column.render(row) : row[column.key] ?? '-'}</div>
          </div>)}
        </article>) : <div className="px-4 py-12 text-center text-sm text-slate-400">{empty}</div>}
      </div>
    </div>
    <Pagination value={totalPages > 1 ? { page: currentPage, limit: pageSize, total: safeRows.length, totalPages } : null} onChange={setPage} />
    <Modal open={!!selectedRow} title={t('viewDetails')} onClose={() => setSelectedRow(null)} className="max-w-4xl">
      {selectedRow && <div className="space-y-5"><div className="relative overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#10243f] via-[#164d68] to-[#2e8f79] p-5 text-white shadow-lg sm:p-6"><div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10 blur-2xl" /><div className="relative"><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#a5f1dc]">{language === 'km' ? 'ព័ត៌មានកំណត់ត្រា' : 'Record details'}</p><h3 className="mt-2 break-words text-xl font-extrabold sm:text-2xl">{selectedRow.fullName || selectedRow.title || selectedRow.courseName || selectedRow.name || t('viewDetails')}</h3><div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold"><span className="rounded-full bg-white/15 px-3 py-1.5">{Object.keys(selectedRow).filter((key) => !sensitiveKeys.has(key) && !technicalKeys.has(key)).length} {language === 'km' ? 'ព័ត៌មាន' : 'visible fields'}</span>{selectedRow.role && <span className="rounded-full bg-[#a5f1dc] px-3 py-1.5 text-[#10243f]">{selectedRow.role}</span>}{selectedRow.status && <span className="rounded-full bg-white/15 px-3 py-1.5">{selectedRow.status}</span>}</div></div></div><div><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-coral">{language === 'km' ? 'ព័ត៌មានសំខាន់' : 'Key information'}</p><span className="text-[11px] font-semibold text-slate-400">{language === 'km' ? 'បង្ហាញព័ត៌មានដែលមានប្រយោជន៍' : 'Useful information only'}</span></div><DetailGrid value={selectedRow} language={language} /></div><div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-700"><button type="button" onClick={() => setSelectedRow(null)} className="rounded-xl bg-[#10243f] px-4 py-2.5 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#1c4e6b] focus:outline-none focus:ring-4 focus:ring-navy/15 dark:bg-[#229ed9] dark:hover:bg-[#168dcc]">{t('cancel')}</button></div></div>}
    </Modal>
  </>;
}
