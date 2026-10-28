import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { unwrap } from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import Header from '../../components/Header';
import Table from '../../components/Table';
import Loading from '../../components/Loading';
import Modal from '../../components/Modal';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirmDialog } from '../../context/ConfirmContext';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const mediaUrl = (path) => path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;
const isImage = (path) => /\.(png|jpe?g|webp)$/i.test(path || '');
const formatDate = (value, language = document.documentElement.lang || 'en') => value ? new Date(value).toLocaleDateString(language === 'km' ? 'km-KH' : 'en-US') : '-';
const titles = { courses: 'myCourses', assignments: 'assignments', submissions: 'submissions', attendance: 'attendance', exams: 'exams', announcements: 'announcements' };
const editable = ['assignments', 'exams', 'announcements'];
const submissionStatuses = ['SUBMITTED', 'LATE', 'GRADED', 'RETURNED'];
const blank = { courseId: '', assignmentId: '', studentId: '', answerText: '', title: '', description: '', maxScore: 100, dueDate: '', examDate: '', content: '', file: null, status: 'SUBMITTED', score: '', feedback: '' };

const statusClass = (status) => ({
  SUBMITTED: 'bg-blue-50 text-blue-700',
  LATE: 'bg-amber-50 text-amber-700',
  GRADED: 'bg-mint text-emerald-800',
  RETURNED: 'bg-slate-100 text-slate-700',
}[status] || 'bg-slate-100 text-slate-700');

