import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { unwrap } from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import Header from '../../components/Header';
import Table from '../../components/Table';
import Loading from '../../components/Loading';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const mediaUrl = (path) => path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;
const isImage = (path) => /\.(png|jpe?g|webp)$/i.test(path || '');
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '-';
const config = {
  courses: ['/courses', 'Course catalog'],
  schedule: ['/schedules', 'Class schedule'],
  homework: ['/submissions/my', 'Homework'],
  grades: ['/grades/me', 'Grades'],
  attendance: ['/attendance/me', 'Attendance'],
  exams: ['/exam-results/me', 'Exam results'],
  announcements: ['/announcements', 'Announcements'],
};

export default function Simple() {
  const { section } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [purchaseBusy, setPurchaseBusy] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [coursePage, setCoursePage] = useState(1);
  const item = config[section];

  const load = () => item && api.get(item[0]).then((response) => setData(unwrap(response))).catch((e) => {
    setError(e.response?.data?.message || 'Could not load this page.');
    setData([]);
  });

  const loadCourses = async () => {
    try {
      const [catalogResponse, enrolledResponse] = await Promise.all([
        api.get('/courses', { params: { status: 'ACTIVE', limit: 100 } }),
        api.get('/enrollments/me'),
      ]);
      setData(unwrap(catalogResponse));
      setEnrolledIds(new Set((unwrap(enrolledResponse) || []).map((enrollment) => enrollment.courseId)));
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load courses.');
      setData([]);
    }
  };

  useEffect(() => {
    setData(null);
    setError('');
    setSelectedCourse(null);
    setCoursePage(1);
    if (section === 'courses') loadCourses();
    else load();
    if (section === 'homework') {
      api.get('/assignments', { params: { limit: 100 } }).then((response) => setAssignments(unwrap(response).data || []));
    }
  }, [section]);

  const rows = Array.isArray(data) ? data : data?.data || [];
  const coursePageSize = 9;
  const courseRows = rows.slice((coursePage - 1) * coursePageSize, coursePage * coursePageSize);
  const courseTotalPages = Math.ceil(rows.length / coursePageSize);
  const close = () => {
    setOpen(false);
    setEditing(null);
    setAnswerText('');
    setAssignmentId('');
    setFile(null);
  };
  const startEdit = (row) => {
    setEditing(row);
    setAnswerText(row.answerText || '');
    setAssignmentId(row.assignmentId || '');
    setFile(null);
    setOpen(true);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!answerText.trim() && !file && !editing?.fileUrl) {
      setError('Write an answer or attach a file before submitting.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (editing) await api.patch(`/submissions/${editing.id}`, { answerText });
      else await api.post('/submissions', { assignmentId, answerText });
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadUrl = editing ? `/submissions/${editing.id}/file` : `/submissions/${assignmentId}/upload`;
        await api.post(uploadUrl, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      close();
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not save homework.');
    } finally {
      setBusy(false);
    }
  };
  const remove = async (row) => {
    if (!user?.canDelete || !window.confirm('Delete this submission?')) return;
    try {
      await api.delete(`/submissions/${row.id}`);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not delete submission.');
    }
  };
  const buyCourse = async (course) => {
    if (!user?.canCreate || enrolledIds.has(course.id)) return;
    if (!window.confirm(`Enroll in ${course.courseName}?`)) return;
    setPurchaseBusy(course.id);
    setError('');
    try {
      await api.post(`/enrollments/buy/${course.id}`);
      await loadCourses();
      setSelectedCourse(null);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not enroll in this course.');
    } finally {
      setPurchaseBusy('');
    }
  };
  const attachmentCell = (row) => row.fileUrl ? <a href={mediaUrl(row.fileUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-mint">{isImage(row.fileUrl) ? <img src={mediaUrl(row.fileUrl)} alt="Submission attachment" className="h-8 w-8 rounded object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded bg-red-100 text-[10px] font-bold text-red-700">FILE</span>}<span>Open file</span></a> : <span className="text-xs text-slate-400">No file</span>;
  const title = item?.[1] || 'Student workspace';
  const selectedAssignment = assignments.find((assignment) => assignment.id === assignmentId);
  const gradeColumns = [
    { key: 'assignment', label: 'Assignment', render: (r) => r.submission?.assignment?.title || '-' },
    { key: 'course', label: 'Course', render: (r) => r.submission?.assignment?.course?.courseName || '-' },
    { key: 'score', label: 'Score', render: (r) => { const max = r.submission?.assignment?.maxScore; return max ? `${r.score} / ${max}` : r.score; } },
    { key: 'result', label: 'Result', render: (r) => { const max = r.submission?.assignment?.maxScore; const percent = max ? Math.round((Number(r.score) / Number(max)) * 100) : null; return <span className="badge bg-mint text-emerald-800">{percent === null ? '-' : `${percent}%`}</span>; } },
    { key: 'feedback', label: 'Teacher feedback', render: (r) => <span className="block max-w-xs truncate" title={r.feedback || ''}>{r.feedback || 'No feedback yet'}</span> },
    { key: 'gradedAt', label: 'Graded', render: (r) => formatDate(r.gradedAt) },
  ];
  const attendanceColumns = [
    { key: 'course', label: 'Course', render: (r) => r.course?.courseName || r.courseId },
    { key: 'attendanceDate', label: 'Attendance date', render: (r) => formatDate(r.attendanceDate) },
    { key: 'status', label: 'Status', render: (r) => { const styles = { PRESENT: 'bg-mint text-emerald-800', ABSENT: 'bg-red-50 text-red-700', LATE: 'bg-amber-50 text-amber-700', EXCUSED: 'bg-indigo-50 text-indigo-700' }; return <span className={`badge ${styles[r.status] || 'bg-slate-100 text-slate-700'}`}>{r.status}</span>; } },
    { key: 'note', label: 'Note', render: (r) => r.note || '-' },
  ];
  const examResultColumns = [
    { key: 'exam', label: 'Exam', render: (r) => r.exam?.title || '-' },
    { key: 'course', label: 'Course', render: (r) => r.exam?.course?.courseName || r.exam?.courseId || '-' },
    { key: 'examDate', label: 'Exam date', render: (r) => r.exam?.examDate ? formatDate(r.exam.examDate) : '-' },
    { key: 'score', label: 'Score', render: (r) => r.exam?.maxScore ? `${r.score} / ${r.exam.maxScore}` : r.score },
    { key: 'result', label: 'Result', render: (r) => { const max = r.exam?.maxScore; const percent = max ? Math.round((Number(r.score) / Number(max)) * 100) : null; return <span className="badge bg-mint text-emerald-800">{percent === null ? '-' : `${percent}%`}</span>; } },
    { key: 'feedback', label: 'Feedback', render: (r) => <span className="block max-w-xs truncate" title={r.feedback || ''}>{r.feedback || 'No feedback yet'}</span> },
    { key: 'createdAt', label: 'Recorded', render: (r) => formatDate(r.createdAt) },
  ];
  const columns = section === 'homework' ? [
    { key: 'assignment', label: 'Homework', render: (r) => r.assignment?.title },
    { key: 'course', label: 'Course', render: (r) => r.assignment?.course?.courseName },
    { key: 'answer', label: 'Your answer', render: (r) => <span className="block max-w-xs truncate" title={r.answerText || ''}>{r.answerText || (r.fileUrl ? 'File attached' : 'No answer')}</span> },
    { key: 'attachment', label: 'Attachment', render: attachmentCell },
    { key: 'submittedAt', label: 'Submitted', render: (r) => formatDate(r.submittedAt) },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', render: (r) => <div className="flex gap-2"><button disabled={!user?.canEdit || !!r.grade} onClick={() => startEdit(r)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40">Edit</button><button disabled={!user?.canDelete || !!r.grade} onClick={() => remove(r)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-40">Delete</button></div> },
  ] : section === 'grades' ? gradeColumns : section === 'attendance' ? attendanceColumns : section === 'exams' ? examResultColumns : section === 'schedule' ? [
    { key: 'course', label: 'Course', render: (r) => r.course?.courseName || r.courseId },
    { key: 'dayOfWeek', label: 'Day of week' },
    { key: 'startTime', label: 'Start time' },
    { key: 'endTime', label: 'End time' },
    { key: 'room', label: 'Room', render: (r) => r.room || '-' },
    { key: 'description', label: 'Description', render: (r) => r.description || '-' },
  ] : rows.length ? Object.keys(rows[0]).filter((key) => !['course', 'assignment', 'exam'].includes(key)).slice(0, 7).map((key) => ({ key, label: key.replace(/[A-Z]/g, (m) => ` ${m}`).replace(/^./, (m) => m.toUpperCase()), render: (r) => typeof r[key] === 'object' ? JSON.stringify(r[key]) : String(r[key] ?? '-') })) : [{ key: 'message', label: 'Status', render: () => 'Nothing here yet.' }];
  const courseCatalog = <><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{courseRows.map((course) => { const enrolled = enrolledIds.has(course.id); return <article key={course.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"><div className="h-40 bg-gradient-to-br from-[#dff8ee] via-[#eef4ff] to-[#fff0ea]">{course.imageUrl ? <img src={mediaUrl(course.imageUrl)} alt={course.courseName} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-5xl font-extrabold text-navy/20">{course.courseName?.charAt(0) || 'C'}</div>}</div><div className="p-5"><div className="mb-2 flex items-start justify-between gap-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{course.courseCode}</span><span className="badge bg-mint text-emerald-800">{enrolled ? 'Enrolled' : 'Available'}</span></div><h2 className="text-lg font-bold text-ink">{course.courseName}</h2><p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">{course.description || 'Learn with guided lessons, assignments and teacher support.'}</p><p className="mt-4 text-sm text-slate-500">Teacher: <span className="font-semibold text-slate-700">{course.teacher?.user?.fullName || 'Assigned teacher'}</span></p><div className="mt-5 flex gap-2"><button onClick={() => setSelectedCourse(course)} className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">View details</button><button disabled={enrolled || purchaseBusy === course.id || !user?.canCreate} onClick={() => buyCourse(course)} className="flex-1 rounded-xl bg-navy px-3 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{purchaseBusy === course.id ? 'Joining...' : enrolled ? 'Enrolled' : 'Buy / enroll'}</button></div></div></article>; })}</div><Pagination value={courseTotalPages > 1 ? { page: coursePage, limit: coursePageSize, total: rows.length, totalPages: courseTotalPages } : null} onChange={setCoursePage} /></>;
  return <><Header eyebrow="Student space" title={title} description={section === 'courses' ? 'Explore all active courses and join the classes you want to study.' : section === 'homework' ? 'Submit, update or remove your own homework before it is graded.' : 'Review the latest information for your learning journey.'} action={section === 'homework' && user?.canCreate ? <button onClick={() => { setEditing(null); setAnswerText(''); setAssignmentId(''); setFile(null); setOpen(true); }} className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white">+ Submit homework</button> : null} />{error && <div className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">{error}</div>}{data ? section === 'courses' ? (rows.length ? courseCatalog : <div className="card text-center text-slate-500">No active courses are available right now.</div>) : <Table columns={columns} rows={rows} empty="Nothing here yet." /> : <Loading />}<Modal open={section === 'courses' && !!selectedCourse} title={selectedCourse?.courseName || 'Course details'} onClose={() => setSelectedCourse(null)}>{selectedCourse && <div className="space-y-4"><div className="h-48 overflow-hidden rounded-2xl bg-gradient-to-br from-[#dff8ee] via-[#eef4ff] to-[#fff0ea]">{selectedCourse.imageUrl ? <img src={mediaUrl(selectedCourse.imageUrl)} alt={selectedCourse.courseName} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-6xl font-extrabold text-navy/20">{selectedCourse.courseName?.charAt(0) || 'C'}</div>}</div><div><p className="text-xs font-bold uppercase tracking-wider text-coral">{selectedCourse.courseCode}</p><h3 className="mt-1 text-2xl font-bold text-ink">{selectedCourse.courseName}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{selectedCourse.description || 'Course information will be provided by the teacher.'}</p></div><div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2"><p><span className="text-slate-500">Teacher</span><br /><strong>{selectedCourse.teacher?.user?.fullName || 'Assigned teacher'}</strong></p><p><span className="text-slate-500">Course period</span><br /><strong>{formatDate(selectedCourse.startDate)} - {formatDate(selectedCourse.endDate)}</strong></p></div><button disabled={enrolledIds.has(selectedCourse.id) || purchaseBusy === selectedCourse.id || !user?.canCreate} onClick={() => buyCourse(selectedCourse)} className="w-full rounded-xl bg-navy py-3 font-semibold text-white disabled:opacity-50">{purchaseBusy === selectedCourse.id ? 'Joining...' : enrolledIds.has(selectedCourse.id) ? 'Already enrolled' : 'Buy / enroll in this course'}</button></div>}</Modal><Modal open={open} title={editing ? 'Edit submission' : 'Submit homework'} onClose={close}><form onSubmit={submit} className="space-y-3">{!editing && <><select required value={assignmentId} className="input" onChange={(e) => setAssignmentId(e.target.value)}><option value="">Select homework</option>{assignments.map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.title} - {assignment.course?.courseName}</option>)}</select>{selectedAssignment?.attachmentUrl && <a href={mediaUrl(selectedAssignment.attachmentUrl)} target="_blank" rel="noreferrer" className="block rounded-lg bg-mint p-3 text-sm font-semibold text-emerald-800">Open assignment attachment</a>}</>}{editing?.fileUrl && <a href={mediaUrl(editing.fileUrl)} target="_blank" rel="noreferrer" className="block rounded-lg bg-slate-100 p-3 text-sm font-semibold text-slate-700">Open current submission file</a>}<textarea rows="7" value={answerText} className="input" placeholder="Write your answer (optional if you attach a file)..." onChange={(e) => setAnswerText(e.target.value)} /><label className="block text-sm font-semibold text-slate-700">Attach image or file <span className="font-normal text-slate-400">(PDF, image or document; up to 100 MB, images up to 50 MB)</span>{file && <span className="mt-2 block rounded-lg bg-mint p-3 text-xs font-semibold text-emerald-800">Selected: {file.name}</span>}<input type="file" accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip,application/pdf,image/*" className="input mt-2 p-2" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label><button disabled={busy} className="w-full rounded-xl bg-navy py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Uploading...' : editing ? 'Save changes' : 'Submit homework'}</button></form></Modal></>;
}
