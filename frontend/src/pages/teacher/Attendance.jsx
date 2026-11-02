import { useEffect, useMemo, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import Header from '../../components/Header';
import Table from '../../components/Table';
import Loading from '../../components/Loading';
import Modal from '../../components/Modal';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirmDialog } from '../../context/ConfirmContext';
import TeacherAttendancePanel from '../../components/TeacherAttendancePanel';

const emptyForm = { courseId: '', studentId: '', attendanceDate: new Date().toISOString().slice(0, 10), status: 'PRESENT', note: '' };
const statuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

export default function Attendance() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { ask } = useConfirmDialog();
  const [rows, setRows] = useState(null);
  const [courses, setCourses] = useState([]);
  const [courseStudents, setCourseStudents] = useState({});
  const [callableStudents, setCallableStudents] = useState({});
  const [callCooldowns, setCallCooldowns] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const students = useMemo(() => {
    const source = editing ? courseStudents : callableStudents;
    const available = source[form.courseId] || [];
    if (!editing?.studentId) return available;
    const current = (courseStudents[form.courseId] || []).find((student) => student.id === editing.studentId);
    return current && !available.some((student) => student.id === current.id) ? [current, ...available] : available;
  }, [callableStudents, courseStudents, editing, form.courseId]);
  const cooldowns = callCooldowns[form.courseId] || [];
  const callCopy = language === 'km'
    ? { title: 'សិស្សដែលបានហៅថ្មីៗ', empty: 'មិនមានសិស្សកំពុងរង់ចាំទេ', reset: 'Reset ម៉ោង', available: 'អាចហៅវិញនៅ' }
    : { title: 'Students called recently', empty: 'No students are waiting.', reset: 'Reset timer', available: 'Available again' };
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
      const callableResponses = await Promise.allSettled(teacherCourses.map((course) => api.get('/attendance/callable-students', { params: { courseId: course.id } })));
      const nextCallableStudents = {};
      const nextCooldowns = {};
      teacherCourses.forEach((course, index) => {
        const response = callableResponses[index];
        if (response?.status !== 'fulfilled') {
          nextCallableStudents[course.id] = studentMap[course.id] || [];
          nextCooldowns[course.id] = [];
          return;
        }
        const data = unwrap(response.value) || {};
        nextCallableStudents[course.id] = Array.isArray(data.students) ? data.students : (studentMap[course.id] || []);
        nextCooldowns[course.id] = Array.isArray(data.cooldowns) ? data.cooldowns : [];
      });
      setRows(unwrap(attendanceResponse));
      setCourses(teacherCourses);
      setCourseStudents(studentMap);
      setCallableStudents(nextCallableStudents);
      setCallCooldowns(nextCooldowns);
    } catch (e) {
      setError(e.response?.data?.message || t('noAttendance'));
      setRows([]);
    }
  };

  useEffect(() => { load(); }, []);

  const close = () => { setOpen(false); setEditing(null); setForm({ ...emptyForm }); setError(''); };
  const openCreate = () => {
    const courseId = courses[0]?.id || '';
    const firstStudent = callableStudents[courseId]?.[0];
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
    const source = editing ? courseStudents : callableStudents;
    setForm((current) => ({ ...current, courseId, studentId: source[courseId]?.[0]?.id || '' }));
  };
  const resetCallCooldown = async (studentId) => {
    setBusy(`reset:${studentId}`);
    setError('');
    try {
      await api.post(`/attendance/call-cooldowns/${studentId}/reset`, { courseId: form.courseId });
      await load();
    } catch (e) {
      setError(e.response?.data?.message || t('couldNotSaveAttendance'));
    } finally {
      setBusy('');
    }
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
    if (!user?.canDelete || !(await ask(t('deleteAttendanceConfirm')))) return;
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

  return (
    <>
      <Header eyebrow="teacherWorkspace" title={t('attendance')} description={t('teacherAttendanceDescription')} action={user?.canCreate ? <button onClick={openCreate} disabled={!courses.length} className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">+ {t('addAttendance')}</button> : null} />
      <TeacherAttendancePanel />
      {error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {rows ? <><div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6"><AttendanceStat label={t('totalAttendance')} value={summary.total} accent="bg-navy" /><AttendanceStat label={t('present')} value={summary.present} accent="bg-emerald-400" /><AttendanceStat label={t('absent')} value={summary.absent} accent="bg-rose-400" /><AttendanceStat label={t('late')} value={summary.late} accent="bg-amber-400" /><AttendanceStat label={t('excused')} value={summary.excused} accent="bg-[#7c8cf8]" /><AttendanceStat label={t('attendanceRate')} value={`${summary.rate}%`} accent="bg-coral" /></div><Table columns={columns} rows={rows} empty={t('noAttendance')} /></> : <Loading />}
      <Modal open={open} title={editing ? t('editAttendance') : t('addAttendance')} onClose={close}>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <select required value={form.courseId} className="input" onChange={(event) => changeCourse(event.target.value)}><option value="">{t('selectCourse')}</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.courseCode} - {course.courseName}</option>)}</select>
          <select required value={form.studentId} className="input" onChange={(event) => setForm({ ...form, studentId: event.target.value })}>
            <option value="">{t('selectStudent')}</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.studentCode} - {student.user?.fullName}</option>)}
          </select>
          <input required type="date" value={form.attendanceDate} className="input" onChange={(event) => setForm({ ...form, attendanceDate: event.target.value })} />
          <select value={form.status} className="input" onChange={(event) => setForm({ ...form, status: event.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
          <input value={form.note} className="input sm:col-span-2" placeholder={t('noteOptional')} onChange={(event) => setForm({ ...form, note: event.target.value })} />
          {!editing && form.courseId && <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:col-span-2 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-sm font-black text-amber-900 dark:text-amber-200">{callCopy.title}</p><p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{language === 'km' ? 'បាត់ពីបញ្ជី ២០ ម៉ោង បន្ទាប់ពីហៅរួច' : 'A student becomes selectable again after 20 hours.'}</p></div>
              <span className="rounded-full bg-amber-200 px-2.5 py-1 text-[11px] font-black text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">20h</span>
            </div>
            {cooldowns.length ? <div className="mt-3 space-y-2">{cooldowns.map((cooldown) => <div key={cooldown.studentId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-white/75 px-3 py-2.5 dark:border-amber-900/50 dark:bg-slate-900/40"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{cooldown.student?.user?.fullName || cooldown.student?.studentCode || cooldown.studentId}</p><p className="text-[11px] text-slate-500 dark:text-slate-400">{callCopy.available}: {new Date(cooldown.availableAt).toLocaleString(language === 'km' ? 'km-KH' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p></div><button type="button" disabled={Boolean(busy)} onClick={() => resetCallCooldown(cooldown.studentId)} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-black text-white transition hover:bg-amber-700 disabled:opacity-50">{busy === `reset:${cooldown.studentId}` ? t('saving') : callCopy.reset}</button></div>)}</div> : <p className="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{callCopy.empty}</p>}
          </div>}
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 sm:col-span-2">{error}</p>}
          <button disabled={Boolean(busy)} className="w-full rounded-xl bg-navy py-3 font-semibold text-white disabled:opacity-60 sm:col-span-2">{busy ? t('savingAttendance') : editing ? t('saveChanges') : t('createAttendance')}</button>
        </form>
      </Modal>
    </>
  );
}

function AttendanceStat({ label, value, accent }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><span className={`h-2.5 w-2.5 rounded-full ${accent}`} /></div><p className="mt-3 text-2xl font-extrabold text-ink">{value}</p></div>;
}