export default function Simple() {
  const { section } = useParams();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { ask } = useConfirmDialog();
  const [data, setData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [courseStudents, setCourseStudents] = useState({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...blank });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resultExam, setResultExam] = useState(null);
  const [examStudents, setExamStudents] = useState([]);
  const [examResults, setExamResults] = useState([]);
  const [resultForm, setResultForm] = useState({ studentId: '', score: '', feedback: '' });
  const [resultBusy, setResultBusy] = useState(false);
  const endpoint = { courses: '/courses', assignments: '/assignments', submissions: '/submissions', attendance: '/attendance', exams: '/exams', announcements: '/announcements' }[section] || '/announcements';

  const load = () => api.get(endpoint, { params: { limit: 100 } }).then((response) => setData(unwrap(response))).catch((e) => { setError(e.response?.data?.message || t('noRecords')); setData([]); });

  useEffect(() => {
    setData(null);
    setError('');
    load();
    if (editable.includes(section) || section === 'submissions') {
      Promise.all([
        api.get('/courses', { params: { limit: 100 } }),
        section === 'submissions' ? api.get('/assignments', { params: { limit: 100 } }) : Promise.resolve(null),
      ]).then(async ([coursesResponse, assignmentsResponse]) => {
        const teacherCourses = unwrap(coursesResponse).data || [];
        setCourses(teacherCourses);
        if (assignmentsResponse) setAssignments(unwrap(assignmentsResponse).data || []);
        if (section === 'submissions') {
          const studentResponses = await Promise.all(teacherCourses.map((course) => api.get(`/courses/${course.id}/students`)));
          setCourseStudents(Object.fromEntries(teacherCourses.map((course, index) => [course.id, (unwrap(studentResponses[index]) || []).map((enrollment) => enrollment.student)])));
        }
      }).catch(() => setCourses([]));
    }
  }, [section]);

  const rows = Array.isArray(data) ? data : data?.data || [];
  const hasAssignedCourse = courses.length > 0;
  const close = () => { setOpen(false); setEditing(null); setForm({ ...blank }); setError(''); };
  const closeResults = () => { setResultExam(null); setExamStudents([]); setExamResults([]); setResultForm({ studentId: '', score: '', feedback: '' }); setError(''); };

  const openResults = async (exam) => {
    setResultBusy(true);
    setError('');
    setResultExam(exam);
    try {
      const [resultsResponse, studentsResponse] = await Promise.all([api.get(`/exam-results/exam/${exam.id}`), api.get(`/courses/${exam.courseId}/students`)]);
      const results = unwrap(resultsResponse) || [];
      const students = (unwrap(studentsResponse) || []).map((enrollment) => enrollment.student);
      setExamResults(results);
      setExamStudents(students);
      const firstStudent = students[0];
      const firstResult = results.find((result) => result.studentId === firstStudent?.id);
      setResultForm({ studentId: firstStudent?.id || '', score: firstResult?.score ?? '', feedback: firstResult?.feedback || '' });
    } catch (e) {
      setError(e.response?.data?.message || t('couldNotLoadResults'));
    } finally {
      setResultBusy(false);
    }
  };

  const selectResultStudent = (studentId) => {
    const result = examResults.find((item) => item.studentId === studentId);
    setResultForm({ studentId, score: result?.score ?? '', feedback: result?.feedback || '' });
  };

  const saveExamResult = async (event) => {
    event.preventDefault();
    if (!resultForm.studentId || resultForm.score === '') return;
    setResultBusy(true);
    setError('');
    try {
      const existing = examResults.find((result) => result.studentId === resultForm.studentId);
      const payload = { examId: resultExam.id, studentId: resultForm.studentId, score: Number(resultForm.score), feedback: resultForm.feedback };
      const saved = unwrap(await (existing ? api.patch(`/exam-results/${existing.id}`, payload) : api.post('/exam-results', payload)));
      setExamResults((current) => existing ? current.map((result) => result.id === existing.id ? { ...result, ...saved } : result) : [...current, saved]);
    } catch (e) {
      setError(e.response?.data?.message || t('couldNotSaveResult'));
    } finally {
      setResultBusy(false);
    }
  };

  const edit = (row) => {
    setEditing(row);
    if (section === 'submissions') {
      setForm({ ...blank, assignmentId: row.assignmentId || '', studentId: row.studentId || '', answerText: row.answerText || '', status: row.status || 'SUBMITTED', score: row.grade?.score ?? '', feedback: row.grade?.feedback || '' });
    } else {
      setForm({ courseId: row.courseId || '', title: row.title || '', description: row.description || '', maxScore: row.maxScore || 100, dueDate: row.dueDate ? row.dueDate.slice(0, 16) : '', examDate: row.examDate ? row.examDate.slice(0, 10) : '', content: row.content || '', file: null });
    }
    setError('');
    setOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (section === 'submissions') {
        if (editing) {
          await api.patch(`/submissions/${editing.id}/status`, { status: form.status });
          if (form.score !== '') {
            const payload = { submissionId: editing.id, score: Number(form.score), feedback: form.feedback };
            if (editing.grade?.id) await api.patch(`/grades/${editing.grade.id}`, payload);
            else await api.post('/grades', payload);
          }
        } else {
          const saved = unwrap(await api.post('/submissions', { assignmentId: form.assignmentId, studentId: form.studentId, answerText: form.answerText }));
          if (form.file && saved?.id) {
            const upload = new FormData();
            upload.append('file', form.file);
            upload.append('studentId', form.studentId);
            await api.post(`/submissions/${form.assignmentId}/upload`, upload, { headers: { 'Content-Type': 'multipart/form-data' } });
          }
        }
      } else {
        const payload = section === 'announcements'
          ? { courseId: form.courseId || null, title: form.title, content: form.content }
          : section === 'assignments'
            ? { courseId: form.courseId, title: form.title, description: form.description, maxScore: Number(form.maxScore), dueDate: new Date(form.dueDate).toISOString() }
            : { courseId: form.courseId, title: form.title, description: form.description, maxScore: Number(form.maxScore), examDate: new Date(form.examDate).toISOString() };
        const saved = unwrap(await (editing ? api.patch(`${endpoint}/${editing.id}`, payload) : api.post(endpoint, payload)));
        if (section === 'assignments' && form.file && saved?.id) {
          const upload = new FormData();
          upload.append('file', form.file);
          await api.post(`/assignments/${saved.id}/attachment`, upload, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
      }
      close();
      await load();
    } catch (e) {
      setError(e.response?.data?.message || t('couldNotSaveRecord'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (!user?.canDelete || !(await ask(t('deleteRecordConfirm')))) return;
    try {
      await api.delete(`${endpoint}/${row.id}`);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || t('couldNotSaveRecord'));
    }
  };

  const attachmentCell = (row) => row.attachmentUrl
    ? <a href={mediaUrl(row.attachmentUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-mint">{isImage(row.attachmentUrl) ? <img src={mediaUrl(row.attachmentUrl)} alt={t('assignmentAttachment')} className="h-8 w-8 rounded object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded bg-red-100 text-[10px] font-bold text-red-700">FILE</span>}<span>{t('openFile')}</span></a>
    : <span className="text-xs text-slate-400">{t('noFile')}</span>;

  const submissionFileCell = (row) => row.fileUrl
    ? <a href={mediaUrl(row.fileUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-mint">{isImage(row.fileUrl) ? <img src={mediaUrl(row.fileUrl)} alt={t('submissionFile')} className="h-8 w-8 rounded object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded bg-red-100 text-[10px] font-bold text-red-700">FILE</span>}<span>{t('openFile')}</span></a>
    : <span className="text-xs text-slate-400">{t('noFile')}</span>;

  const actionColumn = editable.includes(section) || section === 'submissions'
    ? [{ key: 'actions', label: t('actions'), render: (row) => section === 'submissions'
      ? <button disabled={!user?.canEdit} onClick={() => edit(row)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40">{t('review')}</button>
      : <div className="flex gap-2"><button disabled={!user?.canEdit} onClick={() => edit(row)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40">{t('edit')}</button><button disabled={!user?.canDelete} onClick={() => remove(row)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-40">{t('delete')}</button></div> }]
    : [];

  const columns = section === 'courses'
    ? [{ key: 'courseCode', label: t('code') }, { key: 'courseName', label: t('course') }, { key: 'description', label: t('description'), render: (row) => <span className="block max-w-xs truncate">{row.description || '-'}</span> }, { key: 'startDate', label: t('starts'), render: (row) => formatDate(row.startDate) }, { key: 'endDate', label: t('ends'), render: (row) => formatDate(row.endDate) }, { key: 'status', label: t('status') }]
    : section === 'assignments'
      ? [{ key: 'title', label: t('title') }, { key: 'course', label: t('course'), render: (row) => row.course?.courseName }, { key: 'dueDate', label: t('dueDate'), render: (row) => formatDate(row.dueDate) }, { key: 'maxScore', label: t('maxScore') }, { key: 'attachment', label: t('attachment'), render: attachmentCell }, ...actionColumn]
      : section === 'exams'
        ? [{ key: 'title', label: t('title') }, { key: 'course', label: t('course'), render: (row) => row.course?.courseName }, { key: 'examDate', label: t('date'), render: (row) => formatDate(row.examDate) }, { key: 'maxScore', label: t('maxScore') }, { key: 'results', label: t('examResults'), render: (row) => <button disabled={!user?.canCreate && !user?.canEdit} onClick={() => openResults(row)} className="rounded-lg bg-mint px-3 py-2 text-xs font-semibold text-emerald-800 disabled:opacity-40">{t('examResults')}</button> }, ...actionColumn]
        : section === 'announcements'
          ? [{ key: 'title', label: t('title') }, { key: 'course', label: t('course'), render: (row) => row.course?.courseName || '-' }, { key: 'content', label: t('message'), render: (row) => <span className="block max-w-md truncate">{row.content}</span> }, { key: 'createdAt', label: t('published'), render: (row) => formatDate(row.createdAt) }, ...actionColumn]
          : section === 'submissions'
            ? [{ key: 'student', label: t('student'), render: (row) => row.student?.user?.fullName || '-' }, { key: 'assignment', label: t('assignment'), render: (row) => row.assignment?.title || '-' }, { key: 'course', label: t('course'), render: (row) => row.assignment?.course?.courseName || '-' }, { key: 'score', label: t('score'), render: (row) => row.grade ? `${row.grade.score} / ${row.assignment?.maxScore || '-'}` : t('notGradedYet') }, { key: 'answer', label: t('answer'), render: (row) => <span className="block max-w-xs truncate">{row.answerText || '-'}</span> }, { key: 'file', label: t('attachment'), render: submissionFileCell }, { key: 'submittedAt', label: t('submitted'), render: (row) => formatDate(row.submittedAt) }, { key: 'status', label: t('status'), render: (row) => <span className={`badge ${statusClass(row.status)}`}>{row.status}</span> }, ...actionColumn]
            : section === 'attendance'
              ? [{ key: 'course', label: t('course'), render: (row) => row.course?.courseName || '-' }, { key: 'student', label: t('student'), render: (row) => row.student?.user?.fullName || '-' }, { key: 'attendanceDate', label: t('date'), render: (row) => formatDate(row.attendanceDate) }, { key: 'status', label: t('status') }]
              : [{ key: 'message', label: t('status'), render: () => t('noRecords') }];

  const openCreate = () => {
    if (section === 'submissions') {
      const firstAssignment = assignments[0];
      const firstStudent = firstAssignment ? courseStudents[firstAssignment.courseId]?.[0] : null;
      setForm({ ...blank, assignmentId: firstAssignment?.id || '', studentId: firstStudent?.id || '' });
    } else {
      setForm({ ...blank });
    }
    setEditing(null);
    setError('');
    setOpen(true);
  };
  const selectedAssignment = assignments.find((assignment) => assignment.id === form.assignmentId);
  const submissionStudents = selectedAssignment ? courseStudents[selectedAssignment.courseId] || [] : [];
  const descriptionKey = editable.includes(section) && !hasAssignedCourse ? 'noCourseAssigned' : 'learningRecords';
  const sectionName = section === 'announcements' ? t('announcement') : section === 'assignments' ? t('assignment') : section === 'exams' ? t('exam') : section === 'submissions' ? t('submission') : section;

  return <><Header eyebrow="teacherWorkspace" title={titles[section] || 'announcements'} description={descriptionKey} action={(editable.includes(section) || section === 'submissions') && user?.canCreate && hasAssignedCourse ? <button onClick={openCreate} className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white">+ {t('add')} {sectionName}</button> : null} />{error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}{data ? <Table columns={columns} rows={rows} empty={editable.includes(section) && !hasAssignedCourse ? t('noCourseAssignedShort') : t('noRecords')} /> : <Loading />}
    <Modal open={open} title={section === 'submissions' ? (editing ? t('reviewSubmission') : `${t('create')} ${sectionName}`) : `${editing ? t('edit') : t('create')} ${sectionName}`} onClose={close}>
      {section === 'submissions' ? <form onSubmit={save} className="space-y-4">
        {editing ? <><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">{t('submissionDetails')}</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><p className="text-xs text-slate-400">{t('student')}</p><p className="mt-1 font-semibold text-ink">{editing.student?.user?.fullName || '-'}</p></div><div><p className="text-xs text-slate-400">{t('assignment')}</p><p className="mt-1 font-semibold text-ink">{editing.assignment?.title || '-'}</p></div><div><p className="text-xs text-slate-400">{t('course')}</p><p className="mt-1 font-semibold text-ink">{editing.assignment?.course?.courseName || '-'}</p></div><div><p className="text-xs text-slate-400">{t('submitted')}</p><p className="mt-1 font-semibold text-ink">{formatDate(editing.submittedAt, language)}</p></div></div></div>{editing.answerText && <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('answer')}<textarea readOnly rows="6" value={editing.answerText} className="input mt-2 cursor-default bg-slate-50 dark:bg-slate-800" /></label>}{editing.fileUrl && <a href={mediaUrl(editing.fileUrl)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl bg-mint p-4 text-sm font-semibold text-emerald-800"><span>{t('attachment')}</span><span>{t('openFile')} ↗</span></a>}<div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('score')}<input required type="number" min="0" max={editing.assignment?.maxScore || 100} step="0.01" value={form.score} className="input mt-2" placeholder={`0 - ${editing.assignment?.maxScore || 100}`} onChange={(event) => setForm({ ...form, score: event.target.value })} /></label><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('status')}<select value={form.status} className="input mt-2" onChange={(event) => setForm({ ...form, status: event.target.value })}>{submissionStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label></div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('feedback')}<textarea rows="4" value={form.feedback} className="input mt-2" placeholder={t('feedback')} onChange={(event) => setForm({ ...form, feedback: event.target.value })} /></label></> : <><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('assignment')}<select required value={form.assignmentId} className="input mt-2" onChange={(event) => { const assignmentId = event.target.value; const assignment = assignments.find((item) => item.id === assignmentId); setForm({ ...form, assignmentId, studentId: courseStudents[assignment?.courseId]?.[0]?.id || '' }); }}><option value="">{t('selectHomework')}</option>{assignments.map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.title} · {assignment.course?.courseName}</option>)}</select></label><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('student')}<select required value={form.studentId} className="input mt-2" onChange={(event) => setForm({ ...form, studentId: event.target.value })}><option value="">{t('selectStudent')}</option>{submissionStudents.map((student) => <option key={student.id} value={student.id}>{student.studentCode} · {student.user?.fullName}</option>)}</select></label><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('answer')}<textarea rows="5" value={form.answerText} className="input mt-2" placeholder={t('writeAnswer')} onChange={(event) => setForm({ ...form, answerText: event.target.value })} /></label><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('attachment')}<input type="file" accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip,application/pdf,image/*" className="input mt-2 p-2" onChange={(event) => setForm({ ...form, file: event.target.files?.[0] || null })} /></label></>}
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <button disabled={busy || (editing ? !user?.canEdit : !user?.canCreate)} className="w-full rounded-xl bg-navy py-3.5 font-semibold text-white disabled:opacity-60">{busy ? t('saving') : editing ? t('saveChanges') : t('createRecord')}</button>
      </form> : <form onSubmit={save} className="space-y-3">{section !== 'announcements' && <select required value={form.courseId} className="input" onChange={(event) => setForm({ ...form, courseId: event.target.value })}><option value="">{t('selectCourse')}</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.courseName}</option>)}</select>}{section === 'announcements' && <select required value={form.courseId} className="input" onChange={(event) => setForm({ ...form, courseId: event.target.value })}><option value="">{t('selectCourse')}</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.courseName}</option>)}</select>}{section === 'assignments' && form.file && <p className="rounded-lg bg-mint p-3 text-xs font-semibold text-emerald-800">{t('selected')}: {form.file.name}</p>}<input required value={form.title} className="input" placeholder={t('title')} onChange={(event) => setForm({ ...form, title: event.target.value })} />{section === 'announcements' ? <textarea required rows="5" value={form.content} className="input" placeholder={t('announcementContent')} onChange={(event) => setForm({ ...form, content: event.target.value })} /> : <><textarea value={form.description} className="input" placeholder={t('description')} onChange={(event) => setForm({ ...form, description: event.target.value })} /><input required type="number" min="0" value={form.maxScore} className="input" placeholder={t('maxScore')} onChange={(event) => setForm({ ...form, maxScore: event.target.value })} /><label className="block text-xs font-semibold text-slate-500">{section === 'assignments' ? t('dueDate') : t('examDate')}<input required type={section === 'assignments' ? 'datetime-local' : 'date'} value={section === 'assignments' ? form.dueDate : form.examDate} className="input mt-1" onChange={(event) => setForm({ ...form, [section === 'assignments' ? 'dueDate' : 'examDate']: event.target.value })} /></label>{section === 'assignments' && <label className="block text-xs font-semibold text-slate-500">{t('assignmentFile')} <span className="font-normal text-slate-400">({t('fileSizeHint')})</span>{editing?.attachmentUrl && <a href={mediaUrl(editing.attachmentUrl)} target="_blank" rel="noreferrer" className="ml-2 text-navy underline">{t('viewCurrent')}</a>}<input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" className="input mt-1 p-2" onChange={(event) => setForm({ ...form, file: event.target.files?.[0] || null })} /></label>}</>}<button disabled={busy} className="w-full rounded-xl bg-navy py-3 font-semibold text-white disabled:opacity-60">{busy ? t('saving') : editing ? t('saveChanges') : t('createRecord')}</button></form>}
    </Modal>
    <Modal open={!!resultExam} title={`${t('examResults')}: ${resultExam?.title || ''}`} onClose={closeResults}>
      {resultExam && <form onSubmit={saveExamResult} className="space-y-4">
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
          <p className="font-semibold text-ink dark:text-white">{resultExam.course?.courseName || '-'}</p>
          <p className="mt-1 text-sm text-slate-500">{t('maxScore')}: {resultExam.maxScore}</p>
        </div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('student')}
          <select required value={resultForm.studentId} className="input mt-2" onChange={(event) => selectResultStudent(event.target.value)}>
            <option value="">{t('selectStudent')}</option>
            {examStudents.map((student) => <option key={student.id} value={student.id}>{student.studentCode} · {student.user?.fullName}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('score')}
          <input required type="number" min="0" max={resultExam.maxScore} step="0.01" value={resultForm.score} className="input mt-2" placeholder={`0 - ${resultExam.maxScore}`} onChange={(event) => setResultForm({ ...resultForm, score: event.target.value })} />
        </label>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('feedback')}
          <textarea rows="4" value={resultForm.feedback} className="input mt-2" placeholder={t('feedback')} onChange={(event) => setResultForm({ ...resultForm, feedback: event.target.value })} />
        </label>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <button disabled={resultBusy || (!user?.canCreate && !user?.canEdit)} className="w-full rounded-xl bg-navy py-3.5 font-semibold text-white disabled:opacity-60">{resultBusy ? t('saving') : t('saveChanges')}</button>
      </form>}
    </Modal>
  </>;
}
