import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useCommunityText } from '../context/communityTranslations';
import api, { unwrap } from '../api/axios';
import LanguageSwitcher from './LanguageSwitcher';
import { dashboardLinks, NavIcon } from './Sidebar';

const announcementPath = { ADMIN: '/admin/announcements', TEACHER: '/teacher/announcements', STUDENT: '/student/announcements', CUSTOMER: '/student/announcements' };

function notificationPath(notification, role) {
  const title = String(notification?.title || '').toLowerCase();
  if (title.includes('friend request')) return '/friends';
  if (title.includes('group invitation')) return '/groups';
  if (title.includes('new message')) return '/chat';
  if (title.includes('monthly payment')) return ['STUDENT', 'CUSTOMER'].includes(role) ? '/student/courses' : '/courses';
  return announcementPath[role] || '/community';
}

function telegramInviteLink(notification) {
  if (!String(notification?.title || '').toLowerCase().includes('telegram group')) return '';
  const match = String(notification?.message || '').match(/https:\/\/(?:(?:www\.)?t\.me|(?:www\.)?telegram\.me)\/[^\s<]+/i);
  return match?.[0] || '';
}

function playNotificationTone(context) {
  const now = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
  gain.connect(context.destination);
  [740, 988].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start(now + index * 0.1);
    oscillator.stop(now + 0.42);
  });
}

