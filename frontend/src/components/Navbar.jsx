import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import api, { unwrap } from '../api/axios';

const announcementPath = { ADMIN: '/admin/announcements', TEACHER: '/teacher/announcements', STUDENT: '/student/announcements' };
const countryFlag = { km: 'https://flagcdn.com/w40/kh.png', en: 'https://flagcdn.com/w40/gb.png' };

export default function Navbar({ onMenu }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

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

  useEffect(() => {
    if (!showLanguageMenu) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-dashboard-language]')) {
        setShowLanguageMenu(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [showLanguageMenu]);

  const changeLanguage = async (next) => {
    setLanguage(next);
    setShowLanguageMenu(false);
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

  return <header className="app-navbar sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-3 backdrop-blur dark:border-slate-700 sm:px-4 lg:px-8">
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

      <div className="relative" data-dashboard-language>
        <button type="button" onClick={() => setShowLanguageMenu((current) => !current)} className={`group flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-2xl border px-2 text-xs font-extrabold shadow-sm transition duration-200 hover:-translate-y-0.5 sm:px-3 sm:text-sm ${showLanguageMenu ? 'border-[#229ed9]/60 bg-[#e8f5fb] text-[#14536a] shadow-[#229ed9]/10 dark:border-[#4ab8df]/60 dark:bg-[#173d4d] dark:text-[#e8fff7]' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'}`} aria-haspopup="menu" aria-expanded={showLanguageMenu} aria-label={t('language')} title={t('language')}>
          <span className="flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-slate-200 shadow-sm ring-1 ring-black/10 transition duration-200 group-hover:scale-110 dark:bg-slate-700" aria-hidden="true"><img src={countryFlag[language]} alt="" className="h-full w-full object-cover" /></span>
          <span>{language === 'en' ? 'English' : 'ខ្មែរ'}</span>
          <span aria-hidden="true" className={`text-[11px] text-slate-400 transition duration-200 ${showLanguageMenu ? 'rotate-180 text-[#229ed9]' : ''}`}>⌄</span>
        </button>
        {showLanguageMenu && <div role="menu" className="absolute right-0 top-[calc(100%+.65rem)] z-[100] w-56 origin-top-right overflow-hidden rounded-[1.15rem] border border-slate-200 bg-white p-2 shadow-[0_22px_55px_rgba(16,36,63,.22)] ring-1 ring-black/5 backdrop-blur-xl dark:border-[#2d5570] dark:bg-[#0f1e32] dark:shadow-[0_22px_55px_rgba(0,0,0,.42)] dark:ring-white/5">
          <div className="flex items-center justify-between px-3 pb-2 pt-1.5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400 dark:text-slate-500">{t('language')}</p><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:bg-slate-800 dark:text-slate-500">{language === 'en' ? 'EN' : 'KH'}</span></div>
          <button type="button" role="menuitemradio" aria-checked={language === 'km'} onClick={() => changeLanguage('km')} className={`group flex w-full items-center gap-3 rounded-[.9rem] px-3 py-2.5 text-left text-sm font-extrabold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#229ed9]/50 ${language === 'km' ? 'bg-gradient-to-r from-[#173f4f] to-[#18354b] text-white shadow-[0_8px_18px_rgba(16,66,83,.22)]' : 'text-slate-700 hover:bg-slate-100 dark:text-[#d9e9f5] dark:hover:bg-[#19324a]'}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl transition duration-200 ${language === 'km' ? 'bg-white/10 shadow-inner' : 'bg-slate-100 group-hover:scale-105 dark:bg-[#203b55]'}`}><img src={countryFlag.km} alt="Cambodia" className="h-4 w-6 rounded-[3px] object-cover shadow-sm" /></span><span className="flex-1">ខ្មែរ</span>{language === 'km' && <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-[#229ed9] text-xs text-white shadow-sm">✓</span>}</button>
          <button type="button" role="menuitemradio" aria-checked={language === 'en'} onClick={() => changeLanguage('en')} className={`group mt-1 flex w-full items-center gap-3 rounded-[.9rem] px-3 py-2.5 text-left text-sm font-extrabold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#229ed9]/50 ${language === 'en' ? 'bg-gradient-to-r from-[#173f4f] to-[#18354b] text-white shadow-[0_8px_18px_rgba(16,66,83,.22)]' : 'text-slate-700 hover:bg-slate-100 dark:text-[#d9e9f5] dark:hover:bg-[#19324a]'}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl transition duration-200 ${language === 'en' ? 'bg-white/10 shadow-inner' : 'bg-slate-100 group-hover:scale-105 dark:bg-[#203b55]'}`}><img src={countryFlag.en} alt="United Kingdom" className="h-4 w-6 rounded-[3px] object-cover shadow-sm" /></span><span className="flex-1">English</span>{language === 'en' && <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-[#229ed9] text-xs text-white shadow-sm">✓</span>}</button>
        </div>}
      </div>
      <button type="button" onClick={toggleTheme} className="app-theme-button flex h-10 min-w-10 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-100 sm:px-3 sm:text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" title="Toggle theme"><span aria-hidden="true" className="text-sm">{isDark ? <SunIcon /> : <MoonIcon />}</span><span className="theme-label hidden sm:inline">{isDark ? t('light') : t('dark')}</span></button>
      <div className="dashboard-user-meta hidden text-right sm:block"><p className="max-w-36 truncate text-sm font-semibold text-ink">{user?.fullName}</p><p className="text-xs uppercase tracking-wider text-slate-400">{user?.role}</p></div>
      <button type="button" className="app-logout-button flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-2 text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-200 sm:px-3 sm:text-sm dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" onClick={logout} aria-label={t('signOut')} title={t('signOut')}><span className="logout-icon sm:hidden"><LogoutIcon /></span><span className="logout-label hidden sm:inline">{t('signOut')}</span></button>
    </div>
  </header>;
}

function MenuIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>; }
function BellIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></svg>; }
function SunIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>; }
function MoonIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z" /></svg>; }
function LogoutIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" /></svg>; }
