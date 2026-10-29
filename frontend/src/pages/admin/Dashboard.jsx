import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { unwrap } from '../../api/axios';
import StatCard from '../../components/StatCard';
import Loading from '../../components/Loading';
import { useLanguage } from '../../context/LanguageContext';

const colors = ['#6ed2ae', '#7c8cf8', '#f6c453', '#f47b67'];

const prettyStatus = (value) => String(value || '').toLowerCase().replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());

const translateStatus = (value, t) => {
  const normalized = String(value || '').toLowerCase();
  const labels = {
    present: t('present'),
    absent: t('absent'),
    late: t('late'),
    excused: t('excused'),
    active: t('active'),
    inactive: t('inactive'),
    completed: t('completed'),
    cancelled: t('cancelled'),
  };
  return labels[normalized] || prettyStatus(value);
};

export default function Dashboard() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard/admin')
      .then((response) => setData(unwrap(response)))
      .catch(() => setData({ totals: {}, attendance: [], courseStats: [] }));
  }, []);

  if (!data) return <Loading />;

  const totals = data.totals || {};
  const attendance = (data.attendance || []).map((item) => ({
    status: String(item.status || '').toLowerCase(),
    name: translateStatus(item.status, t),
    total: item._count,
  }));
  const courses = (data.courseStats || []).map((item) => ({
    status: String(item.status || '').toLowerCase(),
    name: translateStatus(item.status, t),
    total: item._count,
  }));
  const attendanceTotal = attendance.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const present = attendance.find((item) => item.status === 'present')?.total || 0;
  const presenceRate = attendanceTotal ? Math.round((present / attendanceTotal) * 100) : 0;
  const totalCourses = courses.reduce((sum, item) => sum + Number(item.total || 0), 0);

  return <>
    <section className="relative mb-6 overflow-hidden rounded-[2rem] bg-[#10243f] px-6 py-7 text-white shadow-[0_24px_60px_rgba(16,36,63,.2)] sm:px-8 sm:py-9">
      <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#6ed2ae]/20 blur-3xl" />
      <div className="absolute -bottom-28 right-24 h-56 w-56 rounded-full bg-[#7c8cf8]/20 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#a5f1dc]"><span className="h-2 w-2 rounded-full bg-[#8de4ca] shadow-[0_0_0_5px_rgba(141,228,202,.12)]" />{t('adminDashboardEyebrow')}</div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('adminDashboardTitle')}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{t('adminDashboardDescription')}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex"><Link to="/admin/students" className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15">{t('manageStudents')}</Link><Link to="/admin/courses" className="rounded-2xl bg-[#8de4ca] px-4 py-3 text-center text-xs font-extrabold text-[#10243f] transition hover:-translate-y-0.5 hover:bg-[#a5f1dc]">{t('manageCourses')}</Link></div>
      </div>
    </section>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label={t('totalStudents')} value={totals.students ?? 0} note={t('activeStudentProfiles')} accent="bg-[#6ed2ae]" icon={<span>◉</span>} />
      <StatCard label={t('teachingStaff')} value={totals.teachers ?? 0} note={t('allDepartments')} accent="bg-[#7c8cf8]" icon={<span>✦</span>} />
      <StatCard label={t('totalCourses')} value={totals.courses ?? 0} note={t('academicYear')} accent="bg-[#f6c453]" icon={<span>▦</span>} />
      <StatCard label={t('activeCourses')} value={totals.activeCourses ?? 0} note={t('currentlyInProgress')} accent="bg-[#f47b67]" icon={<span>↗</span>} />
    </div>

    <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.85fr]">
      <div className="rounded-[1.6rem] border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_rgba(16,36,63,.06)] dark:border-slate-700/80 dark:bg-[#121f35] sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-coral">{t('campusActivity')}</p><h2 className="mt-1 text-xl font-extrabold text-ink dark:text-white">{t('attendanceSummary')}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('recordedClassPresence')}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{presenceRate}% {t('present')}</span></div>
        <div className="h-[260px]">{attendance.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={attendance} barCategoryGap="30%"><defs><linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6ed2ae" /><stop offset="100%" stopColor="#2e8f79" /></linearGradient></defs><CartesianGrid vertical={false} stroke="#dbe4ee" strokeDasharray="4 4" /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} /><Tooltip cursor={{ fill: 'rgba(110,210,174,.08)' }} contentStyle={{ borderRadius: 14, border: '1px solid #dbe4ee', boxShadow: '0 12px 30px rgba(16,36,63,.12)' }} /><Bar dataKey="total" fill="url(#attendanceFill)" radius={[8, 8, 3, 3]} /></BarChart></ResponsiveContainer> : <EmptyState label={t('noAttendanceRecords')} />}</div>
      </div>
      <div className="rounded-[1.6rem] border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_rgba(16,36,63,.06)] dark:border-slate-700/80 dark:bg-[#121f35] sm:p-6">
        <div className="mb-4"><p className="text-xs font-extrabold uppercase tracking-[.14em] text-coral">{t('curriculum')}</p><h2 className="mt-1 text-xl font-extrabold text-ink dark:text-white">{t('courseMix')}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('coursesByStatus')}</p></div>
        <div className="relative h-[220px]">{courses.length ? <><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={courses} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={5}>{courses.map((item, index) => <Cell key={`${item.status}-${index}`} fill={colors[index % colors.length]} stroke="transparent" />)}</Pie><Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #dbe4ee', boxShadow: '0 12px 30px rgba(16,36,63,.12)' }} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-extrabold text-ink dark:text-white">{totalCourses}</span><span className="text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400">{t('total')}</span></div></> : <EmptyState label={t('noCourseData')} />}</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">{courses.map((item, index) => <div key={`${item.status}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/70"><span className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-slate-300"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[index % colors.length] }} /> <span className="truncate">{item.name}</span></span><strong className="text-ink dark:text-white">{item.total}</strong></div>)}</div>
      </div>
    </section>

    <section className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
      <div className="rounded-[1.6rem] border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_rgba(16,36,63,.06)] dark:border-slate-700/80 dark:bg-[#121f35] sm:p-6"><div className="mb-4"><p className="text-xs font-extrabold uppercase tracking-[.14em] text-coral">{t('shortcuts')}</p><h2 className="mt-1 text-xl font-extrabold text-ink dark:text-white">{t('quickActions')}</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><QuickAction to="/admin/students" label={t('addStudent')} hint={t('createLearnerProfile')} icon="+" /><QuickAction to="/admin/teachers" label={t('addTeacher')} hint={t('setupTeachingAccess')} icon="✦" /><QuickAction to="/admin/announcements" label={t('postAnnouncement')} hint={t('shareSchoolUpdate')} icon="↗" /><QuickAction to="/admin/users" label={t('reviewPermissions')} hint={t('organizeAccountAccess')} icon="✓" /></div></div>
      <div className="rounded-[1.6rem] border border-slate-200/80 bg-gradient-to-br from-[#eefaf6] via-white to-[#fff5f1] p-5 shadow-[0_12px_35px_rgba(16,36,63,.06)] dark:border-slate-700/80 dark:from-emerald-950/30 dark:via-[#121f35] dark:to-rose-950/20 sm:p-6"><p className="text-xs font-extrabold uppercase tracking-[.14em] text-emerald-700 dark:text-emerald-300">{t('systemPulse')}</p><h2 className="mt-1 text-xl font-extrabold text-ink dark:text-white">{t('schoolAtAGlance')}</h2><div className="mt-6 space-y-4"><PulseRow label={t('studentProfiles')} value={`${totals.students ?? 0} ${t('active')}`} percent={totals.students ? 100 : 0} color="bg-emerald-400" /><PulseRow label={t('coursesInProgress')} value={`${totals.activeCourses ?? 0} ${t('active')}`} percent={totals.courses ? Math.round((totals.activeCourses / totals.courses) * 100) : 0} color="bg-indigo-400" /><PulseRow label={t('recordedPresence')} value={`${presenceRate}% ${t('present')}`} percent={presenceRate} color="bg-amber-400" /></div><div className="mt-7 rounded-2xl border border-white/80 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/50"><p className="text-sm font-bold text-ink dark:text-white">{t('keepLearningFlow')}</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{t('keepSchoolUpdated')}</p></div></div>
    </section>
  </>;
}

function QuickAction({ to, label, hint, icon }) { return <Link to={to} className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/70 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#10243f] text-lg font-bold text-[#a5f1dc] transition group-hover:scale-105 dark:bg-emerald-900/70">{icon}</span><span className="min-w-0"><strong className="block text-sm text-ink dark:text-white">{label}</strong><small className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{hint}</small></span><span className="ml-auto text-slate-400 transition group-hover:translate-x-1">→</span></Link>; }
function PulseRow({ label, value, percent, color }) { return <div><div className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-slate-600 dark:text-slate-300">{label}</span><span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">{value}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-slate-800"><div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} /></div></div>; }
function EmptyState({ label }) { return <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-700">{label}</div>; }
