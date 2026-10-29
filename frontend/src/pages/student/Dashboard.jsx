import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { unwrap } from '../../api/axios';
import StatCard from '../../components/StatCard';
import AnimatedNumber from '../../components/AnimatedNumber';
import Loading from '../../components/Loading';
import { useLanguage } from '../../context/LanguageContext';

const emptyAttendance = { total: 0, present: 0, absent: 0, late: 0, excused: 0, percentage: 0 };

const formatDate = (value, language) => value
  ? new Date(value).toLocaleDateString(language === 'km' ? 'km-KH' : 'en-US')
  : (language === 'km' ? 'ឆាប់ៗនេះ' : 'soon');

export default function Dashboard() {
  const [data, setData] = useState(null);
  const { language, t } = useLanguage();

  useEffect(() => {
    api.get('/dashboard/student')
      .then((response) => setData(unwrap(response)))
      .catch(() => setData({ attendanceSummary: emptyAttendance, enrolledCourses: 0, pendingHomework: 0, averageGrade: 0, schedules: [], submissions: [], announcements: [] }));
  }, []);

  if (!data) return <Loading />;

  const attendance = { ...emptyAttendance, ...(data.attendanceSummary || {}), percentage: data.attendanceSummary?.percentage ?? data.attendancePercentage ?? 0 };
  const submissions = data.submissions || [];
  const pending = submissions.filter((item) => !item.grade).slice(0, 3);
  const schedules = (data.schedules || []).slice(0, 3);
  const announcements = (data.announcements || []).slice(0, 3);
  const nextClass = schedules[0];
  const learningScore = Math.round(((Number(data.averageGrade) || 0) + (Number(attendance.percentage) || 0)) / 2);

  return <>
    <section className="relative mb-6 overflow-hidden rounded-[2rem] bg-[#10243f] px-6 py-7 text-white shadow-[0_24px_60px_rgba(16,36,63,.2)] sm:px-8 sm:py-9">
      <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#6ed2ae]/25 blur-3xl" />
      <div className="absolute -bottom-28 left-1/3 h-60 w-60 rounded-full bg-[#f47b67]/15 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#a5f1dc]"><span className="h-2 w-2 rounded-full bg-[#8de4ca] shadow-[0_0_0_5px_rgba(141,228,202,.12)]" />{t('studentSpace')}</div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('keepMomentum')}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{t('everythingInOnePlace')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/student/courses" className="rounded-2xl bg-[#8de4ca] px-4 py-3 text-xs font-extrabold text-[#10243f] transition hover:-translate-y-0.5 hover:bg-[#a5f1dc]">{t('browseMyCourses')}</Link>
          <Link to="/student/homework" className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15">{t('openHomework')}</Link>
        </div>
      </div>
    </section>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label={t('enrolledCourses')} value={data.enrolledCourses ?? 0} note={t('currentSemester')} accent="bg-[#6ed2ae]" icon={<span>◈</span>} />
      <StatCard label={t('pendingHomework')} value={data.pendingHomework ?? 0} note={t('tasksWaitingForYou')} accent="bg-[#f47b67]" icon={<span>!</span>} />
      <StatCard label={t('attendanceRate')} value={`${attendance.percentage}%`} note={t('presenceInClass')} accent="bg-[#7c8cf8]" icon={<span>✓</span>} />
      <StatCard label={t('averageGrade')} value={`${data.averageGrade ?? 0}%`} note={t('acrossGradedWork')} accent="bg-[#f6c453]" icon={<span>↗</span>} />
    </div>

    <section className="mt-6 grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
      <div className="rounded-[1.6rem] border border-slate-200/80 bg-gradient-to-br from-[#eefaf6] via-white to-[#fff5f1] p-5 shadow-[0_12px_35px_rgba(16,36,63,.06)] dark:border-slate-700/80 dark:from-emerald-950/30 dark:via-[#121f35] dark:to-rose-950/20 sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-emerald-700 dark:text-emerald-300">{t('learningPulse')}</p><h2 className="mt-1 text-xl font-extrabold text-ink dark:text-white">{t('progressSnapshot')}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('keepShowingUp')}</p></div><span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-extrabold text-emerald-700 dark:bg-slate-900/60 dark:text-emerald-300"><AnimatedNumber value={`${learningScore}%`} /> {t('onTrack')}</span></div>
        <div className="mt-7 flex items-center gap-5"><div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#6ed2ae ${Math.min(100, learningScore)}%, rgba(148,163,184,.18) 0)` }}><div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white dark:bg-[#121f35]"><strong className="text-2xl font-extrabold text-ink dark:text-white"><AnimatedNumber value={`${learningScore}%`} /></strong><span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{t('overall')}</span></div></div><div className="min-w-0 flex-1 space-y-4"><Metric label={t('attendanceRate')} value={`${attendance.percentage}%`} percent={attendance.percentage} color="bg-[#7c8cf8]" /><Metric label={t('averageGrade')} value={`${data.averageGrade ?? 0}%`} percent={data.averageGrade ?? 0} color="bg-[#f6c453]" /></div></div>
        <Link to="/student/grades" className="mt-7 inline-flex text-xs font-extrabold text-[#2185a8] hover:underline dark:text-[#8de4ca]">{t('viewDetailedResults')} →</Link>
      </div>
      <div className="rounded-[1.6rem] border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_rgba(16,36,63,.06)] dark:border-slate-700/80 dark:bg-[#121f35] sm:p-6">
        <div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-coral">{t('yourTimetable')}</p><h2 className="mt-1 text-xl font-extrabold text-ink dark:text-white">{t('upcomingClasses')}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('yourCurrentTimetable')}</p></div><Link to="/student/schedule" className="text-xs font-extrabold text-[#2185a8] hover:underline dark:text-[#8de4ca]">{t('viewSchedule')} →</Link></div>
        {nextClass ? <div className="mb-4 rounded-2xl border border-[#cfe9df] bg-[#f2fcf8] p-4 dark:border-emerald-900/60 dark:bg-emerald-950/25"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-300">{t('nextClass')}</span><span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">{nextClass.dayOfWeek} · {nextClass.startTime} – {nextClass.endTime}</span></div><h3 className="mt-4 font-extrabold text-ink dark:text-white">{nextClass.course?.courseName || t('classSession')}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('room')} {nextClass.room || '—'}</p></div> : <EmptyState label={t('noUpcomingClasses')} />}
        <div className="space-y-2">{schedules.slice(1).map((item, index) => <div key={`${item.id || item.courseId}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3 text-sm dark:bg-slate-800/70"><span className="min-w-0 truncate font-semibold text-ink dark:text-white">{item.course?.courseName || t('classSession')}</span><span className="shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400">{item.dayOfWeek} · {item.startTime}</span></div>)}</div>
      </div>
    </section>

    <section className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="rounded-[1.6rem] border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_rgba(16,36,63,.06)] dark:border-slate-700/80 dark:bg-[#121f35] sm:p-6"><div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-coral">{t('keepMoving')}</p><h2 className="mt-1 text-xl font-extrabold text-ink dark:text-white">{t('workWaitingForYou')}</h2></div><Link to="/student/homework" className="text-xs font-extrabold text-[#2185a8] hover:underline dark:text-[#8de4ca]">{t('viewHomework')} →</Link></div>{pending.length ? <div className="space-y-3">{pending.map((item) => <Link to="/student/homework" key={item.id} className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 transition hover:-translate-y-0.5 hover:border-amber-200 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-amber-800"><div className="min-w-0"><p className="truncate text-sm font-extrabold text-ink dark:text-white">{item.assignment?.title || t('homework')}</p><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{item.assignment?.course?.courseName || t('courseItem')} · {t('due')} {formatDate(item.assignment?.dueDate, language)}</p></div><span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">{t('pending')}</span></Link>)}</div> : <EmptyState label={t('youAreAllCaughtUp')} />}</div>
      <div className="rounded-[1.6rem] border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_rgba(16,36,63,.06)] dark:border-slate-700/80 dark:bg-[#121f35] sm:p-6"><div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-coral">{t('stayInLoop')}</p><h2 className="mt-1 text-xl font-extrabold text-ink dark:text-white">{t('latestAnnouncements')}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('stayInLoop')}</p></div><Link to="/student/announcements" className="text-xs font-extrabold text-[#2185a8] hover:underline dark:text-[#8de4ca]">{t('viewAll')} →</Link></div>{announcements.length ? <div className="space-y-3">{announcements.map((item) => <Link to="/student/announcements" key={item.id} className="block rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-[#cfe9df] dark:border-slate-700 dark:bg-slate-800/60"><div className="flex items-start gap-3"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-coral" /><div className="min-w-0"><p className="truncate text-sm font-extrabold text-ink dark:text-white">{item.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.content}</p></div></div></Link>)}</div> : <EmptyState label={t('noNewAnnouncements')} />}</div>
    </section>
  </>;
}

function Metric({ label, value, percent, color }) { return <div><div className="flex items-center justify-between gap-3 text-xs"><span className="font-bold text-slate-600 dark:text-slate-300">{label}</span><strong className="text-ink dark:text-white"><AnimatedNumber value={value} /></strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-slate-800"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, Number(percent) || 0))}%` }} /></div></div>; }
function EmptyState({ label }) { return <div className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-700">{label}</div>; }
