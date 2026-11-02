import { useEffect, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import Table from '../../components/Table';
import { useConfirmDialog } from '../../context/ConfirmContext';

const statuses = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM'];

const statusClass = {
  NEW: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
  IN_PROGRESS: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200',
  RESOLVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
  SPAM: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200',
};

const statusLabel = (status) => String(status || '').replace('_', ' ');

export default function ContactMessages() {
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [draftStatus, setDraftStatus] = useState('NEW');
  const [draftNote, setDraftNote] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const { ask } = useConfirmDialog();

  const load = (targetPage = page, filters = {}) => {
    setError('');
    return api.get('/contact/admin', {
      params: {
        page: targetPage,
        limit: 10,
        search: filters.search ?? search,
        status: filters.status ?? status,
      },
    }).then((response) => setResult(unwrap(response))).catch((requestError) => {
      setError(requestError.response?.data?.message || 'Could not load contact messages.');
    });
  };

  useEffect(() => {
    load(page);
  }, [page]);

  const runSearch = () => {
    setPage(1);
    load(1);
  };

  const filterByStatus = (value) => {
    setStatus(value);
    setPage(1);
    load(1, { status: value });
  };

  const openMessage = (message) => {
    setSelected(message);
    setDraftStatus(message.status || 'NEW');
    setDraftNote(message.adminNote || '');
  };

  const saveMessage = async () => {
    if (!selected) return;
    setBusy(selected.id);
    setError('');
    try {
      const response = await api.patch(`/contact/admin/${selected.id}`, {
        status: draftStatus,
        adminNote: draftNote,
      });
      const updated = unwrap(response);
      setSelected(updated);
      setNotice('Contact message updated.');
      await load(page);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update this message.');
    } finally {
      setBusy('');
    }
  };

  const removeMessage = async (message) => {
    if (!await ask(`Delete the message from ${message.fullName}?`)) return;
    setBusy(message.id);
    setError('');
    try {
      await api.delete(`/contact/admin/${message.id}`);
      if (selected?.id === message.id) setSelected(null);
      setNotice('Contact message deleted.');
      await load(page);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not delete this message.');
    } finally {
      setBusy('');
    }
  };

  const rows = result?.data || [];

  return <>
    <Header eyebrow="Administration" title="Contact messages" description="Review messages sent from the public Contact page, track follow-up status, and keep internal notes for your team." />
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-[#111c30] sm:flex-row sm:items-center">
      <input className="input min-w-0 flex-1" placeholder="Search name, email, topic or message..." value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runSearch()} />
      <select className="input sm:max-w-xs" value={status} onChange={(event) => filterByStatus(event.target.value)} aria-label="Filter messages by status">
        <option value="">All statuses</option>
        {statuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
      </select>
      <button type="button" onClick={runSearch} className="rounded-xl bg-[#10243f] px-4 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#1c4e6b]">Search</button>
    </div>
    {notice && <p className="mb-4 rounded-xl bg-mint px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}
    {error && <p className="mb-4 rounded-xl border-l-4 border-coral bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-200">{error}</p>}
    {result ? <>
      <Table
        showDetails={false}
        onViewDetails={openMessage}
        empty="No contact messages found."
        columns={[
          { key: 'sender', label: 'Sender', render: (row) => <div><p className="font-semibold text-ink dark:text-white">{row.fullName}</p><a className="text-xs text-sky-600 hover:underline dark:text-sky-300" href={`mailto:${row.email}`}>{row.email}</a></div> },
          { key: 'subject', label: 'Topic', render: (row) => <p className="max-w-xs font-semibold text-ink dark:text-white">{row.subject}</p> },
          { key: 'status', label: 'Status', render: (row) => <span className={`badge ${statusClass[row.status] || statusClass.NEW}`}>{statusLabel(row.status)}</span> },
          { key: 'createdAt', label: 'Received', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' },
          { key: 'actions', label: 'Actions', className: 'whitespace-nowrap', render: (row) => <div className="flex flex-wrap gap-2"><button type="button" onClick={() => openMessage(row)} className="rounded-lg bg-[#e8f7f2] px-3 py-2 text-xs font-extrabold text-emerald-800 transition hover:-translate-y-0.5 dark:bg-emerald-950/50 dark:text-emerald-200">View</button><button type="button" disabled={busy === row.id} onClick={() => removeMessage(row)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700 transition hover:-translate-y-0.5 disabled:opacity-50 dark:bg-rose-950/40 dark:text-rose-200">Delete</button></div> },
        ]}
        rows={rows}
      />
      <Pagination value={result.pagination} onChange={setPage} />
    </> : <Loading />}

    <Modal open={!!selected} title={selected?.subject || 'Contact message'} onClose={() => setSelected(null)} className="max-w-3xl">
      {selected && <div className="space-y-5">
        <div className="rounded-2xl bg-gradient-to-br from-[#10243f] via-[#164d68] to-[#2e8f79] p-5 text-white">
          <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#a5f1dc]">Contact request</p>
          <h3 className="mt-2 text-xl font-extrabold">{selected.fullName}</h3>
          <a className="mt-1 block text-sm text-[#b8f6e3] hover:underline" href={`mailto:${selected.email}`}>{selected.email}</a>
          <p className="mt-3 text-xs text-slate-200">Received {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '-'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/50">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-slate-400">Message</p>
          <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-200">{selected.message}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-extrabold text-ink dark:text-white">Status<select className="input mt-2" value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)}>{statuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</select></label>
          <label className="text-sm font-extrabold text-ink dark:text-white">Admin note<textarea className="input mt-2 min-h-28 resize-y" value={draftNote} onChange={(event) => setDraftNote(event.target.value)} placeholder="Add an internal follow-up note..." /></label>
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-slate-600 dark:border-slate-700 dark:text-slate-300">Close</button>
          <button type="button" disabled={busy === selected.id} onClick={saveMessage} className="rounded-xl bg-[#10243f] px-5 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-60">{busy === selected.id ? 'Saving...' : 'Save changes'}</button>
        </div>
      </div>}
    </Modal>
  </>;
}
