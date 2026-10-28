import { useEffect, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import Pagination from '../../components/Pagination';
import Table from '../../components/Table';

const permissions = [['canCreate', 'Create'], ['canEdit', 'Edit'], ['canDelete', 'Delete']];
export default function Users() {
  const [result, setResult] = useState(null); const [search, setSearch] = useState(''); const [page, setPage] = useState(1); const [saving, setSaving] = useState(''); const [notice, setNotice] = useState('');
  const load = (targetPage = page) => api.get('/users', { params: { search, page: targetPage, limit: 10 } }).then((r) => setResult(unwrap(r)));
  useEffect(() => { load(page); }, [page]);
  const searchUsers = () => { setPage(1); load(1); };
  const toggle = async (user, key) => { setSaving(user.id); setNotice(''); try { await api.patch(`/users/${user.id}`, { [key]: !user[key] }); setNotice(`Updated ${user.fullName}'s permissions.`); await load(page); } catch (e) { setNotice(e.response?.data?.message || 'Could not update permissions.'); } finally { setSaving(''); } };
  const rows = result?.data || [];
  return <><Header eyebrow="Administration" title="Users & permissions" description="Control which accounts may create, edit and delete learning records. Administrators always retain full access." /><div className="mb-5 flex flex-wrap items-center justify-end gap-3"><input className="input max-w-sm" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchUsers()} /><button onClick={searchUsers} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">Search</button>{notice && <span className="rounded-xl bg-mint px-4 py-3 text-sm text-emerald-800">{notice}</span>}</div>{result ? <><Table columns={[{ key: 'name', label: 'Account', render: (r) => <div><p className="font-semibold text-ink">{r.fullName}</p><p className="text-xs text-slate-400">{r.email}</p></div> }, { key: 'role', label: 'Role', render: (r) => <span className="badge bg-slate-100 text-slate-600">{r.role}</span> }, ...permissions.map(([key, label]) => ({ key, label, render: (r) => <button disabled={saving === r.id || r.role === 'ADMIN'} onClick={() => toggle(r, key)} className={`relative h-7 w-12 rounded-full transition ${r[key] ? 'bg-emerald-500' : 'bg-slate-300'} disabled:cursor-not-allowed disabled:opacity-60`} title={r.role === 'ADMIN' ? 'Administrators always have this permission' : `Toggle ${label}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${r[key] ? 'left-6' : 'left-1'}`} /></button> }))]} rows={rows} empty="No user accounts found." /><Pagination value={result.pagination} onChange={setPage} /></> : <Loading />}</>;
}
