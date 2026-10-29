import { useEffect, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import Header from '../../components/Header';
import Table from '../../components/Table';
import Loading from '../../components/Loading';
import Modal from '../../components/Modal';
import ImageCropper from '../../components/ImageCropper';
import Pagination from '../../components/Pagination';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirmDialog } from '../../context/ConfirmContext';
import { isImageTooLarge } from '../../utils/fileValidation';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const mediaUrl = (path) => path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;
const emptyForm = { courseCode: '', courseName: '', description: '', teacherId: '', startDate: '2026-09-01', endDate: '2027-01-31', status: 'ACTIVE', price: '1.00', currency: 'USD', monthlyPaymentEnabled: false, monthlyPrice: '', discountPercent: '0', discountStart: '', discountEnd: '', image: null };
const previewCode = (prefix) => `${prefix}-${(globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 8).toUpperCase()}`;

const activeDiscount = (course) => {
  const percent = Number(course.discountPercent || 0);
  const now = Date.now();
  const startTime = course.discountStart ? new Date(course.discountStart).getTime() : null;
  const endTime = course.discountEnd ? new Date(course.discountEnd).getTime() : null;
  return percent > 0 && percent < 100 && (!startTime || startTime <= now) && (!endTime || endTime > now);
};

const discountedPrice = (course) => (Number(course.price || 0) * (1 - Number(course.discountPercent || 0) / 100)).toFixed(2);

function Field({ label, hint, children, className = '' }) {
  return <label className={`block text-sm font-semibold text-slate-700 dark:text-slate-200 ${className}`}><span>{label}</span>{children}{hint && <span className="mt-1 block text-xs font-normal text-slate-400">{hint}</span>}</label>;
}

function PriceCell({ row }) {
  if (!activeDiscount(row)) return <span>{Number(row.price || 0).toFixed(2)} {row.currency || 'USD'}</span>;
  return <div className="space-y-1"><div className="text-xs text-slate-400 line-through">{Number(row.price || 0).toFixed(2)} {row.currency || 'USD'}</div><div className="font-bold text-coral">{discountedPrice(row)} {row.currency || 'USD'}</div><span className="badge bg-[#fff0eb] text-coral">-{Number(row.discountPercent).toFixed(2)}%</span></div>;
}

function DiscountPreview({ form, t }) {
  const price = Number(form.price || 0);
  const percent = Math.min(Math.max(Number(form.discountPercent || 0), 0), 99.99);
  const salePrice = price * (1 - percent / 100);
  const saved = Math.max(price - salePrice, 0);
  const start = form.discountStart ? new Date(form.discountStart).getTime() : null;
  const end = form.discountEnd ? new Date(form.discountEnd).getTime() : null;
  const now = Date.now();
  const state = !percent ? t('discountOff') : end && end <= now ? t('discountExpired') : start && start > now ? t('discountScheduled') : t('discountLive');
  const stateClass = !percent ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : state === t('discountLive') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : state === t('discountScheduled') ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300';

  return <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-950/45 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0"><div className="flex items-center gap-2"><span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{t('discountPreview')}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${stateClass}`}>{state}</span></div><div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1"><span className="text-2xl font-black text-ink dark:text-white">{salePrice.toFixed(2)} {form.currency}</span>{percent > 0 && <span className="text-sm font-semibold text-slate-400 line-through">{price.toFixed(2)} {form.currency}</span>}</div></div>
    <div className="shrink-0 rounded-xl bg-[#e9faf5] px-3 py-2 text-right dark:bg-emerald-950/50"><span className="block text-[10px] font-bold uppercase tracking-wide text-emerald-700/70 dark:text-emerald-300/70">{t('saveAmount')}</span><span className="text-sm font-black text-emerald-700 dark:text-emerald-300">{saved.toFixed(2)} {form.currency}</span></div>
  </div>;
}

