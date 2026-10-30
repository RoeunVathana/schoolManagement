import { useEffect, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import Header from '../../components/Header';
import Table from '../../components/Table';
import Loading from '../../components/Loading';
import Modal from '../../components/Modal';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirmDialog } from '../../context/ConfirmContext';
import Pagination from '../../components/Pagination';

const emptyForm = { fullName: '', email: '', teacherCode: '', phone: '', specialization: '', address: '', password: '', status: 'ACTIVE' };
const previewCode = (prefix) => `${prefix}-${(globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 8).toUpperCase()}`;

function Field({ label, hint, children, className = '' }) {
  return <label className={`block text-sm font-semibold text-slate-700 ${className}`}><span>{label}</span>{children}{hint && <span className="mt-1 block text-xs font-normal text-slate-400">{hint}</span>}</label>;
}

export default function Teachers() {
  const { t } = useLanguage();
  const { ask } = useConfirmDialog();
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const load = (targetPage = page) => api.get('/teachers', { params: { page: targetPage, limit: 10 } }).then((response) => setResult(unwrap(response))).catch((e) => setError(e.response?.data?.message || t('noTeachers')));
  useEffect(() => { load(page); }, [page]);
  const close = () => { setOpen(false); setEditing(null); setForm({ ...emptyForm }); setFormError(''); };
  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, teacherCode: previewCode('TCH') }); setFormError(''); setOpen(true); };
  const openEdit = (teacher) => { setEditing(teacher); setForm({ fullName: teacher.user?.fullName || '', email: teacher.user?.email || '', teacherCode: teacher.teacherCode || '', phone: teacher.user?.phone || '', specialization: teacher.specialization || '', address: teacher.address || '', password: '', status: teacher.user?.status || 'ACTIVE' }); setFormError(''); setOpen(true); };
  const updateField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const save = async (event) => { event.preventDefault(); setBusy(true); setFormError(''); try { const payload = { ...form }; if (!payload.password) delete payload.password; await (editing ? api.patch(`/teachers/${editing.id}`, payload) : api.post('/teachers', payload)); close(); await load(); } catch (e) { const message = e.response?.data?.message || t('couldNotSaveTeacher'); setFormError(Array.isArray(message) ? message.join(', ') : message); } finally { setBusy(false); } };
  const remove = async (teacher) => { if (!(await ask(`${t('delete')} ${teacher.user?.fullName || t('teachers')}? ${t('deleteTeacherConfirm')}`))) return; setError(''); try { await api.delete(`/teachers/${teacher.id}`); await load(); } catch (e) { setError(e.response?.data?.message || t('couldNotSaveTeacher')); } };
  const rows = result?.data || [];

  return <><Header eyebrow={t('directory')} title={t('teachers')} description={t('teacherDirectoryDescription')} action={<button onClick={openCreate} className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg">+ {t('newTeacher')}</button>} />{error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}{result ? <><Table columns={[{ key: 'teacherCode', label: t('code') }, { key: 'name', label: t('fullName'), render: (row) => row.user?.fullName }, { key: 'email', label: t('email'), render: (row) => row.user?.email }, { key: 'specialization', label: t('specialization'), render: (row) => row.specialization || '-' }, { key: 'status', label: t('status'), render: (row) => <span className="badge bg-mint text-emerald-800">{row.user?.status === 'ACTIVE' ? t('active') : t('inactive')}</span> }, { key: 'actions', label: t('actions'), render: (row) => <div className="flex gap-2"><button onClick={() => openEdit(row)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200">{t('edit')}</button><button onClick={() => remove(row)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100">{t('delete')}</button></div> }]} rows={rows} empty={t('noTeachers')} /><Pagination value={result.pagination} onChange={setPage} /></> : <Loading />}

    <Modal open={open} title={editing ? t('editTeacherProfile') : t('createTeacherAccount')} onClose={close}><form onSubmit={save} className="max-h-[78vh] space-y-5 overflow-y-auto pr-1">
      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">{t('accountDetails')}</p><p className="mt-1 text-sm text-slate-500">{t('teacherAccountHint')}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label={t('fullNameRequired')} className="sm:col-span-2"><input required autoFocus value={form.fullName} className="input mt-2" placeholder={t('teacherExample')} onChange={updateField('fullName')} /></Field><Field label={t('emailRequired')} hint={t('emailSignInHint')}><input required type="email" autoComplete="email" value={form.email} className="input mt-2" placeholder={t('teacherEmailExample')} onChange={updateField('email')} /></Field><Field label={t('teacherCodeAutoLabel')} hint={editing ? t('codeReadOnly') : t('teacherCodeAuto')}><input readOnly value={form.teacherCode} className="input mt-2 cursor-not-allowed bg-slate-100/80 font-semibold text-slate-500" placeholder={t('autoGenerated')} /></Field><Field label={t('phone')}><input type="tel" value={form.phone} className="input mt-2" placeholder={t('phoneExample')} onChange={updateField('phone')} /></Field><Field label={t('specialization')}><input value={form.specialization} className="input mt-2" placeholder={t('specialization')} onChange={updateField('specialization')} /></Field></div></div>
      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">{t('contactInformation')}</p><Field label={t('address')} className="mt-4"><textarea rows="3" value={form.address} className="input mt-2" placeholder={t('homeAddress')} onChange={updateField('address')} /></Field></div>
      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">{t('security')}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label={editing ? t('newPassword') : t('password')} hint={editing ? t('leaveBlankPassword') : t('passwordRequired')}><input required={!editing} type="password" autoComplete="new-password" value={form.password} className="input mt-2" placeholder={editing ? t('optionalNewPassword') : t('passwordRequired')} onChange={updateField('password')} /></Field>{editing && <Field label={t('accountStatus')}><select value={form.status} className="input mt-2" onChange={updateField('status')}><option value="ACTIVE">{t('active')}</option><option value="INACTIVE">{t('inactive')}</option></select></Field>}</div></div>
      {formError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"><strong>{t('couldNotSaveTeacher')}</strong><br />{formError}<br /><span className="text-xs">{t('checkTeacherUnique')}</span></div>}
      <button disabled={busy} className="sticky bottom-0 w-full rounded-xl bg-navy py-3.5 font-semibold text-white shadow-lg transition hover:bg-[#1b3b5d] disabled:opacity-60">{busy ? t('savingTeacher') : editing ? t('saveTeacherChanges') : t('createTeacher')}</button>
    </form></Modal>
  </>;
}
