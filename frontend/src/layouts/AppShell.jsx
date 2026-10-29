import { useEffect, useState } from 'react'; import { Outlet, useLocation } from 'react-router-dom'; import Navbar from '../components/Navbar'; import Sidebar from '../components/Sidebar'; import TelegramSupport from '../components/TelegramSupport';
export default function AppShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => { document.body.classList.toggle('mobile-nav-open', open); return () => document.body.classList.remove('mobile-nav-open'); }, [open]);
  return <div className="app-background app-shell min-h-screen">
    {open && <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-[2px] lg:hidden" />}
    <Sidebar open={open} onClose={() => setOpen(false)} />
    <div className="app-shell-content min-w-0 lg:ml-72"><Navbar onMenu={() => setOpen(true)} /><main key={location.pathname} className="app-main mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8 xl:p-10 animate-fade-up"><Outlet /></main></div>
    <TelegramSupport />
  </div>;
}
