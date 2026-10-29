import { useEffect, useMemo, useState } from 'react';
import Pagination from './Pagination';

export default function Table({ columns, rows, empty = 'No records found.', pageSize = 10 }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(rows.length / pageSize);
  const currentPage = Math.min(page, Math.max(totalPages, 1));

  useEffect(() => {
    setPage(1);
  }, [rows]);

  const visibleRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [currentPage, pageSize, rows]);

  return <>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="table-scroll overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{columns.map((column) => <th key={column.key} className="px-5 py-4 font-semibold">{column.label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.length ? visibleRows.map((row, index) => <tr key={row.id || index} className="hover:bg-slate-50">{columns.map((column) => <td key={column.key} className="whitespace-nowrap px-5 py-4 text-slate-700">{column.render ? column.render(row) : row[column.key] ?? '-'}</td>)}</tr>) : <tr><td colSpan={columns.length} className="px-5 py-12 text-center text-slate-400">{empty}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
    <Pagination value={totalPages > 1 ? { page: currentPage, limit: pageSize, total: rows.length, totalPages } : null} onChange={setPage} />
  </>;
}
