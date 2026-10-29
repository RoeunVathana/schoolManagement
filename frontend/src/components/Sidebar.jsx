import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const mediaUrl = (path) => path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;

const links = {
  ADMIN: [['dashboard', '/admin/dashboard', 'dashboard'], ['profile', '/admin/profile', 'profile'], ['students', '/admin/students', 'students'], ['teachers', '/admin/teachers', 'teachers'], ['courses', '/admin/courses', 'courses'], ['certificates', '/admin/certificates', 'certificates'], ['users', '/admin/users', 'users'], ['telegramSettings', '/admin/telegram-settings', 'telegram'], ['enrollments', '/admin/enrollments', 'enrollments'], ['schedules', '/admin/schedules', 'schedule'], ['attendance', '/admin/attendance', 'attendance'], ['announcements', '/admin/announcements', 'announcements']],
  TEACHER: [['dashboard', '/teacher/dashboard', 'dashboard'], ['profile', '/teacher/profile', 'profile'], ['myCourses', '/teacher/courses', 'courses'], ['courseMaterials', '/teacher/materials', 'materials'], ['certificates', '/teacher/certificates', 'certificates'], ['schedule', '/teacher/schedule', 'schedule'], ['assignments', '/teacher/assignments', 'assignments'], ['submissions', '/teacher/submissions', 'submissions'], ['attendance', '/teacher/attendance', 'attendance'], ['exams', '/teacher/exams', 'exams'], ['announcements', '/teacher/announcements', 'announcements']],
  STUDENT: [['dashboard', '/student/dashboard', 'dashboard'], ['profile', '/student/profile', 'profile'], ['myCourses', '/student/courses', 'courses'], ['schedule', '/student/schedule', 'schedule'], ['homework', '/student/homework', 'homework'], ['grades', '/student/grades', 'grades'], ['attendance', '/student/attendance', 'attendance'], ['examResults', '/student/exams', 'exams'], ['certificates', '/student/certificates', 'certificates'], ['announcements', '/student/announcements', 'announcements']],
};

const iconPaths = {
  dashboard: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'],
  profile: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4 21a8 8 0 0 1 16 0'],
  students: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  teachers: ['M3 5.5 12 2l9 3.5-9 3.5L3 5.5Z', 'M6 8v5c0 2 2.7 4 6 4s6-2 6-4V8', 'M3 6v6'],
  courses: ['M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z', 'M4 5.5V21', 'M8 7h8', 'M8 11h7'],
  users: ['M12 3 20 6v5c0 5-3.4 8.1-8 10-4.6-1.9-8-5-8-10V6l8-3Z', 'm9 12 2 2 4-4'],
  enrollments: ['M6 3h12v18H6z', 'M9 7h6', 'M9 11h6', 'M9 15h4'],
  schedule: ['M4 5h16v15H4z', 'M8 3v4', 'M16 3v4', 'M4 9h16'],
  attendance: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'm8 12 2.5 2.5L16 9'],
  announcements: ['M3 11v2h4l5 4V7l-5 4H3Z', 'M16 9a4 4 0 0 1 0 6', 'M19 6a8 8 0 0 1 0 12'],
  assignments: ['M6 3h9l3 3v15H6z', 'M9 12h6', 'M9 16h4', 'M14 3v4h4'],
  materials: ['M6 3h9l3 3v15H6z', 'M9 12h6', 'M9 16h4', 'M14 3v4h4'],
  certificates: ['M6 3h12v18H6z', 'M9 7h6', 'M9 11h6', 'M9 15h3', 'm14 15 1.5 1.5L18 14'],
  submissions: ['M12 16V4', 'm7 9 5-5 5 5', 'M5 20h14'],
  homework: ['M5 4h14v16H5z', 'M8 8h8', 'M8 12h8', 'm8 16 2 2 4-4'],
  grades: ['M4 19V5', 'M4 19h16', 'm7 15 3-4 3 2 4-6'],
  exams: ['M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z'],
  telegram: ['M21 4 3 11l7 2 2 7 3-6 6-10Z', 'm10 13 5-4'],
};

function NavIcon({ name }) {
  return <span className="sidebar-icon shrink-0" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">{iconPaths[name]?.map((path) => <path key={path} d={path} />)}</svg></span>;
}

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const workspaceLabel = user?.role === 'ADMIN' ? t('adminTools') : user?.role === 'TEACHER' ? t('teacherWorkspace') : t('studentSpace');
  const profilePath = user?.role ? `/${user.role.toLowerCase()}/profile` : '/login';
  const initials = user?.fullName?.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';

  return <aside className={`${open ? 'translate-x-0' : '-translate-x-full'} sidebar-shell fixed inset-y-0 left-0 z-40 flex h-screen w-[min(18rem,88vw)] transform flex-col overflow-hidden px-4 py-5 text-white shadow-2xl transition-transform md:w-64 md:px-5 md:py-6 md:translate-x-0`}>
    <div className="mb-8 flex shrink-0 items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="sidebar-logo flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl p-1.5 text-sm font-extrabold tracking-tight"><img src="/campusflow-logo.jpg" alt="CampusFlow logo" className="h-full w-full rounded-xl object-contain" /></div>
        <div>
          <div className="text-xl font-extrabold tracking-tight">Campus<span className="text-mint">Flow</span></div>
          <div className="mt-1 text-[10px] uppercase tracking-[.25em] text-slate-400">{t('learningSystem')}</div>
        </div>
      </div>
      <button aria-label="Close menu" className="rounded-lg px-2 py-1 text-xl text-slate-300 transition hover:bg-white/10 hover:text-white md:hidden" onClick={onClose}>&times;</button>
    </div>

    <NavLink to={profilePath} onClick={onClose} className="group sidebar-profile mb-6 flex shrink-0 items-center gap-3 rounded-2xl p-3 transition-all duration-200">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/15 text-sm font-bold text-mint ring-1 ring-white/10">{user?.profileImageUrl ? <img src={mediaUrl(user.profileImageUrl)} alt={user.fullName} className="h-full w-full object-cover" /> : initials}</div>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{user?.fullName || 'User'}</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">{user?.role || 'Account'}</p></div>
      <span className="text-lg text-slate-500 transition group-hover:text-mint">›</span>
    </NavLink>

    <div className="mb-3 shrink-0 px-3 text-[10px] font-bold uppercase tracking-[.22em] text-slate-500">{workspaceLabel}</div>
    <nav className="sidebar-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
      {links[user?.role]?.map(([label, path, icon]) => <NavLink key={path} onClick={onClose} to={path} className={({ isActive }) => `sidebar-link group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-200 ${isActive ? 'sidebar-link-active' : ''}`}><NavIcon name={icon} /><span>{t(label)}</span></NavLink>)}
    </nav>

    <div className="sidebar-note mt-5 shrink-0 rounded-2xl p-4 text-xs leading-5 text-slate-300"><span className="mb-2 block h-1 w-8 rounded-full bg-coral" />{t('sidebarNote')}</div>
  </aside>;
}
