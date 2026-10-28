import { useEffect, useMemo, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import Header from '../../components/Header';
import Table from '../../components/Table';
import Loading from '../../components/Loading';
import Modal from '../../components/Modal';
import { useLanguage } from '../../context/LanguageContext';

const emptyForm = { courseId: '', studentId: '', attendanceDate: new Date().toISOString().slice(0, 10), status: 'PRESENT', note: '' };
const statuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

export default function Attendance() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [rows, setRows] = useState(null);
  const [courses, setCourses] = useState([]);
  const [courseStudents, setCourseStudents] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const students = useMemo(() => courseStudents[form.courseId] || [], [courseStudents, form.courseId]);
  const summary = useMemo(() => {
    const records = rows || [];
    const count = (status) => records.filter((record) => record.status === status).length;
    const present = count('PRESENT');
    return { total: records.length, present, absent: count('ABSENT'), late: count('LATE'), excused: count('EXCUSED'), rate: records.length ? Math.round((present / records.length) * 100) : 0 };
  }, [rows]);

  const load = async () => {
    try {
      const [attendanceResponse, coursesResponse] = await Promise.all([
        api.get('/attendance'),
        api.get('/courses', { params: { limit: 100 } }),
      ]);
      const teacherCourses = unwrap(coursesResponse).data || [];
      const studentResponses = await Promise.all(teacherCourses.map((course) => api.get(`/courses/${course.id}/students`)));
      const studentMap = Object.fromEntries(teacherCourses.map((course, index) => [course.id, (unwrap(studentResponses[index]) || []).map((enrollment) => enrollment.student)]));
      setRows(unwrap(attendanceResponse));
      setCourses(teacherCourses);
      setCourseStudents(studentMap);
    } catch (e) {
      setError(e.response?.data?.message || t('noAttendance'));
      setRows([]);
    }
  };

  useEffect(() => { load(); }, []);

  const close = () => { setOpen(false); setEditing(null); setForm({ ...emptyForm }); setError(''); };
  const openCreate = () => {
    const courseId = courses[0]?.id || '';
    const firstStudent = courseStudents[courseId]?.[0];
    setEditing(null);
    setForm({ ...emptyForm, courseId, studentId: firstStudent?.id || '' });
    setError('');
    setOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setForm({ courseId: row.courseId, studentId: row.studentId, attendanceDate: row.attendanceDate?.slice(0, 10), status: row.status, note: row.note || '' });
    setError('');
    setOpen(true);
  };
  const changeCourse = (courseId) => {
    setForm((current) => ({ ...current, courseId, studentId: courseStudents[courseId]?.[0]?.id || '' }));
  };
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { ...form };
      if (editing) await api.patch(`/attendance/${editing.id}`, payload);
      else await api.post('/attendance', payload);
      close();
      await load();
    } catch (e) {
      setError(e.response?.data?.message || t('couldNotSaveAttendance'));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (row) => {
    if (!user?.canDelete || !window.confirm(t('deleteAttendanceConfirm'))) return;
    try {
      await api.delete(`/attendance/${row.id}`);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || t('couldNotSaveAttendance'));
    }
  };

  const columns = [
    { key: 'course', label: t('course'), render: (row) => row.course?.courseName || '-' },
    { key: 'student', label: t('student'), render: (row) => row.student?.user?.fullName || '-' },
    { key: 'attendanceDate', label: t('date'), render: (row) => new Date(row.attendanceDate).toLocaleDateString() },
    { key: 'status', label: t('status'), render: (row) => <span className="badge bg-mint text-emerald-800">{row.status}</span> },
    { key: 'note', label: t('noteOptional'), render: (row) => row.note || '-' },
    { key: 'actions', label: t('actions'), render: (row) => <div className="flex gap-2"><button disabled={!user?.canEdit} onClick={() => openEdit(row)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40">{t('edit')}</button><button disabled={!user?.canDelete} onClick={() => remove(row)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-40">{t('delete')}</button></div> },
  ];

  return <><Header eyebrow="teacherWorkspace" title={t('attendance')} description={t('teacherAttendanceDescription')} action={user?.canCreate ? <button onClick={openCreate} disabled={!courses.length} className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">+ {t('addAttendance')}</button> : null} />{error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}{rows ? <><div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6"><AttendanceStat label={t('totalAttendance')} value={summary.total} accent="bg-navy" /><AttendanceStat label={t('present')} value={summary.present} accent="bg-emerald-400" /><AttendanceStat label={t('absent')} value={summary.absent} accent="bg-rose-400" /><AttendanceStat label={t('late')} value={summary.late} accent="bg-amber-400" /><AttendanceStat label={t('excused')} value={summary.excused} accent="bg-[#7c8cf8]" /><AttendanceStat label={t('attendanceRate')} value={`${summary.rate}%`} accent="bg-coral" /></div><Table columns={columns} rows={rows} empty={t('noAttendance')} /></> : <Loading />}<Modal open={open} title={editing ? t('editAttendance') : t('addAttendance')} onClose={close}><form onSubmit={save} className="grid gap-4 sm:grid-cols-2"><select required value={form.courseId} className="input" onChange={(event) => changeCourse(event.target.value)}><option value="">{t('selectCourse')}</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.courseCode} - {course.courseName}</option>)}</select><select required value={form.studentId} className="input" onChange={(event) => setForm({ ...form, studentId: event.target.value })}><option value="">{t('selectStudent')}</option>{students.map((student) => <option key={student.id} value={student.id}>{student.studentCode} - {student.user?.fullName}</option>)}</select><input required type="date" value={form.attendanceDate} className="input" onChange={(event) => setForm({ ...form, attendanceDate: event.target.value })} /><select value={form.status} className="input" onChange={(event) => setForm({ ...form, status: event.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select><input value={form.note} className="input sm:col-span-2" placeholder={t('noteOptional')} onChange={(event) => setForm({ ...form, note: event.target.value })} />{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 sm:col-span-2">{error}</p>}<button disabled={busy} className="w-full rounded-xl bg-navy py-3 font-semibold text-white disabled:opacity-60 sm:col-span-2">{busy ? t('savingAttendance') : editing ? t('saveChanges') : t('createAttendance')}</button></form></Modal></>;
}

function AttendanceStat({ label, value, accent }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><span className={`h-2.5 w-2.5 rounded-full ${accent}`} /></div><p className="mt-3 text-2xl font-extrabold text-ink">{value}</p></div>;
}
