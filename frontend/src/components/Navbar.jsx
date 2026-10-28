import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import api, { unwrap } from '../api/axios';

const announcementPath = { ADMIN: '/admin/announcements', TEACHER: '/teacher/announcements', STUDENT: '/student/announcements' };

export default function Navbar({ onMenu }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
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

  const changeLanguage = async () => {
    const next = language === 'en' ? 'km' : 'en';
    setLanguage(next);
    try { await api.patch('/auth/profile', { language: next }); } catch {}
  };

  const markRead = async (notification) => {
    if (!notification.isRead) {
      await api.patch(`/notifications/${notification.id}/read`).catch(() => undefined);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, isRead: true } : item));
      setUnreadCount((current) => Math.max(0, current - 1));
    }
    setShowNotifications(false);
    navigate(announcementPath[user?.role] || '/');
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all').catch(() => undefined);
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  };

  return <header className="relative z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
    <button onClick={onMenu} className="rounded-lg p-2 text-xl md:hidden">☰</button>
    <div className="hidden text-sm font-medium text-slate-500 md:block">{t('goodToSee')}, {user?.fullName?.split(' ')[0]}</div>
    <div className="flex items-center gap-2">
      <div className="relative">
        <button onClick={() => setShowNotifications((current) => !current)} className="relative rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-100" aria-label={t('notifications')} title={t('notifications')}>
          <span aria-hidden="true">🔔</span>
          {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>
        {showNotifications && <div className="absolute right-0 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700"><p className="font-bold text-ink">{t('notifications')}</p><button onClick={markAllRead} className="text-xs font-semibold text-coral">{t('markAllRead')}</button></div>
          <div className="max-h-80 overflow-y-auto">{notifications.length ? notifications.map((notification) => <button key={notification.id} onClick={() => markRead(notification)} className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50 ${notification.isRead ? 'opacity-60' : 'bg-mint/30'}`}><div className="flex items-start gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? 'bg-slate-300' : 'bg-coral'}`} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{notification.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{notification.message}</p><p className="mt-1 text-[10px] text-slate-400">{new Date(notification.createdAt).toLocaleString()}</p></div></div></button>) : <p className="px-4 py-10 text-center text-sm text-slate-400">{t('noNotifications')}</p>}</div>
        </div>}
      </div>
      <button onClick={changeLanguage} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-100">{language === 'en' ? 'ខ្មែរ' : 'English'}</button>
      <button onClick={toggleTheme} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-100" title="Toggle theme">{isDark ? `☀️ ${t('light')}` : `🌙 ${t('dark')}`}</button>
      <div className="hidden text-right sm:block"><p className="text-sm font-semibold text-ink">{user?.fullName}</p><p className="text-xs uppercase tracking-wider text-slate-400">{user?.role}</p></div>
      <button className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-200" onClick={logout}>{t('signOut')}</button>
    </div>
  </header>;
}
