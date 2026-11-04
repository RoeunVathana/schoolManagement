import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { unwrap } from '../../api/axios';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import Modal from '../../components/Modal';
import ImageCropper from '../../components/ImageCropper';
import SafeImage from '../../components/SafeImage';
import FileImagePreview from '../../components/FileImagePreview';
import UploadProgressPanel from '../../components/UploadProgressPanel';
import Pagination from '../../components/Pagination';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirmDialog } from '../../context/ConfirmContext';
import { isImageTooLarge } from '../../utils/fileValidation';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const mediaUrl = (path) => path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;
const emptyForm = { courseCode: '', courseName: '', description: '', teacherId: '', startDate: '2026-09-01', endDate: '2027-01-31', status: 'ACTIVE', paymentEnabled: true, price: '1.00', currency: 'USD', monthlyPaymentEnabled: false, monthlyPrice: '', discountPercent: '0', discountStart: '', discountEnd: '', telegramChatId: '', image: null };
const previewCode = (prefix) => `${prefix}-${(globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 8).toUpperCase()}`;
const courseFormData = (values, file) => {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null) data.append(key, typeof value === 'boolean' ? String(value) : String(value));
  });
  data.append('image', file);
  return data;
};

const activeDiscount = (course) => {
  const percent = Number(course.discountPercent || 0);
  const now = Date.now();
  const startTime = course.discountStart ? new Date(course.discountStart).getTime() : null;
  const endTime = course.discountEnd ? new Date(course.discountEnd).getTime() : null;
  return percent > 0 && percent < 100 && (!startTime || startTime <= now) && (!endTime || endTime > now);
};

const isFutureCourse = (course) => {
  if (!course?.startDate) return false;
  const startTime = new Date(course.startDate).getTime();
  return Number.isFinite(startTime) && startTime > Date.now();
};

const discountedPrice = (course) => (Number(course.price || 0) * (1 - Number(course.discountPercent || 0) / 100)).toFixed(2);