export default function Courses() {
  const { t } = useLanguage();
  const { ask } = useConfirmDialog();
  const [result, setResult] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [cropFile, setCropFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = (targetPage = page) => api.get('/courses', { params: { page: targetPage, limit: 10 } }).then((response) => setResult(unwrap(response)));

  useEffect(() => {
    load(page);
    api.get('/teachers', { params: { page: 1, limit: 100 } }).then((response) => setTeachers(unwrap(response).data || []));
  }, [page]);

  const close = () => { setOpen(false); setEditing(null); setForm({ ...emptyForm }); setError(''); };
  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, courseCode: previewCode('CRS') }); setError(''); setOpen(true); };
  const openEdit = (course) => {
    setEditing(course);
    setForm({
      courseCode: course.courseCode,
      courseName: course.courseName,
      description: course.description || '',
      teacherId: course.teacherId,
      startDate: course.startDate.slice(0, 10),
      endDate: course.endDate.slice(0, 10),
      status: course.status,
      price: String(course.price ?? '1.00'),
      currency: course.currency || 'USD',
      monthlyPaymentEnabled: Boolean(course.monthlyPaymentEnabled),
      monthlyPrice: String(course.monthlyPrice ?? ''),
      discountPercent: String(course.discountPercent ?? '0'),
      discountStart: course.discountStart ? new Date(course.discountStart).toISOString().slice(0, 16) : '',
      discountEnd: course.discountEnd ? new Date(course.discountEnd).toISOString().slice(0, 16) : '',
      image: null,
    });
    setError('');
    setOpen(true);
  };
  const updateField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { ...form };
      delete payload.image;
      const saved = unwrap(editing ? await api.patch(`/courses/${editing.id}`, payload) : await api.post('/courses', payload));
      if (form.image) {
        const image = new FormData();
        image.append('image', form.image);
        await api.post(`/courses/${saved.id}/image`, image, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      close();
      await load();
    } catch (e) {
      setError(e.response?.data?.message || t('couldNotSaveCourse'));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (course) => {
    if (!(await ask(`${t('deleteCourseConfirm')} ${course.courseName}`))) return;
    try { await api.delete(`/courses/${course.id}`); await load(); } catch (e) { setError(e.response?.data?.message || t('couldNotSaveCourse')); }
  };
  const rows = result?.data || [];

  return <>
    <Header eyebrow={t('courses')} title={t('courses')} description={t('courseDirectoryDescription')} action={<button onClick={openCreate} className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg">+ {t('newCourse')}</button>} />
    <ImageCropper file={cropFile} labels={{ title: t('cropImage'), description: t('cropImageDescription'), zoom: t('zoom'), cancel: t('cancel'), useImage: t('useCroppedImage'), processing: t('preparingImage') }} onCancel={() => setCropFile(null)} onComplete={(croppedFile) => { if (isImageTooLarge(croppedFile)) { setError(t('imageTooLarge')); return; } setForm((current) => ({ ...current, image: croppedFile })); setCropFile(null); }} />
    {error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {result ? <>
      <Table columns={[
        { key: 'image', label: t('image'), render: (row) => row.imageUrl ? <img src={mediaUrl(row.imageUrl)} alt={row.courseName} className="h-12 w-16 rounded-lg object-cover" /> : <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">{t('noImage')}</div> },
        { key: 'courseCode', label: t('code') },
        { key: 'courseName', label: t('courseName') },
        { key: 'price', label: t('coursePrice'), render: (row) => <PriceCell row={row} /> },
        { key: 'teacher', label: t('teacher'), render: (row) => row.teacher?.user?.fullName || t('unassigned') },
        { key: 'startDate', label: t('starts'), render: (row) => new Date(row.startDate).toLocaleDateString() },
        { key: 'status', label: t('status'), render: (row) => <span className="badge bg-mint text-emerald-800">{row.status === 'ACTIVE' ? t('active') : row.status === 'COMPLETED' ? t('completed') : t('cancelled')}</span> },
        { key: 'actions', label: t('actions'), render: (row) => <div className="flex gap-2"><button onClick={() => openEdit(row)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200">{t('edit')}</button><button onClick={() => remove(row)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100">{t('delete')}</button></div> },
      ]} rows={rows} empty={t('noCourses')} />
      <Pagination value={result.pagination} onChange={setPage} />
    </> : <Loading />}

    <Modal open={open} title={editing ? t('editCourse') : t('createCourse')} onClose={close}>
      <form onSubmit={save} className="max-h-[78vh] space-y-5 overflow-y-auto pr-1">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-coral">{t('courseDetails')}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label={t('courseCodeAutoLabel')} hint={editing ? t('codeReadOnly') : t('courseCodeAuto')}><input readOnly value={form.courseCode} className="input mt-2 cursor-not-allowed bg-slate-100/80 font-semibold text-slate-500" placeholder={t('autoGenerated')} /></Field>
            <Field label={t('courseNameRequired')}><input required value={form.courseName} className="input mt-2" placeholder={t('courseNameExample')} onChange={updateField('courseName')} /></Field>
            <Field label={t('assignedTeacher')}><select required value={form.teacherId} className="input mt-2" onChange={updateField('teacherId')}><option value="">{t('selectTeacher')}</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.user.fullName}</option>)}</select></Field>
            <Field label={t('courseStatus')}><select value={form.status} className="input mt-2" onChange={updateField('status')}><option value="ACTIVE">{t('active')}</option><option value="COMPLETED">{t('completed')}</option><option value="CANCELLED">{t('cancelled')}</option></select></Field>
            <Field label={t('coursePrice')} hint={t('paymentRequiredHint')}><input required min="0.01" step="0.01" type="number" value={form.price} className="input mt-2" onChange={updateField('price')} /></Field>
            <Field label={t('currency')}><select value={form.currency} className="input mt-2" onChange={updateField('currency')}><option value="USD">USD</option><option value="KHR">KHR</option></select></Field>
            <div className="rounded-3xl border border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-emerald-50/70 p-5 shadow-sm dark:border-sky-900/70 dark:from-sky-950/35 dark:via-slate-900/60 dark:to-emerald-950/20 sm:col-span-2">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#229ed9] text-lg font-black text-white shadow-lg shadow-sky-500/20">↻</span><div><p className="text-base font-extrabold text-ink dark:text-white">{t('paymentOptions')}</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">{t('paymentOptionsHint')}</p></div></div><label className="flex cursor-pointer items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-2 text-xs font-extrabold text-sky-800 dark:border-sky-800 dark:bg-slate-950/40 dark:text-sky-200"><input type="checkbox" checked={form.monthlyPaymentEnabled} onChange={(event) => setForm({ ...form, monthlyPaymentEnabled: event.target.checked })} className="h-4 w-4 accent-[#229ed9]" />{t('monthlyPayment')}</label></div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label={t('fullCoursePayment')} hint={t('fullCoursePaymentHint')}><div className="input mt-2 flex items-center justify-between bg-slate-100/80 dark:bg-slate-950/50"><span className="font-black text-ink dark:text-white">{Number(form.price || 0).toFixed(2)} {form.currency}</span><span className="text-xs font-bold text-slate-400">{t('oneTimePayment')}</span></div></Field><Field label={t('monthlyPaymentAmount')} hint={t('monthlyPaymentAmountHint')}><div className="relative mt-2"><input required={form.monthlyPaymentEnabled} min="0.01" step="0.01" type="number" value={form.monthlyPrice} className="input pr-14" placeholder="0.00" disabled={!form.monthlyPaymentEnabled} onChange={updateField('monthlyPrice')} /><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-black text-slate-400">{form.currency}</span></div></Field></div>
            </div>
            <div className="relative isolate overflow-hidden rounded-3xl border border-coral/25 bg-gradient-to-br from-[#fff8f5] via-[#fff3ee] to-[#effbf8] p-5 shadow-sm shadow-coral/10 dark:border-coral/30 dark:from-[#261b1d] dark:via-[#211b25] dark:to-[#102b2b] sm:col-span-2 sm:p-6">
              <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-coral/15 blur-3xl" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-coral text-xl font-black text-white shadow-lg shadow-coral/25">%</span><div><p className="text-base font-extrabold text-ink dark:text-white">{t('courseDiscount')}</p><p className="mt-1 max-w-xl text-xs leading-5 text-slate-500 dark:text-slate-300">{t('courseDiscountHint')}</p></div></div>
                <span className="self-start rounded-full border border-coral/20 bg-white/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-coral dark:border-coral/30 dark:bg-slate-950/40">{t('optional')}</span>
              </div>
              <div className="relative mt-5 grid gap-4 sm:grid-cols-3">
                <Field label={t('discountPercent')}><div className="relative mt-2"><input min="0" max="99.99" step="0.01" type="number" value={form.discountPercent} className="input pr-10" onChange={updateField('discountPercent')} /><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-black text-coral">%</span></div></Field>
                <Field label={t('discountStart')}><input type="datetime-local" value={form.discountStart} className="input mt-2 bg-white/85 dark:bg-slate-950/60" onChange={updateField('discountStart')} /></Field>
                <Field label={t('discountEnd')}><input type="datetime-local" value={form.discountEnd} className="input mt-2 bg-white/85 dark:bg-slate-950/60" onChange={updateField('discountEnd')} /></Field>
              </div>
              <DiscountPreview form={form} t={t} />
            </div>
            <Field label={t('description')} className="sm:col-span-2"><textarea rows="3" value={form.description} className="input mt-2" placeholder={t('courseDescriptionPlaceholder')} onChange={updateField('description')} /></Field>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">{t('coursePeriod')}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label={t('startDate')}><input required type="date" value={form.startDate} className="input mt-2" onChange={updateField('startDate')} /></Field><Field label={t('endDate')}><input required type="date" value={form.endDate} className="input mt-2" onChange={updateField('endDate')} /></Field></div></div>
        <div className="rounded-2xl bg-slate-50 p-4"><Field label={t('courseImage')} hint={t('imageSizeHint')}><input type="file" accept="image/png,image/jpeg,image/webp" className="input mt-2 p-2" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; setForm((current) => ({ ...current, image: null })); if (!file) return; if (isImageTooLarge(file)) { setError(t('imageTooLarge')); return; } setError(''); setCropFile(file); }} />{form.image && <span className="mt-2 block text-xs font-semibold text-emerald-700">{t('useCroppedImage')}: {form.image.name}</span>}</Field></div>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="sticky bottom-0 w-full rounded-xl bg-navy py-3.5 font-semibold text-white shadow-lg transition hover:bg-[#1b3b5d] disabled:opacity-60">{busy ? t('savingCourse') : editing ? t('saveCourseChanges') : t('createCourse')}</button>
      </form>
    </Modal>
  </>;
}
