import { useEffect, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import Header from '../../components/Header';
import Table from '../../components/Table';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import Loading from '../../components/Loading';

const emptyForm = { fullName: '', email: '', studentCode: '', phone: '', gender: '', dateOfBirth: '', address: '', guardianName: '', guardianPhone: '', password: '', status: 'ACTIVE' };

function Field({ label, hint, children, className = '' }) {
  return <label className={`block text-sm font-semibold text-slate-700 ${className}`}><span>{label}</span>{children}{hint && <span className="mt-1 block text-xs font-normal text-slate-400">{hint}</span>}</label>;
}

export default function Students() {
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = (nextPage = page, nextSearch = search) => api.get('/students', { params: { search: nextSearch, page: nextPage, limit: 10 } }).then((response) => setResult(unwrap(response))).catch((e) => setError(e.response?.data?.message || 'Could not load students.'));
  useEffect(() => { load(page); }, [page]);

  const searchStudents = () => { setPage(1); load(1, search); };
  const close = () => { setOpen(false); setEditing(null); setForm({ ...emptyForm }); setFormError(''); };
  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setFormError(''); setOpen(true); };
  const openEdit = (student) => { setEditing(student); setForm({ fullName: student.user?.fullName || '', email: student.user?.email || '', studentCode: student.studentCode || '', phone: student.user?.phone || '', gender: student.gender || '', dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '', address: student.address || '', guardianName: student.guardianName || '', guardianPhone: student.guardianPhone || '', password: '', status: student.user?.status || 'ACTIVE' }); setFormError(''); setOpen(true); };
  const updateField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      await (editing ? api.patch(`/students/${editing.id}`, payload) : api.post('/students', payload));
      close();
      await load(page);
    } catch (e) {
      const message = e.response?.data?.message || 'Could not save student.';
      setFormError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (student) => { if (!window.confirm(`Delete ${student.user?.fullName || 'this student'}? This also removes the student account.`)) return; setError(''); try { await api.delete(`/students/${student.id}`); await load(page); } catch (e) { setError(e.response?.data?.message || 'Could not delete student.'); } };
  const rows = result?.data || [];

  return <><Header eyebrow="Directory" title="Students" description="Create, edit and manage student profiles, contacts and enrolments." action={<button onClick={openCreate} className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg">+ New student</button>} /><div className="mb-4 flex flex-wrap justify-end gap-3"><input className="input max-w-sm" placeholder="Search by name, code or email..." value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && searchStudents()} /><button onClick={searchStudents} className="rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Search</button></div>{error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}{result ? <><Table columns={[{ key: 'studentCode', label: 'Code' }, { key: 'name', label: 'Full name', render: (row) => row.user?.fullName }, { key: 'email', label: 'Email', render: (row) => row.user?.email }, { key: 'phone', label: 'Phone', render: (row) => row.user?.phone || '-' }, { key: 'gender', label: 'Gender', render: (row) => row.gender || '-' }, { key: 'status', label: 'Status', render: (row) => <span className="badge bg-mint text-emerald-800">{row.user?.status}</span> }, { key: 'actions', label: 'Actions', render: (row) => <div className="flex gap-2"><button onClick={() => openEdit(row)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200">Edit</button><button onClick={() => remove(row)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100">Delete</button></div> }]} rows={rows} empty="No students found." /><Pagination value={result.pagination} onChange={setPage} /></> : <Loading />}

    <Modal open={open} title={editing ? 'Edit student profile' : 'Create student account'} onClose={close}><form onSubmit={save} className="max-h-[78vh] space-y-5 overflow-y-auto pr-1">
      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">Account details</p><p className="mt-1 text-sm text-slate-500">Use a unique email address and student code.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Full name *" className="sm:col-span-2"><input required autoFocus value={form.fullName} className="input mt-2" placeholder="e.g. Dara Sok" onChange={updateField('fullName')} /></Field><Field label="Email *" hint="This email is used to sign in."><input required type="email" autoComplete="email" value={form.email} className="input mt-2" placeholder="student@example.com" onChange={updateField('email')} /></Field><Field label="Student code *" hint="Must be unique."><input required value={form.studentCode} className="input mt-2" placeholder="e.g. STU-011" onChange={updateField('studentCode')} /></Field><Field label="Phone"><input type="tel" value={form.phone} className="input mt-2" placeholder="012 345 678" onChange={updateField('phone')} /></Field><Field label="Gender"><select value={form.gender} className="input mt-2" onChange={updateField('gender')}><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></Field></div></div>
      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">Personal information</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Date of birth"><input type="date" value={form.dateOfBirth} className="input mt-2" onChange={updateField('dateOfBirth')} /></Field><Field label="Address" className="sm:col-span-2"><textarea rows="3" value={form.address} className="input mt-2" placeholder="Home address" onChange={updateField('address')} /></Field></div></div>
      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">Guardian information <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span></p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Guardian name"><input value={form.guardianName} className="input mt-2" placeholder="Parent or guardian" onChange={updateField('guardianName')} /></Field><Field label="Guardian phone"><input type="tel" value={form.guardianPhone} className="input mt-2" placeholder="012 345 678" onChange={updateField('guardianPhone')} /></Field></div></div>
      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">Security</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label={editing ? 'New password' : 'Password'} hint={editing ? 'Leave blank to keep the current password.' : 'Leave blank to use the strong default password.'}><input type="password" autoComplete="new-password" value={form.password} className="input mt-2" placeholder={editing ? 'Optional new password' : 'Optional initial password'} onChange={updateField('password')} /></Field>{editing && <Field label="Account status"><select value={form.status} className="input mt-2" onChange={updateField('status')}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></Field>}</div></div>
      {formError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"><strong>Could not save student.</strong><br />{formError}<br /><span className="text-xs">Check that the email and student code are not already used.</span></div>}
      <button disabled={busy} className="sticky bottom-0 w-full rounded-xl bg-navy py-3.5 font-semibold text-white shadow-lg transition hover:bg-[#1b3b5d] disabled:opacity-60">{busy ? 'Saving student...' : editing ? 'Save student changes' : 'Create student'}</button>
    </form></Modal>
  </>;
}