function Field({ label, hint, children, className = '' }) {
  return <label className={`block text-sm font-semibold text-slate-700 dark:text-slate-200 ${className}`}><span>{label}</span>{children}{hint && <span className="mt-1 block text-xs font-normal text-slate-400">{hint}</span>}</label>;
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

function CreateCourseCard({ t, openCreate }) {
  return <button type="button" onClick={openCreate} className="group flex min-h-[31.5rem] flex-col overflow-hidden rounded-[1.45rem] border-2 border-dashed border-[#8de4ca] bg-gradient-to-br from-[#effcf7] via-white to-[#eef6ff] p-6 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#229ed9] hover:shadow-[0_22px_45px_rgba(34,158,217,.16)] dark:border-emerald-800 dark:from-emerald-950/30 dark:via-[#111c30] dark:to-sky-950/25">
    <span className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-[#10243f] text-4xl font-light text-white shadow-lg shadow-[#10243f]/20 transition duration-300 group-hover:rotate-90 group-hover:bg-[#229ed9]">+</span>
    <p className="mt-8 text-xs font-extrabold uppercase tracking-[.18em] text-coral">{t('adminWorkspace')}</p>
    <h2 className="mt-2 text-2xl font-extrabold leading-tight text-ink dark:text-white">{t('createCourse')}</h2>
    <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-300">{t('courseDirectoryDescription')}</p>
    <span className="mt-auto inline-flex w-full items-center justify-center rounded-xl bg-[#64748b] px-4 py-3.5 text-sm font-extrabold text-white transition group-hover:bg-[#52657d]">+ {t('newCourse')}</span>
  </button>;
}

function CourseCard({ course, language, t, openEdit, remove }) {
  const isActive = course.status === 'ACTIVE';
  const isFuture = isFutureCourse(course);
  const hasDiscount = activeDiscount(course);
  const price = hasDiscount ? discountedPrice(course) : Number(course.price || 0).toFixed(2);
  const statusLabel = isFuture ? 'Future course' : course.status === 'ACTIVE' ? t('active') : course.status === 'COMPLETED' ? t('completed') : t('cancelled');
  const startDate = course.startDate ? new Date(course.startDate).toLocaleDateString(language === 'km' ? 'km-KH' : 'en-US') : '-';

  return <article className="group overflow-hidden rounded-[1.45rem] border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(16,36,63,.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_45px_rgba(16,36,63,.14)] dark:border-slate-700 dark:bg-[#111c30]">
    <div className="relative aspect-[1.9/1] overflow-hidden bg-gradient-to-br from-[#dce6ef] via-[#b8c8d4] to-[#8298aa]">
      {course.imageUrl ? <SafeImage src={mediaUrl(course.imageUrl)} alt={course.courseName} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,.75),transparent_32%),linear-gradient(135deg,#dbe7ef,#7890a5)]"><span className="rounded-full bg-white/75 px-4 py-2 text-xs font-extrabold uppercase tracking-[.16em] text-slate-600">{t('noImage')}</span></div>}
      <div className="absolute inset-0 bg-gradient-to-t from-[#10243f]/75 via-[#10243f]/5 to-transparent" />
      <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-2">
        <span className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.14em] shadow-sm ${isFuture ? 'bg-sky-100 text-sky-800' : isActive ? 'bg-[#e4f8ef] text-emerald-800' : 'bg-white/85 text-slate-600'}`}>{statusLabel}</span>
        {course.paymentEnabled === false && <span className="rounded-full bg-slate-950/55 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-white backdrop-blur-sm">{language === 'km' ? 'បិទការទូទាត់' : 'Payments closed'}</span>}
      </div>
      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
        <span className="rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.15em] text-coral shadow-sm">{course.courseCode}</span>
        <span className="rounded-full bg-[#10243f]/75 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-sm">{course.teacher?.user?.fullName || t('unassigned')}</span>
      </div>
    </div>
    <div className="flex min-h-[19rem] flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-xl font-extrabold leading-tight text-ink dark:text-white">{course.courseName}</h2>
        {hasDiscount && <span className="shrink-0 rounded-full bg-[#fff0eb] px-2.5 py-1 text-[10px] font-extrabold text-coral">-{Number(course.discountPercent).toFixed(0)}%</span>}
      </div>
      <p className="mt-3 min-h-[4.5rem] overflow-hidden text-sm leading-6 text-slate-500 dark:text-slate-300" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3 }}>{course.description || t('courseInformation')}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50/90 p-3.5 dark:bg-slate-900/70">
        <div><span className="block text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-400">{t('coursePrice')}</span><span className="mt-1 block text-base font-black text-ink dark:text-white">{price} {course.currency || 'USD'}</span>{hasDiscount && <span className="text-[11px] font-semibold text-slate-400 line-through">{Number(course.price || 0).toFixed(2)} {course.currency || 'USD'}</span>}</div>
        <div className="text-right"><span className="block text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-400">{t('starts')}</span><span className="mt-1 block text-sm font-bold text-slate-700 dark:text-slate-200">{startDate}</span></div>
      </div>
      <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-[1fr_auto]">
        <button type="button" onClick={() => openEdit(course)} className="inline-flex items-center justify-center rounded-xl bg-[#64748b] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#52657d]">{t('editCourse')}</button>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Link to={`/courses/${course.id}`} className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-3 text-xs font-extrabold text-slate-600 transition hover:border-[#8de4ca] hover:bg-[#effcf7] dark:border-slate-700 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30" title={t('viewDetails')}>{t('viewDetails')}</Link>
          <button type="button" onClick={() => remove(course)} className="inline-flex items-center justify-center rounded-xl border border-rose-200 px-3 py-3 text-xs font-extrabold text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/70 dark:text-rose-300 dark:hover:bg-rose-950/30">{t('delete')}</button>
        </div>
      </div>
    </div>
  </article>;
}

export default function Courses() {
  const { language, t } = useLanguage();
  const { ask } = useConfirmDialog();
  const [result, setResult] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [cropFile, setCropFile] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveStage, setSaveStage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const imageInputRef = useRef(null);

  const load = useCallback((targetPage = page) => {
    setError('');
    // The timestamp prevents stale responses without adding a non-simple
    // cross-origin header that would make the browser preflight this request.
    return api.get('/courses', { params: { page: targetPage, limit: 10, _ts: Date.now() } }).then((response) => {
      const next = unwrap(response);
      setResult(next);
      return next;
    }).catch((requestError) => {
      setResult({ data: [], pagination: null });
      setError(requestError.response?.data?.message || t('couldNotLoadCourses'));
      return null;
    });
  }, [page, t]);

  useEffect(() => {
    load(page);
    api.get('/teachers', { params: { page: 1, limit: 100 } }).then((response) => setTeachers(unwrap(response).data || [])).catch((requestError) => setError(requestError.response?.data?.message || t('couldNotLoadTeachers')));
  }, [page, t]);

  const resetImageInput = () => {
    if (imageInputRef.current) imageInputRef.current.value = '';
  };
  const close = (force = false) => { if (busy && !force) return; resetImageInput(); setOpen(false); setEditing(null); setForm({ ...emptyForm }); setError(''); setNotice(''); setSaveStage(null); setUploadProgress(0); };
  const openCreate = () => { resetImageInput(); setEditing(null); setForm({ ...emptyForm, courseCode: previewCode('CRS') }); setError(''); setNotice(''); setOpen(true); };
  const openEdit = useCallback((course) => {
    resetImageInput();
    setEditing(course);
    setForm({
      courseCode: course.courseCode,
      courseName: course.courseName,
      description: course.description || '',
      teacherId: course.teacherId,
      startDate: course.startDate.slice(0, 10),
      endDate: course.endDate.slice(0, 10),
      status: course.status,
      paymentEnabled: course.paymentEnabled !== false,
      price: String(course.price ?? '1.00'),
      currency: course.currency || 'USD',
      monthlyPaymentEnabled: Boolean(course.monthlyPaymentEnabled),
      monthlyPrice: String(course.monthlyPrice ?? ''),
      discountPercent: String(course.discountPercent ?? '0'),
      discountStart: course.discountStart ? new Date(course.discountStart).toISOString().slice(0, 16) : '',
      discountEnd: course.discountEnd ? new Date(course.discountEnd).toISOString().slice(0, 16) : '',
      telegramChatId: course.telegramChatId || '',
      telegramBotToken: '',
      removeTelegramBotToken: false,
      image: null,
    });
    setError('');
    setNotice('');
    setOpen(true);
  }, []);
  const updateField = useCallback((key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value })), []);
  const completeCrop = (croppedFile) => {
    if (isImageTooLarge(croppedFile)) {
      setError(t('imageTooLarge'));
      return;
    }
    setError('');
    setForm((current) => ({ ...current, image: croppedFile }));
    setOpen(true);
    setCropFile(null);
  };
  const cancelCrop = () => {
    resetImageInput();
    setCropFile(null);
    setForm((current) => ({ ...current, image: null }));
  };
  const chooseCourseImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      resetImageInput();
      setForm((current) => ({ ...current, image: null }));
      setError(language === 'km' ? 'សូមជ្រើសរើសឯកសាររូបភាពត្រឹមត្រូវ។' : 'Please choose a valid image file.');
      return;
    }
    if (isImageTooLarge(file)) {
      resetImageInput();
      setForm((current) => ({ ...current, image: null }));
      setError(t('imageTooLarge'));
      return;
    }
    setForm((current) => ({ ...current, image: null }));
    setError('');
    setCropFile(file);
  };
  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (cropFile) {
      setError(t('completeCropBeforeSave'));
      return;
    }
    setBusy(true);
    setSaveStage({ key: 'preparing', percent: 5 });
    setUploadProgress(0);
    setError('');
    setNotice('');
    try {
      const payload = { ...form };
      if (!payload.telegramBotToken?.trim()) delete payload.telegramBotToken;
      const image = payload.image;
      delete payload.image;
      const requestPayload = image ? courseFormData(payload, image) : payload;
      const requestConfig = image ? {
        onUploadProgress: (event) => {
          const total = event.total || image.size || 1;
          const percent = Math.min(99, Math.max(1, Math.round((event.loaded / total) * 100)));
          setUploadProgress(percent);
          setSaveStage({ key: 'uploading', percent: Math.max(8, Math.round(percent * 0.78)) });
        },
      } : undefined;
      if (image) setSaveStage({ key: 'uploading', percent: 8 });
      else setSaveStage({ key: 'saving', percent: 55 });
      const response = editing
        ? await api.patch(`/courses/${editing.id}`, requestPayload, requestConfig)
        : await api.post('/courses', requestPayload, requestConfig);
      const saved = unwrap(response);
      if (image && !saved?.imageUrl) throw new Error(t('courseImageNotSaved'));
      setSaveStage({ key: 'saving', percent: 82 });
      setUploadProgress(image ? 100 : 0);
      setSaveStage({ key: 'refreshing', percent: 90 });
      const refreshed = await load();
      if (!refreshed?.data?.some((course) => course.id === saved.id)) throw new Error(t('couldNotLoadCourses'));
      if (image && !refreshed?.data?.some((course) => course.id === saved.id && course.imageUrl)) throw new Error(t('courseImageNotInTable'));
      setSaveStage({ key: 'complete', percent: 100 });
      close(true);
    } catch (e) {
      setError(e.response?.data?.message || e.message || t('couldNotSaveCourse'));
    } finally {
      setBusy(false);
      setSaveStage(null);
      setUploadProgress(0);
    }
  };
  const remove = useCallback(async (course) => {
    if (!(await ask(`${t('deleteCourseConfirm')} ${course.courseName}`))) return;
    try {
      await api.delete(`/courses/${course.id}`);
      await load();
      setError('');
      setNotice(t('deleteSuccess'));
    } catch (e) { setError(e.response?.data?.message || t('couldNotSaveCourse')); }
  }, [ask, load, t]);
  const rows = result?.data || [];

  return <>
    <Header eyebrow={t('courses')} title={t('courses')} description={t('courseDirectoryDescription')} action={<button onClick={openCreate} className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg">+ {t('newCourse')}</button>} />
    <ImageCropper file={cropFile} labels={{ title: t('cropImage'), description: t('cropImageDescription'), zoom: t('zoom'), cancel: t('cancel'), useImage: t('useCroppedImage'), processing: t('preparingImage') }} onCancel={cancelCrop} onComplete={completeCrop} onError={() => { resetImageInput(); setError(language === 'km' ? 'មិនអាចអានរូបភាពនេះបានទេ។ សូមជ្រើសរើសរូបភាពផ្សេងទៀត។' : 'This image could not be read. Please choose another image.'); setCropFile(null); }} />
    {error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {notice && <div className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200" role="status" aria-live="polite">{notice}</div>}
    {result ? <>
      <div className="mb-5 flex flex-col gap-4 rounded-[1.35rem] border border-slate-200/80 bg-white/80 p-5 shadow-sm dark:border-slate-700 dark:bg-[#111c30]/80 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-coral">{t('adminWorkspace')}</p><h2 className="mt-1 text-2xl font-extrabold text-ink dark:text-white">{result.pagination?.total ?? rows.length} {t('courses')}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{language === 'km' ? 'គ្រប់គ្រងវគ្គសិក្សា រូបភាព តម្លៃ និងការទូទាត់ពីកន្លែងតែមួយ។' : 'Manage course cards, images, pricing and payment access from one place.'}</p></div>
        <div className="flex flex-wrap gap-2 text-xs font-bold"><span className="inline-flex min-h-9 items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 shadow-sm dark:border-emerald-700/70 dark:bg-emerald-950/55 dark:text-emerald-200">{rows.filter((course) => course.status === 'ACTIVE').length} {t('active')}</span><span className="inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">{rows.filter((course) => course.paymentEnabled === false).length} {language === 'km' ? 'បិទការទូទាត់' : 'payments closed'}</span></div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"><CreateCourseCard t={t} openCreate={openCreate} />{rows.map((course) => <CourseCard key={course.id} course={course} language={language} t={t} openEdit={openEdit} remove={remove} />)}</div>
      {!rows.length && <div className="mt-5 rounded-[1.35rem] border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm font-semibold text-slate-400 dark:border-slate-700 dark:bg-[#111c30]">{t('noCourses')}</div>}
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
            <Field label={language === 'km' ? 'Telegram Chat ID សម្រាប់ស្វាគមន៍សិស្ស' : 'Telegram chat ID for welcome bot'} hint={language === 'km' ? 'បញ្ចូល chat ID របស់ group នេះ ដូចជា -1001234567890។' : 'Enter the group chat ID, for example -1001234567890.'} className="sm:col-span-2"><input value={form.telegramChatId} className="input mt-2" placeholder="-1001234567890" onChange={updateField('telegramChatId')} /></Field>
            <Field label="Telegram Bot Token (API key)" hint={language === 'km' ? 'យក Token ពី @BotFather។ ទុកទទេដើម្បីរក្សា Token ចាស់ ឬប្រើ Bot ទូទៅ។' : 'Get your token from @BotFather. Leave blank to keep the saved token or use the default bot.'} className="sm:col-span-2">
              <input type="password" autoComplete="new-password" spellCheck={false} value={form.telegramBotToken || ''} disabled={form.removeTelegramBotToken} className="input mt-2" placeholder={editing?.telegramBotConfigured ? 'Token saved — enter a new token to replace' : '123456789:YourBotToken'} onChange={updateField('telegramBotToken')} />
              {editing?.telegramBotConfigured && <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.removeTelegramBotToken} onChange={(event) => setForm((current) => ({ ...current, removeTelegramBotToken: event.target.checked, telegramBotToken: '' }))} />{language === 'km' ? 'លុប Token របស់វគ្គនេះ និងប្រើ Bot ទូទៅ' : 'Remove this course token and use the default bot'}</label>}
              {editing?.telegramBotConfigured && <button type="button" className="btn-secondary mt-3" disabled={busy || !!form.telegramBotToken || form.removeTelegramBotToken || form.telegramChatId !== editing.telegramChatId} onClick={async () => {
                setBusy(true); setError('');
                try { await api.post(`/courses/${editing.id}/telegram/connect`); setNotice(language === 'km' ? 'បានភ្ជាប់ Bot ស្វាគមន៍។' : 'Welcome bot connected.'); }
                catch (error) { setError(error.response?.data?.message || 'Could not connect the welcome bot.'); }
                finally { setBusy(false); }
              }}>{language === 'km' ? 'ភ្ជាប់ Bot ដែលបានរក្សាទុក' : 'Connect saved welcome bot'}</button>}
            </Field>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">{t('coursePeriod')}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label={t('startDate')}><input required type="date" value={form.startDate} className="input mt-2" onChange={updateField('startDate')} /></Field><Field label={t('endDate')}><input required type="date" value={form.endDate} className="input mt-2" onChange={updateField('endDate')} /></Field></div></div>
        <div className="rounded-2xl border border-sky-200/80 bg-sky-50/70 p-4 dark:border-sky-900/70 dark:bg-sky-950/25"><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={form.paymentEnabled} onChange={(event) => setForm((current) => ({ ...current, paymentEnabled: event.target.checked }))} className="mt-1 h-5 w-5 accent-[#229ed9]" /><span><span className="block text-sm font-extrabold text-ink dark:text-white">{language === 'km' ? 'បើកការទូទាត់សម្រាប់វគ្គនេះ' : 'Allow new payments for this course'}</span><span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-300">{language === 'km' ? 'បិទជម្រើសនេះ ដើម្បីលាក់ប៊ូតុងបង់ប្រាក់ពីសិស្ស និងអតិថិជន។' : 'Turn this off to hide the payment button from students and customers.'}</span></span></label></div>
        <div className="rounded-2xl bg-slate-50 p-4"><Field label={t('courseImage')} hint={t('imageSizeHint')}><input ref={imageInputRef} type="file" accept="image/*,.png,.jpg,.jpeg,.webp" className="input mt-2 p-2" onClick={(event) => { event.currentTarget.value = ''; }} onChange={chooseCourseImage} /><FileImagePreview file={form.image} label={t('useCroppedImage')} /></Field></div>
        {notice && <p className="rounded-lg bg-mint p-3 text-sm text-emerald-800">{notice}</p>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        {busy && saveStage && <UploadProgressPanel
          progress={saveStage.percent}
          label={saveStage.key === 'uploading' ? `${t('uploading')} ${uploadProgress}%` : saveStage.key === 'refreshing' ? t('loading') : saveStage.key === 'complete' ? t('courseSaved') : saveStage.key === 'preparing' ? t('preparingImage') : t('savingCourse')}
          detail={saveStage.key === 'uploading' ? t('uploadingCourseImage') : saveStage.key === 'refreshing' ? t('refreshingCourseList') : t('savingCourseData')}
          stage={saveStage.key === 'refreshing' ? t('refreshingCourseList') : saveStage.key === 'uploading' ? t('uploadingCourseImage') : t('savingCourse')}
          className="sticky bottom-0"
        />}
        <button disabled={busy} className="sticky bottom-0 w-full rounded-xl bg-navy py-3.5 font-semibold text-white shadow-lg transition hover:bg-[#1b3b5d] disabled:cursor-wait disabled:opacity-60">{busy ? t('savingCourse') : editing ? t('saveCourseChanges') : t('createCourse')}</button>
      </form>
    </Modal>
  </>;
}
