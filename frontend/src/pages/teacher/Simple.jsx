import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { unwrap } from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import Header from '../../components/Header';
import Table from '../../components/Table';
import Loading from '../../components/Loading';
import Modal from '../../components/Modal';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const mediaUrl = (path) => path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;
const isImage = (path) => /\.(png|jpe?g|webp)$/i.test(path || '');
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '-';
const titles = { courses: 'My courses', assignments: 'Assignments', submissions: 'Submissions', attendance: 'Attendance', exams: 'Exams', announcements: 'Announcements' };
const editable = ['assignments', 'exams', 'announcements'];
const blank = { courseId: '', title: '', description: '', maxScore: 100, dueDate: '', examDate: '', content: '', file: null };

export default function Simple() {
  const { section } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...blank });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const endpoint = { courses: '/courses', assignments: '/assignments', submissions: '/submissions', attendance: '/attendance', exams: '/exams', announcements: '/announcements' }[section] || '/announcements';
  const load = () => api.get(endpoint, { params: { limit: 100 } }).then((response) => setData(unwrap(response))).catch((e) => { setError(e.response?.data?.message || 'Could not load records.'); setData([]); });

  useEffect(() => {
    setData(null);
    setError('');
    load();
    if (editable.includes(section)) api.get('/courses', { params: { limit: 100 } }).then((response) => setCourses(unwrap(response).data || []));
  }, [section]);

  const rows = Array.isArray(data) ? data : data?.data || [];
  const hasAssignedCourse = courses.length > 0;
  const close = () => { setOpen(false); setEditing(null); setForm({ ...blank }); setError(''); };
  const edit = (row) => { setEditing(row); setForm({ courseId: row.courseId || '', title: row.title || '', description: row.description || '', maxScore: row.maxScore || 100, dueDate: row.dueDate ? row.dueDate.slice(0, 16) : '', examDate: row.examDate ? row.examDate.slice(0, 10) : '', content: row.content || '', file: null }); setOpen(true); };
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = section === 'announcements' ? { courseId: form.courseId || null, title: form.title, content: form.content } : section === 'assignments' ? { courseId: form.courseId, title: form.title, description: form.description, maxScore: Number(form.maxScore), dueDate: new Date(form.dueDate).toISOString() } : { courseId: form.courseId, title: form.title, description: form.description, maxScore: Number(form.maxScore), examDate: new Date(form.examDate).toISOString() };
      const saved = unwrap(await (editing ? api.patch(`${endpoint}/${editing.id}`, payload) : api.post(endpoint, payload)));
      if (section === 'assignments' && form.file && saved?.id) { const upload = new FormData(); upload.append('file', form.file); await api.post(`/assignments/${saved.id}/attachment`, upload, { headers: { 'Content-Type': 'multipart/form-data' } }); }
      close();
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not save record.');
    } finally {
      setBusy(false);
    }
  };
  const remove = async (row) => { if (!user?.canDelete || !window.confirm('Delete this record?')) return; try { await api.delete(`${endpoint}/${row.id}`); await load(); } catch (e) { setError(e.response?.data?.message || 'Could not delete record.'); } };
  const attachmentCell = (row) => row.attachmentUrl ? <a href={mediaUrl(row.attachmentUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-mint">{isImage(row.attachmentUrl) ? <img src={mediaUrl(row.attachmentUrl)} alt="Assignment attachment" className="h-8 w-8 rounded object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded bg-red-100 text-[10px] font-bold text-red-700">FILE</span>}<span>Open file</span></a> : <span className="text-xs text-slate-400">No file</span>;
  const actionColumn = editable.includes(section) || section === 'submissions' ? [{ key: 'actions', label: 'Actions', render: (r) => <div className="flex gap-2">{editable.includes(section) && <button disabled={!user?.canEdit} onClick={() => edit(r)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40">Edit</button>}{section === 'submissions' && <button disabled={!user?.canEdit} onClick={() => api.patch(`/submissions/${r.id}/status`, { status: 'RETURNED' }).then(load)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40">Return</button>}<button disabled={!user?.canDelete} onClick={() => remove(r)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-40">Delete</button></div> }] : [];
  const columns = section === 'courses' ? [{ key: 'courseCode', label: 'Code' }, { key: 'courseName', label: 'Course' }, { key: 'description', label: 'Description', render: (r) => <span className="block max-w-xs truncate">{r.description || '-'}</span> }, { key: 'startDate', label: 'Starts', render: (r) => formatDate(r.startDate) }, { key: 'endDate', label: 'Ends', render: (r) => formatDate(r.endDate) }, { key: 'status', label: 'Status' }] : section === 'assignments' ? [{ key: 'title', label: 'Title' }, { key: 'course', label: 'Course', render: (r) => r.course?.courseName }, { key: 'dueDate', label: 'Due', render: (r) => formatDate(r.dueDate) }, { key: 'maxScore', label: 'Max score' }, { key: 'attachment', label: 'Attachment', render: attachmentCell }, ...actionColumn] : section === 'exams' ? [{ key: 'title', label: 'Title' }, { key: 'course', label: 'Course', render: (r) => r.course?.courseName }, { key: 'examDate', label: 'Date', render: (r) => formatDate(r.examDate) }, { key: 'maxScore', label: 'Max score' }, ...actionColumn] : section === 'announcements' ? [{ key: 'title', label: 'Title' }, { key: 'course', label: 'Course', render: (r) => r.course?.courseName || '-' }, { key: 'content', label: 'Message', render: (r) => <span className="block max-w-md truncate">{r.content}</span> }, { key: 'createdAt', label: 'Published', render: (r) => formatDate(r.createdAt) }, ...actionColumn] : section === 'submissions' ? [{ key: 'student', label: 'Student', render: (r) => r.student?.user?.fullName }, { key: 'assignment', label: 'Assignment', render: (r) => r.assignment?.title }, { key: 'course', label: 'Course', render: (r) => r.assignment?.course?.courseName || '-' }, { key: 'submittedAt', label: 'Submitted', render: (r) => formatDate(r.submittedAt) }, { key: 'status', label: 'Status' }, ...actionColumn] : section === 'attendance' ? [{ key: 'course', label: 'Course', render: (r) => r.course?.courseName || '-' }, { key: 'student', label: 'Student', render: (r) => r.student?.user?.fullName || '-' }, { key: 'attendanceDate', label: 'Date', render: (r) => formatDate(r.attendanceDate) }, { key: 'status', label: 'Status' }] : [{ key: 'message', label: 'Status', render: () => 'No records to display yet.' }];
  const openCreate = () => { setEditing(null); setForm({ ...blank }); setOpen(true); };
  const description = editable.includes(section) && !hasAssignedCourse ? 'No course has been assigned to this teacher yet. Ask the administrator to assign a course before creating records.' : 'Create, update and manage the learning records assigned to you.';
  return <><Header eyebrow="Teacher workspace" title={titles[section] || 'Teaching workspace'} description={description} action={editable.includes(section) && user?.canCreate && hasAssignedCourse ? <button onClick={openCreate} className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white">+ Add {section === 'announcements' ? 'announcement' : section.slice(0, -1)}</button> : null} />{error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}{data ? <Table columns={columns} rows={rows} empty={editable.includes(section) && !hasAssignedCourse ? 'No course assigned by the administrator yet.' : 'No records found.'} /> : <Loading />}<Modal open={open} title={`${editing ? 'Edit' : 'Create'} ${section === 'announcements' ? 'announcement' : section.slice(0, -1)}`} onClose={close}><form onSubmit={save} className="space-y-3">{section !== 'announcements' && <select required value={form.courseId} className="input" onChange={(e) => setForm({ ...form, courseId: e.target.value })}><option value="">Select course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.courseName}</option>)}</select>}{section === 'announcements' && <select required value={form.courseId} className="input" onChange={(e) => setForm({ ...form, courseId: e.target.value })}><option value="">Select course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.courseName}</option>)}</select>}{section === 'assignments' && form.file && <p className="rounded-lg bg-mint p-3 text-xs font-semibold text-emerald-800">Selected: {form.file.name}</p>}<input required value={form.title} className="input" placeholder="Title" onChange={(e) => setForm({ ...form, title: e.target.value })} />{section === 'announcements' ? <textarea required rows="5" value={form.content} className="input" placeholder="Announcement content" onChange={(e) => setForm({ ...form, content: e.target.value })} /> : <><textarea value={form.description} className="input" placeholder="Description" onChange={(e) => setForm({ ...form, description: e.target.value })} /><input required type="number" min="0" value={form.maxScore} className="input" placeholder="Maximum score" onChange={(e) => setForm({ ...form, maxScore: e.target.value })} /><label className="block text-xs font-semibold text-slate-500">{section === 'assignments' ? 'Due date' : 'Exam date'}<input required type={section === 'assignments' ? 'datetime-local' : 'date'} value={section === 'assignments' ? form.dueDate : form.examDate} className="input mt-1" onChange={(e) => setForm({ ...form, [section === 'assignments' ? 'dueDate' : 'examDate']: e.target.value })} /></label>{section === 'assignments' && <label className="block text-xs font-semibold text-slate-500">Assignment file <span className="font-normal text-slate-400">(PDF up to 100 MB; image up to 50 MB)</span>{editing?.attachmentUrl && <a href={mediaUrl(editing.attachmentUrl)} target="_blank" rel="noreferrer" className="ml-2 text-navy underline">View current</a>}<input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" className="input mt-1 p-2" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} /></label>}</>}<button disabled={busy} className="w-full rounded-xl bg-navy py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Saving...' : editing ? 'Save changes' : 'Create record'}</button></form></Modal></>;
}
