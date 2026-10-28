import { useEffect, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';
import Table from '../../components/Table';
import Loading from '../../components/Loading';
import { useLanguage } from '../../context/LanguageContext';

const emptyAttendance = { total: 0, present: 0, absent: 0, late: 0, excused: 0, percentage: 0 };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    api.get('/dashboard/student').then((response) => setData(unwrap(response))).catch(() => setData({ attendanceSummary: emptyAttendance }));
  }, []);

  if (!data) return <Loading />;
  const attendance = { ...emptyAttendance, ...(data.attendanceSummary || {}), percentage: data.attendanceSummary?.percentage ?? data.attendancePercentage ?? 0 };

  return <>
    <Header eyebrow="Student space" title="Keep your momentum going." description="Everything you need for your classes, deadlines and results in one place." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Enrolled courses" value={data.enrolledCourses} note="Current semester" />
      <StatCard label="Pending homework" value={data.pendingHomework} accent="bg-coral" />
      <StatCard label={t('attendanceRate')} value={`${attendance.percentage}%`} accent="bg-[#7c8cf8]" />
      <StatCard label="Average grade" value={`${data.averageGrade}%`} accent="bg-[#f6c453]" />
    </div>

    <section className="card mt-6">
      <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="font-bold text-ink">{t('attendanceSummary')}</h2><p className="mt-1 text-sm text-slate-500">{t('attendanceOverview')}</p></div><span className="rounded-full bg-mint px-3 py-1 text-sm font-bold text-emerald-800">{attendance.percentage}%</span></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><AttendanceStat label={t('totalAttendance')} value={attendance.total} accent="bg-navy" /><AttendanceStat label={t('present')} value={attendance.present} accent="bg-emerald-400" /><AttendanceStat label={t('absent')} value={attendance.absent} accent="bg-rose-400" /><AttendanceStat label={t('late')} value={attendance.late} accent="bg-amber-400" /><AttendanceStat label={t('excused')} value={attendance.excused} accent="bg-[#7c8cf8]" /></div>
    </section>

    <div className="mt-6 grid gap-6 lg:grid-cols-2"><div className="card"><h2 className="mb-1 font-bold text-ink">Upcoming classes</h2><p className="mb-5 text-sm text-slate-500">Your current timetable</p><Table columns={[{ key: 'course', label: 'Course', render: (row) => row.course.courseName }, { key: 'dayOfWeek', label: 'Day' }, { key: 'startTime', label: 'Time' }, { key: 'room', label: 'Room' }]} rows={data.schedules || []} /></div><div className="card"><h2 className="mb-1 font-bold text-ink">Latest announcements</h2><p className="mb-5 text-sm text-slate-500">Stay in the loop</p><div className="space-y-3">{(data.announcements || []).map((announcement) => <div key={announcement.id} className="rounded-xl bg-slate-50 p-4"><p className="font-semibold text-ink">{announcement.title}</p><p className="mt-1 text-sm text-slate-500">{announcement.content}</p></div>)}</div></div></div>
  </>;
}

function AttendanceStat({ label, value, accent }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/70"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><span className={`h-2.5 w-2.5 rounded-full ${accent}`} /></div><p className="mt-3 text-2xl font-extrabold text-ink">{value}</p></div>;
}
