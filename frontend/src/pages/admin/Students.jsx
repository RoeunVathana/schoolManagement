import { useEffect, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import Header from '../../components/Header';
import Table from '../../components/Table';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import Loading from '../../components/Loading';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirmDialog } from '../../context/ConfirmContext';

const emptyForm = { fullName: '', email: '', studentCode: '', phone: '', gender: '', dateOfBirth: '', address: '', guardianName: '', guardianPhone: '', password: '', status: 'ACTIVE' };
const previewCode = (prefix) => `${prefix}-${(globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 8).toUpperCase()}`;

function Field({ label, hint, children, className = '' }) {
  return <label className={`block text-sm font-semibold text-slate-700 ${className}`}><span>{label}</span>{children}{hint && <span className="mt-1 block text-xs font-normal text-slate-400">{hint}</span>}</label>;
}

export default function Students() {
  const { t } = useLanguage();
  const { ask } = useConfirmDialog();
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = (nextPage = page, nextSearch = search) => api.get('/students', { params: { search: nextSearch, page: nextPage, limit: 10 } }).then((response) => setResult(unwrap(response))).catch((e) => setError(e.response?.data?.message || t('noStudents')));
  useEffect(() => { load(page); }, [page]);

  const searchStudents = () => { setPage(1); load(1, search); };
  const close = () => { setOpen(false); setEditing(null); setForm({ ...emptyForm }); setFormError(''); };
  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, studentCode: previewCode('STU') }); setFormError(''); setOpen(true); };
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
      const message = e.response?.data?.message || t('couldNotSaveStudent');
      setFormError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (student) => { if (!(await ask(`${t('delete')} ${student.user?.fullName || t('students')}? ${t('deleteStudentConfirm')}`))) return; setError(''); try { await api.delete(`/students/${student.id}`); await load(page); } catch (e) { setError(e.response?.data?.message || t('couldNotSaveStudent')); } };
  const rows = result?.data || [];

  return <><Header eyebrow={t('directory')} title={t('students')} description={t('studentDirectoryDescription')} action={<button onClick={openCreate} className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg">+ {t('newStudent')}</button>} /><div className="mb-4 flex flex-wrap justify-end gap-3"><input className="input max-w-sm" placeholder={t('searchStudents')} value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && searchStudents()} /><button onClick={searchStudents} className="rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">{t('search')}</button></div>{error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}{result ? <><Table columns={[{ key: 'studentCode', label: t('code') }, { key: 'name', label: t('fullName'), render: (row) => row.user?.fullName }, { key: 'email', label: t('email'), render: (row) => row.user?.email }, { key: 'phone', label: t('phone'), render: (row) => row.user?.phone || '-' }, { key: 'gender', label: t('gender'), render: (row) => row.gender || '-' }, { key: 'status', label: t('status'), render: (row) => <span className="badge bg-mint text-emerald-800">{row.user?.status === 'ACTIVE' ? t('active') : t('inactive')}</span> }, { key: 'actions', label: t('actions'), render: (row) => <div className="flex gap-2"><button onClick={() => openEdit(row)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200">{t('edit')}</button><button onClick={() => remove(row)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100">{t('delete')}</button></div> }]} rows={rows} empty={t('noStudents')} /><Pagination value={result.pagination} onChange={setPage} /></> : <Loading />}

    <Modal open={open} title={editing ? t('editStudentProfile') : t('createStudentAccount')} onClose={close}><form onSubmit={save} className="max-h-[78vh] space-y-5 overflow-y-auto pr-1">
      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">{t('accountDetails')}</p><p className="mt-1 text-sm text-slate-500">{t('studentAccountHint')}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label={t('fullNameRequired')} className="sm:col-span-2"><input required autoFocus value={form.fullName} className="input mt-2" placeholder={t('studentExample')} onChange={updateField('fullName')} /></Field><Field label={t('emailRequired')} hint={t('emailSignInHint')}><input required type="email" autoComplete="email" value={form.email} className="input mt-2" placeholder={t('studentEmailExample')} onChange={updateField('email')} /></Field><Field label={t('studentCodeAutoLabel')} hint={editing ? t('codeReadOnly') : t('studentCodeAuto')}><input readOnly value={form.studentCode} className="input mt-2 cursor-not-allowed bg-slate-100/80 font-semibold text-slate-500" placeholder={t('autoGenerated')} /></Field><Field label={t('phone')}><input type="tel" value={form.phone} className="input mt-2" placeholder={t('phoneExample')} onChange={updateField('phone')} /></Field><Field label={t('gender')}><select value={form.gender} className="input mt-2" onChange={updateField('gender')}><option value="">{t('selectGender')}</option><option value="Male">{t('male')}</option><option value="Female">{t('female')}</option><option value="Other">{t('other')}</option></select></Field></div></div>
      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">{t('personalInformation')}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label={t('dateOfBirth')}><input type="date" value={form.dateOfBirth} className="input mt-2" onChange={updateField('dateOfBirth')} /></Field><Field label={t('address')} className="sm:col-span-2"><textarea rows="3" value={form.address} className="input mt-2" placeholder={t('homeAddress')} onChange={updateField('address')} /></Field></div></div>
      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">{t('guardianInformation')} <span className="font-normal normal-case tracking-normal text-slate-400">({t('optional')})</span></p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label={t('guardianName')}><input value={form.guardianName} className="input mt-2" placeholder={t('parentOrGuardian')} onChange={updateField('guardianName')} /></Field><Field label={t('guardianPhone')}><input type="tel" value={form.guardianPhone} className="input mt-2" placeholder={t('phoneExample')} onChange={updateField('guardianPhone')} /></Field></div></div>
      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">{t('security')}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label={editing ? t('newPassword') : t('password')} hint={editing ? t('leaveBlankPassword') : t('passwordRequired')}><input required={!editing} type="password" autoComplete="new-password" value={form.password} className="input mt-2" placeholder={editing ? t('optionalNewPassword') : t('passwordRequired')} onChange={updateField('password')} /></Field>{editing && <Field label={t('accountStatus')}><select value={form.status} className="input mt-2" onChange={updateField('status')}><option value="ACTIVE">{t('active')}</option><option value="INACTIVE">{t('inactive')}</option></select></Field>}</div></div>
      {formError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"><strong>{t('couldNotSaveStudent')}</strong><br />{formError}<br /><span className="text-xs">{t('checkStudentUnique')}</span></div>}
      <button disabled={busy} className="sticky bottom-0 w-full rounded-xl bg-navy py-3.5 font-semibold text-white shadow-lg transition hover:bg-[#1b3b5d] disabled:opacity-60">{busy ? t('savingStudent') : editing ? t('saveStudentChanges') : t('createStudent')}</button>
    </form></Modal>
  </>;
}
