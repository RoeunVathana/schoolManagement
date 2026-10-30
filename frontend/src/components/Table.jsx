import { useEffect, useMemo, useState } from 'react';
import Pagination from './Pagination';

export default function Table({ columns = [], rows = [], empty = 'No records found.', pageSize = 10 }) {
  const [page, setPage] = useState(1);
  const safeRows = Array.isArray(rows) ? rows : [];
  const totalPages = Math.ceil(safeRows.length / pageSize);
  const currentPage = Math.min(page, Math.max(totalPages, 1));

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
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-950/40 dark:text-slate-400"><tr>{columns.map((column) => <th key={column.key} className={`whitespace-nowrap px-5 py-4 font-extrabold ${column.headerClassName || ''}`}>{column.label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibleRows.length ? visibleRows.map((row, index) => <tr key={row.id || index} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">{columns.map((column) => <td key={column.key} className={`max-w-[22rem] px-5 py-4 text-slate-700 dark:text-slate-200 ${column.className || ''}`}>{column.render ? column.render(row) : row[column.key] ?? '-'}</td>)}</tr>) : <tr><td colSpan={columns.length || 1} className="px-5 py-12 text-center text-slate-400">{empty}</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="table-mobile-view p-3">
        {visibleRows.length ? visibleRows.map((row, index) => <article key={row.id || index} className="table-mobile-record rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/45">
          {columns.map((column) => <div key={column.key} className="table-mobile-field">
            <span className="table-mobile-label">{column.label}</span>
            <div className={`table-mobile-value ${column.key === 'actions' ? 'table-mobile-actions' : ''}`}>{column.render ? column.render(row) : row[column.key] ?? '-'}</div>
          </div>)}
        </article>) : <div className="px-4 py-12 text-center text-sm text-slate-400">{empty}</div>}
      </div>
    </div>
    <Pagination value={totalPages > 1 ? { page: currentPage, limit: pageSize, total: safeRows.length, totalPages } : null} onChange={setPage} />
  </>;
}
