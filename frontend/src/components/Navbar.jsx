import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import api, { unwrap } from '../api/axios';
import LanguageSwitcher from './LanguageSwitcher';

const announcementPath = { ADMIN: '/admin/announcements', TEACHER: '/teacher/announcements', STUDENT: '/student/announcements' };

function notificationPath(notification, role) {
  const title = String(notification?.title || '').toLowerCase();
  if (title.includes('friend request')) return '/friends';
  if (title.includes('new message')) return '/chat';
  if (title.includes('monthly payment')) return role === 'STUDENT' ? '/student/courses' : '/courses';
  return announcementPath[role] || '/community';
}

export default function Navbar({ onMenu }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const result = unwrap(await api.get('/notifications'));
      setNotifications(result.items || []);
      setUnreadCount(result.unreadCount || 0);
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 15000);
    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  const markRead = async (notification) => {
    if (!notification.isRead) {
      await api.patch(`/notifications/${notification.id}/read`).catch(() => undefined);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, isRead: true } : item));
      setUnreadCount((current) => Math.max(0, current - 1));
    }
    setShowNotifications(false);
    navigate(notificationPath(notification, user?.role));
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all').catch(() => undefined);
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  };

  return <header className="app-navbar sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-3 backdrop-blur dark:border-slate-700 dark:bg-[#0b1628]/90 sm:px-4 lg:px-8">
    <div className="flex min-w-0 items-center gap-2">
      <button type="button" onClick={onMenu} className="app-menu-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 lg:hidden dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" aria-label="Open navigation"><MenuIcon /></button>
      <div className="hidden min-w-0 truncate text-sm font-medium text-slate-500 lg:block">{t('goodToSee')}, {user?.fullName?.split(' ')[0]}</div>
      <div className="min-w-0 truncate text-xs font-semibold text-slate-500 sm:text-sm lg:hidden">{user?.fullName?.split(' ')[0]}</div>
    </div>

    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <div className="relative">
        <button type="button" onClick={() => setShowNotifications((current) => !current)} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" aria-label={t('notifications')} title={t('notifications')}>
          <BellIcon />
          {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>
        {showNotifications && <div className="absolute right-0 mt-3 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700"><p className="font-bold text-ink">{t('notifications')}</p><button type="button" onClick={markAllRead} className="text-xs font-semibold text-coral">{t('markAllRead')}</button></div>
          <div className="max-h-80 overflow-y-auto">{notifications.length ? notifications.map((notification) => <button type="button" key={notification.id} onClick={() => markRead(notification)} className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50 ${notification.isRead ? 'opacity-60' : 'bg-mint/30'}`}><div className="flex items-start gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? 'bg-slate-300' : 'bg-coral'}`} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{notification.title}</p>{notification.sender && <p className="mt-1 truncate text-[11px] font-semibold text-coral">{t('author')}: {notification.sender.fullName} · {notification.sender.role}</p>}<p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{notification.message}</p><p className="mt-1 text-[10px] text-slate-400">{new Date(notification.createdAt).toLocaleString()}</p></div></div></button>) : <p className="px-4 py-10 text-center text-sm text-slate-400">{t('noNotifications')}</p>}</div>
        </div>}
      </div>

      <LanguageSwitcher />
      <button type="button" onClick={toggleTheme} className="app-theme-button flex h-10 min-w-10 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-100 sm:px-3 sm:text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" title={isDark ? t('light') : t('dark')} aria-label={isDark ? t('light') : t('dark')}><span aria-hidden="true" className="text-sm">{isDark ? <SunIcon /> : <MoonIcon />}</span><span className="theme-label hidden sm:inline">{isDark ? t('light') : t('dark')}</span></button>
      <div className="dashboard-user-meta hidden text-right sm:block"><p className="max-w-36 truncate text-sm font-semibold text-ink">{user?.fullName}</p><p className="text-xs uppercase tracking-wider text-slate-400">{user?.role}</p></div>
      <button type="button" className="app-logout-button flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-2 text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-200 sm:px-3 sm:text-sm dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" onClick={logout} aria-label={t('signOut')} title={t('signOut')}><span className="logout-icon sm:hidden"><LogoutIcon /></span><span className="logout-label hidden sm:inline">{t('signOut')}</span></button>
    </div>
  </header>;
}

function MenuIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>; }
function BellIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></svg>; }
function SunIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>; }
function MoonIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z" /></svg>; }
function LogoutIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" /></svg>; }