export default function Navbar({ onMenu, menuOpen = false }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t, language } = useLanguage();
  const communityText = useCommunityText();
  const roleKey = { ADMIN: 'administrator', TEACHER: 'teacher', STUDENT: 'student', CUSTOMER: 'student' }[user?.role];
  const translatedRole = roleKey ? t(roleKey) : '';
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('campusflow_notification_sound') !== 'off');
  const [audioReady, setAudioReady] = useState(false);
  const seenNotificationIds = useRef(new Set());
  const notificationFeedReady = useRef(false);
  const audioContextRef = useRef(null);
  const audioUnlocked = useRef(false);
  const dashboardSearchRef = useRef(null);
  const dashboardSearchInputRef = useRef(null);
  const [dashboardSearchOpen, setDashboardSearchOpen] = useState(false);
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');

  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    audioContextRef.current ||= new AudioContext();
    return audioContextRef.current;
  }, []);

  const playNotificationSound = useCallback((force = false) => {
    if ((!soundEnabled && !force) || !audioUnlocked.current) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([80, 40, 80]);
    const context = getAudioContext();
    if (!context) return;
    const play = () => {
      if (context.state === 'running') playNotificationTone(context);
    };
    if (context.state === 'suspended') {
      context.resume().then(play).catch(() => undefined);
      return;
    }
    play();
  }, [getAudioContext, soundEnabled]);

  const unlockAudio = useCallback(() => {
    const context = getAudioContext();
    if (!context) return;
    audioUnlocked.current = true;
    setAudioReady(true);
    // Start a silent oscillator during the user gesture. This unlocks audio
    // on iOS Safari and mobile Chrome before a later polling request arrives.
    const silentGain = context.createGain();
    silentGain.gain.value = 0;
    silentGain.connect(context.destination);
    const silentOscillator = context.createOscillator();
    silentOscillator.connect(silentGain);
    silentOscillator.start();
    silentOscillator.stop(context.currentTime + 0.01);
    if (context.state === 'suspended') context.resume().catch(() => undefined);
  }, [getAudioContext]);

  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio, { passive: true, capture: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true, capture: true });
    window.addEventListener('click', unlockAudio, { passive: true, capture: true });
    window.addEventListener('keydown', unlockAudio, { passive: true, capture: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio, true);
      window.removeEventListener('touchstart', unlockAudio, true);
      window.removeEventListener('click', unlockAudio, true);
      window.removeEventListener('keydown', unlockAudio, true);
      audioContextRef.current?.close().catch(() => undefined);
      audioContextRef.current = null;
    };
  }, [unlockAudio]);

  useEffect(() => {
    seenNotificationIds.current = new Set();
    notificationFeedReady.current = false;
  }, [user?.id]);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const result = unwrap(await api.get('/notifications'));
      const items = result.items || [];
      if (notificationFeedReady.current) {
        const newUnreadItems = items.filter((item) => !item.isRead && !seenNotificationIds.current.has(item.id));
        if (newUnreadItems.length) playNotificationSound();
      }
      items.forEach((item) => seenNotificationIds.current.add(item.id));
      notificationFeedReady.current = true;
      setNotifications(items);
      setUnreadCount(result.unreadCount || 0);
    } catch {}
  }, [playNotificationSound, user?.id]);

  useEffect(() => {
    loadNotifications();
    const refreshNotifications = () => {
      if (document.hidden) return;
      const activeElement = document.activeElement;
      if (activeElement?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
      loadNotifications();
    };
    const timer = window.setInterval(refreshNotifications, 30000);
    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  useEffect(() => {
    const closeSearchOnOutsideClick = (event) => {
      if (!dashboardSearchRef.current?.contains(event.target)) setDashboardSearchOpen(false);
    };
    const handleSearchKeyboard = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setDashboardSearchOpen(true);
        window.requestAnimationFrame(() => dashboardSearchInputRef.current?.focus());
      }
      if (event.key === 'Escape') setDashboardSearchOpen(false);
    };
    document.addEventListener('pointerdown', closeSearchOnOutsideClick);
    document.addEventListener('keydown', handleSearchKeyboard);
    return () => {
      document.removeEventListener('pointerdown', closeSearchOnOutsideClick);
      document.removeEventListener('keydown', handleSearchKeyboard);
    };
  }, []);

  const dashboardSearchItems = (dashboardLinks[user?.role] || []).map(([key, path, icon]) => ({
    key,
    path: key === 'profile' && (user?.role === 'STUDENT' || user?.role === 'CUSTOMER') ? '/student/profile' : path,
    icon,
    label: key === 'groups' ? communityText.groups : key === 'contactMessages' ? (language === 'km' ? 'សារទំនាក់ទំនង' : 'Contact messages') : t(key),
  }));
  const normalizedSearch = dashboardSearchQuery.trim().toLocaleLowerCase();
  const filteredDashboardSearchItems = dashboardSearchItems.filter((item) => !normalizedSearch || `${item.label} ${item.key} ${item.path}`.toLocaleLowerCase().includes(normalizedSearch));
  const selectDashboardSearchItem = (path) => {
    setDashboardSearchOpen(false);
    setDashboardSearchQuery('');
    navigate(path);
  };

  const markRead = async (notification) => {
    const inviteLink = telegramInviteLink(notification);
    // Open while the click gesture is still active. Waiting for the read API
    // call first can make mobile browsers block the Telegram tab as a popup.
    if (inviteLink) window.open(inviteLink, '_blank', 'noopener,noreferrer');
    if (!notification.isRead) {
      await api.patch(`/notifications/${notification.id}/read`).catch(() => undefined);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, isRead: true } : item));
      setUnreadCount((current) => Math.max(0, current - 1));
    }
    setShowNotifications(false);
    if (!inviteLink) navigate(notificationPath(notification, user?.role));
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all').catch(() => undefined);
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  };

  return <header className="app-navbar sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-3 backdrop-blur dark:border-slate-700 dark:bg-[#0b1628]/90 sm:px-4 lg:px-8">
    <div className="flex min-w-0 items-center gap-2">
      <button type="button" onClick={onMenu} className={`app-menu-button ${menuOpen ? 'is-open' : ''} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 lg:hidden dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200`} aria-expanded={menuOpen} aria-controls="dashboard-navigation" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}><>{menuOpen ? <CloseIcon /> : <MenuIcon />}</></button>
      <div className="hidden min-w-0 truncate text-sm font-medium text-slate-500 lg:block">{t('goodToSee')}, {user?.fullName?.split(' ')[0]}</div>
      <div className="min-w-0 truncate text-xs font-semibold text-slate-500 sm:text-sm lg:hidden">{user?.fullName?.split(' ')[0]}</div>
    </div>

    <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
      <div ref={dashboardSearchRef} className={`dashboard-search relative w-10 min-w-10 sm:w-[clamp(9rem,18vw,14rem)] sm:min-w-0 lg:w-[clamp(13rem,20vw,17rem)] ${dashboardSearchOpen ? 'is-open' : ''}`}>
        <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition focus-within:border-[#229ed9] focus-within:ring-2 focus-within:ring-[#229ed9]/15 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <SearchIcon />
          <input ref={dashboardSearchInputRef} type="search" value={dashboardSearchQuery} onFocus={() => setDashboardSearchOpen(true)} onChange={(event) => { setDashboardSearchQuery(event.target.value); setDashboardSearchOpen(true); }} onKeyDown={(event) => { if (event.key === 'Enter' && filteredDashboardSearchItems[0]) selectDashboardSearchItem(filteredDashboardSearchItems[0].path); }} placeholder={language === 'km' ? 'ស្វែងរកទំព័រ...' : 'Search dashboard pages...'} aria-label={language === 'km' ? 'ស្វែងរកទំព័រផ្ទាំងគ្រប់គ្រង' : 'Search dashboard pages'} aria-expanded={dashboardSearchOpen} className="hidden min-w-0 flex-1 bg-transparent px-2 text-xs font-semibold text-ink outline-none placeholder:text-slate-400 sm:block dark:text-white" />
          <button type="button" onClick={() => { setDashboardSearchOpen((current) => !current); window.requestAnimationFrame(() => dashboardSearchInputRef.current?.focus()); }} className="flex h-full w-full items-center justify-center sm:hidden" aria-label={language === 'km' ? 'បើកការស្វែងរក' : 'Open dashboard search'} aria-expanded={dashboardSearchOpen}><SearchIcon /></button>
          <kbd className="mr-2 hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-400 lg:inline dark:border-slate-600 dark:bg-slate-700">⌘K</kbd>
        </div>
        {dashboardSearchOpen && <div className="absolute right-0 top-full z-50 mt-2 max-h-[min(28rem,70vh)] w-[min(23rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-950/15 dark:border-slate-700 dark:bg-[#101d31]">
          <div className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{language === 'km' ? 'ទំព័រផ្ទាំងគ្រប់គ្រង' : 'Dashboard pages'}</div>
          {filteredDashboardSearchItems.length ? filteredDashboardSearchItems.map((item) => <button type="button" key={item.path} onClick={() => selectDashboardSearchItem(item.path)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eaf7f3] text-[#1c8c74] dark:bg-emerald-950/40 dark:text-[#8de4ca]"><NavIcon name={item.icon} /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold text-ink dark:text-white">{item.label}</span><span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400">{item.path}</span></span>
            <span className="text-sm text-slate-400" aria-hidden="true">→</span>
          </button>) : <p className="px-3 py-6 text-center text-xs font-semibold text-slate-500">{language === 'km' ? 'រកមិនឃើញទំព័រទេ។' : 'No dashboard page found.'}</p>}
        </div>}
      </div>
      <div className="relative">
        <button type="button" onClick={() => setShowNotifications((current) => !current)} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" aria-label={t('notifications')} aria-expanded={showNotifications} aria-controls="app-notification-panel" title={t('notifications')}>
          <BellIcon />
          {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>
        {showNotifications && <div id="app-notification-panel" className="app-notification-panel" role="dialog" aria-label={t('notifications')}>
          <div className="app-notification-header"><div><p className="app-notification-kicker">CAMPUSFLOW</p><p className="app-notification-title">{t('notifications')}</p></div><div className="flex items-center gap-2"><button type="button" onPointerDown={unlockAudio} onClick={() => { const next = !soundEnabled; unlockAudio(); setSoundEnabled(next); localStorage.setItem('campusflow_notification_sound', next ? 'on' : 'off'); if (next) window.setTimeout(() => playNotificationSound(true), 0); }} className="app-notification-mark-read" title={soundEnabled ? (audioReady ? t('soundOff') : `${t('soundOn')} · tap once to enable`) : t('soundOn')}>{soundEnabled ? t('soundOn') : t('soundOff')}</button><button type="button" onClick={markAllRead} className="app-notification-mark-read">{t('markAllRead')}</button></div></div>
          <div className="app-notification-list">{notifications.length ? notifications.map((notification) => <button type="button" key={notification.id} onClick={() => markRead(notification)} className={`app-notification-item ${notification.isRead ? 'is-read' : 'is-unread'}`}><span className={`app-notification-dot ${notification.isRead ? 'is-read' : ''}`} /><span className="app-notification-copy"><span className="app-notification-item-title">{notification.title}</span>{notification.sender && <span className="app-notification-sender">{t('author')}: {notification.sender.fullName} · {notification.sender.role}</span>}<span className="app-notification-message">{notification.message}</span><time dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString()}</time></span><span className="app-notification-arrow" aria-hidden="true">→</span></button>) : <p className="app-notification-empty">{t('noNotifications')}</p>}</div>
        </div>}
      </div>

      <LanguageSwitcher />
      <button type="button" onClick={toggleTheme} className="app-theme-button flex h-10 min-w-10 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-100 sm:px-3 sm:text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" title={isDark ? t('light') : t('dark')} aria-label={isDark ? t('light') : t('dark')}><span aria-hidden="true" className="text-sm">{isDark ? <SunIcon /> : <MoonIcon />}</span><span className="theme-label hidden sm:inline">{isDark ? t('light') : t('dark')}</span></button>
      <div className="dashboard-user-meta hidden text-right lg:block"><p className="max-w-36 truncate text-sm font-semibold text-ink">{user?.fullName}</p><p className="text-xs uppercase tracking-wider text-slate-400">{translatedRole}</p></div>
      <button type="button" className="app-logout-button flex h-10 min-w-10 items-center justify-center gap-2 rounded-xl border border-rose-200/80 bg-white px-2 text-rose-600 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50 sm:px-3 sm:text-sm dark:border-rose-900/60 dark:bg-slate-800 dark:text-rose-300 dark:hover:bg-rose-950/30" onClick={logout} aria-label={t('signOut')} title={t('signOut')}><span className="logout-icon sm:hidden"><LogoutIcon /></span><span className="logout-label hidden sm:inline">{t('signOut')}</span></button>
    </div>
  </header>;
}

function MenuIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>; }
function CloseIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="h-5 w-5"><path d="m6 6 12 12M18 6 6 18" /></svg>; }
function BellIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></svg>; }
function SunIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>; }
function MoonIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z" /></svg>; }
function LogoutIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" /></svg>; }
function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.5 4.5" /></svg>; }
