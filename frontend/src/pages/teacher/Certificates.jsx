import { useEffect, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirmDialog } from '../../context/ConfirmContext';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const mediaUrl = (path) => path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;
const isImage = (path) => /\.(png|jpe?g|webp)$/i.test(path || '');
const formatDate = (value, language) => value ? new Date(value).toLocaleDateString(language === 'km' ? 'km-KH' : 'en-US', { dateStyle: 'medium' }) : '-';
const formatFileSize = (bytes) => {
  const value = Number(bytes || 0);
  if (!value) return '-';
  return value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const emptyForm = { courseId: '', studentId: '', title: '', description: '', file: null };
const hasPermission = (user, key) => user?.role === 'ADMIN' || user?.[key] === true;

export default function Certificates({ admin = false }) {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { ask } = useConfirmDialog();
  const [rows, setRows] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const load = async (targetPage = page) => {
    try {
      const response = await api.get('/certificates', { params: { page: targetPage, limit: 10 } });
      const result = unwrap(response);
      setRows(result?.data || []);
      setPagination(result?.pagination || null);
    } catch (e) {
      setError(e.response?.data?.message || t('noRecords'));
      setRows([]);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get('/courses', { params: { limit: 100 } }),
      load(1),
    ]).then(([courseResponse]) => setCourses(unwrap(courseResponse)?.data || [])).catch(() => setCourses([]));
  }, []);

  const loadStudents = async (courseId, preferredStudentId = '') => {
    if (!courseId) return setStudents([]);
    try {
      const response = await api.get(`/courses/${courseId}/students`);
      const roster = (unwrap(response) || []).map((item) => item.student).filter(Boolean);
      setStudents(roster);
      setForm((current) => ({ ...current, studentId: preferredStudentId || current.studentId || roster[0]?.id || '' }));
    } catch (e) {
      setStudents([]);
      setError(e.response?.data?.message || t('noRecords'));
    }
  };

  const close = () => {
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setStudents([]);
    setError('');
  };

  const openCreate = () => {
    const courseId = courses[0]?.id || '';
    setEditing(null);
    setForm({ ...emptyForm, courseId });
    setError('');
    setOpen(true);
    loadStudents(courseId);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ courseId: row.courseId, studentId: row.studentId, title: row.title || '', description: row.description || '', file: null });
    setError('');
    setOpen(true);
    loadStudents(row.courseId, row.studentId);
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.courseId || !form.studentId || !form.title.trim() || (!editing && !form.file)) {
      setError(!form.file && !editing ? t('certificateFileRequired') : t('requiredFields'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (editing) {
        await api.patch(`/certificates/${editing.id}`, { title: form.title, description: form.description });
        if (form.file) {
          const fileData = new FormData();
          fileData.append('file', form.file);
          await api.post(`/certificates/${editing.id}/file`, fileData, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
      } else {
        const fileData = new FormData();
        fileData.append('courseId', form.courseId);
        fileData.append('studentId', form.studentId);
        fileData.append('title', form.title);
        fileData.append('description', form.description);
        fileData.append('file', form.file);
        await api.post('/certificates/upload', fileData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      close();
      await load(page);
    } catch (e) {
      setError(e.response?.data?.message || t('couldNotSaveRecord'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (!hasPermission(user, 'canDelete') || !(await ask(t('deleteRecordConfirm')))) return;
    try {
      await api.delete(`/certificates/${row.id}`);
      await load(page);
    } catch (e) {
      setError(e.response?.data?.message || t('couldNotSaveRecord'));
    }
  };

  return <>
    <Header eyebrow={admin ? 'adminTools' : 'teacherWorkspace'} title="certificates" description={admin ? 'certificatesAdminDescription' : 'certificatesTeacherDescription'} action={hasPermission(user, 'canCreate') ? <button type="button" onClick={openCreate} disabled={!courses.length} className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">+ {t('issueCertificate')}</button> : null} />
    <div className="mb-5 grid gap-4 md:grid-cols-[1.3fr_.7fr]">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-slate-900">
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-700 dark:text-emerald-300">{t('certificateWorkflow')}</p>
        <h2 className="mt-2 text-xl font-extrabold text-ink dark:text-white">{t('certificateWorkflowTitle')}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-300">{t(admin ? 'certificatesAdminDescription' : 'certificatesTeacherDescription')}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('certificatesIssued')}</p>
        <p className="mt-2 text-3xl font-extrabold text-ink dark:text-white">{pagination?.total ?? rows?.length ?? 0}</p>
      </div>
    </div>
    {error && !open && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {rows === null ? <Loading /> : <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300"><tr><th className="px-5 py-4">{t('certificateTitle')}</th><th className="px-5 py-4">{t('course')}</th><th className="px-5 py-4">{t('student')}</th><th className="px-5 py-4">{t('issuedAt')}</th><th className="px-5 py-4">{t('certificateFile')}</th><th className="px-5 py-4">{t('actions')}</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{rows.map((row) => <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50"><td className="px-5 py-4"><p className="font-semibold text-ink dark:text-white">{row.title}</p>{row.description && <p className="mt-1 max-w-xs truncate text-xs text-slate-500" title={row.description}>{row.description}</p>}</td><td className="px-5 py-4 text-slate-600 dark:text-slate-300">{row.course?.courseName || '-'}</td><td className="px-5 py-4"><p className="font-semibold text-ink dark:text-white">{row.student?.user?.fullName || '-'}</p><p className="text-xs text-slate-500">{row.student?.user?.email || ''}</p></td><td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-300">{formatDate(row.issuedAt, language)}</td><td className="px-5 py-4"><a href={mediaUrl(row.fileUrl)} target="_blank" rel="noreferrer" className="inline-flex max-w-48 items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200">{isImage(row.fileUrl) ? <img src={mediaUrl(row.fileUrl)} alt={row.title} className="h-8 w-8 rounded object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded bg-red-100 text-[10px] font-bold text-red-700">PDF</span>}<span className="truncate">{row.originalName}</span></a><span className="ml-2 text-xs text-slate-400">{formatFileSize(row.fileSize)}</span></td><td className="px-5 py-4"><div className="flex gap-2"><button type="button" disabled={!hasPermission(user, 'canEdit')} onClick={() => openEdit(row)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200">{t('edit')}</button><button type="button" disabled={!hasPermission(user, 'canDelete')} onClick={() => remove(row)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-40">{t('delete')}</button></div></td></tr>)}</tbody></table></div>
        {!rows.length && <p className="p-10 text-center text-sm text-slate-500">{t('noCertificates')}</p>}
      </div>
      <Pagination value={pagination} onChange={(nextPage) => { setPage(nextPage); load(nextPage); }} />
    </>}
    <Modal open={open} title={editing ? t('editCertificate') : t('issueCertificate')} onClose={close}>
      <form onSubmit={save} className="space-y-4">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('course')}<select required disabled={!!editing} value={form.courseId} className="input mt-2" onChange={(event) => { const courseId = event.target.value; setForm({ ...form, courseId, studentId: '' }); loadStudents(courseId); }}><option value="">{t('selectCourse')}</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.courseCode} · {course.courseName}</option>)}</select></label>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('student')}<select required disabled={!!editing} value={form.studentId} className="input mt-2" onChange={(event) => setForm({ ...form, studentId: event.target.value })}><option value="">{t('selectStudent')}</option>{students.map((student) => <option key={student.id} value={student.id}>{student.studentCode} · {student.user?.fullName}</option>)}</select></label>
        <input required value={form.title} className="input" placeholder={t('certificateTitle')} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <textarea rows="4" value={form.description} className="input" placeholder={t('certificateDescription')} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        {editing?.fileUrl && <a href={mediaUrl(editing.fileUrl)} target="_blank" rel="noreferrer" className="block rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">{t('viewCurrent')} · {editing.originalName}</a>}
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{editing ? t('replaceCertificate') : t('certificateFile')}<span className="mt-1 block text-xs font-normal text-slate-400">{t('certificateFileHint')}</span><input type="file" required={!editing} accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*" className="input mt-2 p-2" onChange={(event) => setForm({ ...form, file: event.target.files?.[0] || null })} /></label>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <button disabled={busy || (editing ? !hasPermission(user, 'canEdit') : !hasPermission(user, 'canCreate'))} className="w-full rounded-xl bg-navy py-3.5 font-semibold text-white disabled:opacity-60">{busy ? t('uploadingFile') : editing ? t('saveChanges') : t('sendCertificate')}</button>
      </form>
    </Modal>
  </>;
}
