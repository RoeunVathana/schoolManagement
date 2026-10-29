import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { unwrap } from '../../api/axios';
import StatCard from '../../components/StatCard';
import AnimatedNumber from '../../components/AnimatedNumber';
import Loading from '../../components/Loading';
import Table from '../../components/Table';
import { useLanguage } from '../../context/LanguageContext';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const { language, t } = useLanguage();

  useEffect(() => {
    api.get('/dashboard/teacher')
      .then((response) => setData(unwrap(response)))
      .catch(() => setData({ courses: [], schedules: [], recentSubmissions: [], totalStudents: 0, pendingHomework: 0 }));
  }, []);

  if (!data) return <Loading />;

  const courses = data.courses || [];
  const schedules = data.schedules || [];
  const submissions = data.recentSubmissions || [];
  const nextClass = schedules[0];
  const studentsPerCourse = courses.length ? Math.round((data.totalStudents || 0) / courses.length) : 0;

  return <>
    <section className="relative mb-6 overflow-hidden rounded-[2rem] bg-[#10243f] px-6 py-7 text-white shadow-[0_24px_60px_rgba(16,36,63,.2)] sm:px-8 sm:py-9">
      <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#7c8cf8]/25 blur-3xl" />
      <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-[#6ed2ae]/15 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#c4c9ff]"><span className="h-2 w-2 rounded-full bg-[#a2aaff] shadow-[0_0_0_5px_rgba(162,170,255,.12)]" />{t('teacherWorkspace')}</div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('teacherDashboardTitle')}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{t('teacherDashboardDescription')}</p>
        </div>
        <div className="flex flex-wrap gap-3"><Link to="/teacher/assignments" className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15">{t('reviewAssignments')}</Link><Link to="/teacher/announcements" className="rounded-2xl bg-[#8de4ca] px-4 py-3 text-xs font-extrabold text-[#10243f] transition hover:-translate-y-0.5 hover:bg-[#a5f1dc]">{t('postUpdate')}</Link></div>
      </div>
    </section>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label={t('myCourses')} value={courses.length} note={t('coursesYouTeach')} accent="bg-[#6ed2ae]" icon={<span>◈</span>} /><StatCard label={t('students')} value={data.totalStudents || 0} note={`${studentsPerCourse || 0} ${t('averagePerCourse')}`} accent="bg-[#7c8cf8]" icon={<span>◉</span>} /><StatCard label={t('pendingHomework')} value={data.pendingHomework || 0} note={t('waitingForReview')} accent="bg-[#f47b67]" icon={<span>!</span>} /><StatCard label={t('upcomingClasses')} value={schedules.length} note={t('onYourTimetable')} accent="bg-[#f6c453]" icon={<span>↗</span>} /></div>

    <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <div className="rounded-[1.6rem] border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_rgba(16,36,63,.06)] dark:border-slate-700/80 dark:bg-[#121f35] sm:p-6"><div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-coral">{t('teachingLoad')}</p><h2 className="mt-1 text-xl font-extrabold text-ink dark:text-white">{t('coursesInFocus')}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('quickViewCoursesLearners')}</p></div><Link to="/teacher/courses" className="text-xs font-extrabold text-[#2185a8] hover:underline dark:text-[#8de4ca]">{t('viewAll')} →</Link></div>{courses.length ? <div className="grid gap-3 sm:grid-cols-2">{courses.map((course) => <Link to="/teacher/courses" key={course.id} className="group rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 transition hover:-translate-y-0.5 hover:border-[#8de4ca] hover:bg-emerald-50/50 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"><div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-white px-2 py-1 text-[10px] font-extrabold tracking-wide text-coral shadow-sm dark:bg-slate-900">{course.courseCode}</span><span className="text-slate-400 transition group-hover:translate-x-1">→</span></div><h3 className="mt-4 line-clamp-1 font-extrabold text-ink dark:text-white">{course.courseName}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400"><AnimatedNumber value={course._count?.enrollments || 0} /> {t('enrolledLearners')}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-gradient-to-r from-[#6ed2ae] to-[#7c8cf8]" style={{ width: `${Math.min(100, Math.max(18, (course._count?.enrollments || 0) * 10))}%` }} /></div></Link>)}</div> : <EmptyState label={t('noCoursesAssignedYet')} />}</div>
      <div className="rounded-[1.6rem] border border-slate-200/80 bg-gradient-to-br from-[#eef7ff] via-white to-[#fff5f1] p-5 shadow-[0_12px_35px_rgba(16,36,63,.06)] dark:border-slate-700/80 dark:from-indigo-950/30 dark:via-[#121f35] dark:to-rose-950/20 sm:p-6"><p className="text-xs font-extrabold uppercase tracking-[.14em] text-coral">{t('stayPrepared')}</p><h2 className="mt-1 text-xl font-extrabold text-ink dark:text-white">{t('nextOnYourSchedule')}</h2>{nextClass ? <div className="mt-5 rounded-2xl border border-white/80 bg-white/75 p-4 dark:border-slate-700 dark:bg-slate-900/50"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200">{nextClass.dayOfWeek}</span><span className="text-xs font-bold text-slate-400">{nextClass.startTime} – {nextClass.endTime}</span></div><h3 className="mt-5 text-lg font-extrabold text-ink dark:text-white">{nextClass.course?.courseName || t('classSession')}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('room')} {nextClass.room || '—'}</p><Link to="/teacher/schedule" className="mt-5 inline-flex rounded-xl bg-[#10243f] px-4 py-2.5 text-xs font-extrabold text-white transition hover:-translate-y-0.5 dark:bg-[#229ed9]">{t('openSchedule')}</Link></div> : <EmptyState label={t('noUpcomingClasses')} />}<div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/60 p-3 dark:bg-slate-900/40"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 font-black text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">!</span><div><p className="text-sm font-bold text-ink dark:text-white"><AnimatedNumber value={data.pendingHomework || 0} /> {t('submissionsNeedAttention')}</p><Link to="/teacher/submissions" className="text-xs font-bold text-[#2185a8] hover:underline dark:text-[#8de4ca]">{t('reviewStudentWork')} →</Link></div></div></div>
    </section>

    <section className="mt-6 rounded-[1.6rem] border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_rgba(16,36,63,.06)] dark:border-slate-700/80 dark:bg-[#121f35] sm:p-6"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-coral">{t('studentActivity')}</p><h2 className="mt-1 text-xl font-extrabold text-ink dark:text-white">{t('recentSubmissions')}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('recentSubmissionsHint')}</p></div><Link to="/teacher/submissions" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">{t('openSubmissions')}</Link></div><Table columns={[{ key: 'student', label: t('student'), render: (row) => row.student?.user?.fullName || '-' }, { key: 'assignment', label: t('assignment'), render: (row) => row.assignment?.title || '-' }, { key: 'submittedAt', label: t('submitted'), render: (row) => row.submittedAt ? new Date(row.submittedAt).toLocaleDateString(language === 'km' ? 'km-KH' : 'en-US') : '-' }, { key: 'status', label: t('status'), render: (row) => <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">{row.status}</span> }]} rows={submissions} empty={t('noRecentSubmissions')} /></section>
  </>;
}

function EmptyState({ label }) { return <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-700">{label}</div>; }
