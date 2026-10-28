import { useEffect, useMemo, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import Header from '../../components/Header';
import Table from '../../components/Table';
import Loading from '../../components/Loading';
import Modal from '../../components/Modal';

const emptyForm = { courseId: '', studentId: '', attendanceDate: new Date().toISOString().slice(0, 10), status: 'PRESENT', note: '' };
const statuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

export default function Attendance() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [courses, setCourses] = useState([]);
  const [courseStudents, setCourseStudents] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const students = useMemo(() => courseStudents[form.courseId] || [], [courseStudents, form.courseId]);

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
      setError(e.response?.data?.message || 'Could not load attendance records.');
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
      setError(e.response?.data?.message || 'Could not save attendance record.');
    } finally {
      setBusy(false);
    }
  };
  const remove = async (row) => {
    if (!user?.canDelete || !window.confirm('Delete this attendance record?')) return;
    try {
      await api.delete(`/attendance/${row.id}`);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not delete attendance record.');
    }
  };

  const columns = [
    { key: 'course', label: 'Course', render: (row) => row.course?.courseName || '-' },
    { key: 'student', label: 'Student', render: (row) => row.student?.user?.fullName || '-' },
    { key: 'attendanceDate', label: 'Date', render: (row) => new Date(row.attendanceDate).toLocaleDateString() },
    { key: 'status', label: 'Status', render: (row) => <span className="badge bg-mint text-emerald-800">{row.status}</span> },
    { key: 'note', label: 'Note', render: (row) => row.note || '-' },
    { key: 'actions', label: 'Actions', render: (row) => <div className="flex gap-2"><button disabled={!user?.canEdit} onClick={() => openEdit(row)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40">Edit</button><button disabled={!user?.canDelete} onClick={() => remove(row)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-40">Delete</button></div> },
  ];

  return <><Header eyebrow="Teacher workspace" title="Attendance" description="Create, update and manage attendance for your assigned courses." action={user?.canCreate ? <button onClick={openCreate} disabled={!courses.length} className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">+ Add attendance</button> : null} />{error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}{rows ? <Table columns={columns} rows={rows} empty="No attendance records found." /> : <Loading />}<Modal open={open} title={editing ? 'Edit attendance' : 'Add attendance'} onClose={close}><form onSubmit={save} className="space-y-3"><select required value={form.courseId} className="input" onChange={(event) => changeCourse(event.target.value)}><option value="">Select course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.courseCode} - {course.courseName}</option>)}</select><select required value={form.studentId} className="input" onChange={(event) => setForm({ ...form, studentId: event.target.value })}><option value="">Select student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.studentCode} - {student.user?.fullName}</option>)}</select><input required type="date" value={form.attendanceDate} className="input" onChange={(event) => setForm({ ...form, attendanceDate: event.target.value })} /><select value={form.status} className="input" onChange={(event) => setForm({ ...form, status: event.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select><input value={form.note} className="input" placeholder="Note (optional)" onChange={(event) => setForm({ ...form, note: event.target.value })} />{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}<button disabled={busy} className="w-full rounded-xl bg-navy py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Saving...' : editing ? 'Save changes' : 'Create attendance'}</button></form></Modal></>;
}
