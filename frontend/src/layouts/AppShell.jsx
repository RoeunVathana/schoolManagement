import { useEffect, useState } from 'react'; import { Outlet, useLocation } from 'react-router-dom'; import Navbar from '../components/Navbar'; import Sidebar from '../components/Sidebar'; import SupportDock from '../components/SupportDock';
export default function AppShell() {
  const [open, setOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    const syncBodyScroll = () => {
      const isMobile = window.matchMedia('(max-width: 1023px)').matches;
      document.body.classList.toggle('mobile-nav-open', open && isMobile);
    };
    syncBodyScroll();
    window.addEventListener('resize', syncBodyScroll);
    return () => {
      window.removeEventListener('resize', syncBodyScroll);
      document.body.classList.remove('mobile-nav-open');
    };
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const syncViewport = () => {
      const height = Math.round(viewport?.height || window.innerHeight);
      const keyboardOffset = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
      setKeyboardOpen(keyboardOffset > 80);
      root.style.setProperty('--app-viewport-height', `${height}px`);
      root.style.setProperty('--app-keyboard-offset', `${keyboardOffset > 80 ? Math.round(keyboardOffset) : 0}px`);
    };
    syncViewport();
    viewport?.addEventListener('resize', syncViewport);
    viewport?.addEventListener('scroll', syncViewport);
    window.addEventListener('resize', syncViewport);
    return () => {
      viewport?.removeEventListener('resize', syncViewport);
      viewport?.removeEventListener('scroll', syncViewport);
      window.removeEventListener('resize', syncViewport);
      root.style.removeProperty('--app-viewport-height');
      root.style.removeProperty('--app-keyboard-offset');
    };
  }, []);
  return <div className={`app-background app-shell min-h-screen ${location.pathname === '/chat' ? 'app-shell-chat' : ''} ${keyboardOpen ? 'is-keyboard-open' : ''}`}>
    {open && <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-[2px] lg:hidden" />}
    <Sidebar open={open} onClose={() => setOpen(false)} />
    <div className="app-shell-content min-w-0 lg:ml-72"><Navbar menuOpen={open} onMenu={() => setOpen((current) => !current)} /><main key={location.pathname} className="app-main mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8 xl:p-10 animate-fade-up"><Outlet /></main></div>
    <SupportDock />
  </div>;
}
