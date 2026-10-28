import { useEffect, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import Header from '../../components/Header';
import Table from '../../components/Table';
import Loading from '../../components/Loading';
import Modal from '../../components/Modal';

const emptyForm = { fullName: '', email: '', teacherCode: '', phone: '', specialization: '', address: '', password: '', status: 'ACTIVE' };

function Field({ label, hint, children, className = '' }) {
  return <label className={`block text-sm font-semibold text-slate-700 ${className}`}><span>{label}</span>{children}{hint && <span className="mt-1 block text-xs font-normal text-slate-400">{hint}</span>}</label>;
}

export default function Teachers() {
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => api.get('/teachers', { params: { limit: 50 } }).then((response) => setResult(unwrap(response))).catch((e) => setError(e.response?.data?.message || 'Could not load teachers.'));
  useEffect(() => { load(); }, []);
  const close = () => { setOpen(false); setEditing(null); setForm({ ...emptyForm }); setFormError(''); };
  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setFormError(''); setOpen(true); };
  const openEdit = (teacher) => { setEditing(teacher); setForm({ fullName: teacher.user?.fullName || '', email: teacher.user?.email || '', teacherCode: teacher.teacherCode || '', phone: teacher.user?.phone || '', specialization: teacher.specialization || '', address: teacher.address || '', password: '', status: teacher.user?.status || 'ACTIVE' }); setFormError(''); setOpen(true); };
  const updateField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const save = async (event) => { event.preventDefault(); setBusy(true); setFormError(''); try { const payload = { ...form }; if (!payload.password) delete payload.password; await (editing ? api.patch(`/teachers/${editing.id}`, payload) : api.post('/teachers', payload)); close(); await load(); } catch (e) { const message = e.response?.data?.message || 'Could not save teacher.'; setFormError(Array.isArray(message) ? message.join(', ') : message); } finally { setBusy(false); } };
  const remove = async (teacher) => { if (!window.confirm(`Delete ${teacher.user?.fullName || 'this teacher'}? This also removes the teacher account.`)) return; setError(''); try { await api.delete(`/teachers/${teacher.id}`); await load(); } catch (e) { setError(e.response?.data?.message || 'Could not delete teacher. A teacher with assigned courses may need to be reassigned first.'); } };
  const rows = result?.data || [];

  return <><Header eyebrow="Directory" title="Teachers" description="Keep your teaching team, accounts and specializations up to date." action={<button onClick={openCreate} className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg">+ New teacher</button>} />{error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}{result ? <Table columns={[{ key: 'teacherCode', label: 'Code' }, { key: 'name', label: 'Full name', render: (row) => row.user?.fullName }, { key: 'email', label: 'Email', render: (row) => row.user?.email }, { key: 'specialization', label: 'Specialization', render: (row) => row.specialization || '-' }, { key: 'status', label: 'Status', render: (row) => <span className="badge bg-mint text-emerald-800">{row.user?.status}</span> }, { key: 'actions', label: 'Actions', render: (row) => <div className="flex gap-2"><button onClick={() => openEdit(row)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200">Edit</button><button onClick={() => remove(row)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100">Delete</button></div> }]} rows={rows} empty="No teachers found." /> : <Loading />}

    <Modal open={open} title={editing ? 'Edit teacher profile' : 'Create teacher account'} onClose={close}><form onSubmit={save} className="max-h-[78vh] space-y-5 overflow-y-auto pr-1">
      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">Account details</p><p className="mt-1 text-sm text-slate-500">Create a unique teaching account and code.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Full name *" className="sm:col-span-2"><input required autoFocus value={form.fullName} className="input mt-2" placeholder="e.g. Rouen Vathan" onChange={updateField('fullName')} /></Field><Field label="Email *" hint="This email is used to sign in."><input required type="email" autoComplete="email" value={form.email} className="input mt-2" placeholder="teacher@example.com" onChange={updateField('email')} /></Field><Field label="Teacher code *" hint="Must be unique."><input required value={form.teacherCode} className="input mt-2" placeholder="e.g. TCH-004" onChange={updateField('teacherCode')} /></Field><Field label="Phone"><input type="tel" value={form.phone} className="input mt-2" placeholder="012 345 678" onChange={updateField('phone')} /></Field><Field label="Specialization"><input value={form.specialization} className="input mt-2" placeholder="e.g. Mathematics" onChange={updateField('specialization')} /></Field></div></div>
      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">Contact information</p><Field label="Address" className="mt-4"><textarea rows="3" value={form.address} className="input mt-2" placeholder="Home address" onChange={updateField('address')} /></Field></div>
      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">Security</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label={editing ? 'New password' : 'Password'} hint={editing ? 'Leave blank to keep the current password.' : 'Leave blank to use the strong default password.'}><input type="password" autoComplete="new-password" value={form.password} className="input mt-2" placeholder={editing ? 'Optional new password' : 'Optional initial password'} onChange={updateField('password')} /></Field>{editing && <Field label="Account status"><select value={form.status} className="input mt-2" onChange={updateField('status')}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></Field>}</div></div>
      {formError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"><strong>Could not save teacher.</strong><br />{formError}<br /><span className="text-xs">Check that the email and teacher code are not already used.</span></div>}
      <button disabled={busy} className="sticky bottom-0 w-full rounded-xl bg-navy py-3.5 font-semibold text-white shadow-lg transition hover:bg-[#1b3b5d] disabled:opacity-60">{busy ? 'Saving teacher...' : editing ? 'Save teacher changes' : 'Create teacher'}</button>
    </form></Modal>
  </>;
}
