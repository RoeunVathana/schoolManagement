import { useEffect, useState } from 'react'; import { Outlet, useLocation } from 'react-router-dom'; import Navbar from '../components/Navbar'; import Sidebar from '../components/Sidebar'; import TelegramSupport from '../components/TelegramSupport';
export default function AppShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => { document.body.classList.toggle('mobile-nav-open', open); return () => document.body.classList.remove('mobile-nav-open'); }, [open]);
  return <div className="app-background min-h-screen">
    {open && <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-[2px] md:hidden" />}
    <Sidebar open={open} onClose={() => setOpen(false)} />
    <div className="min-w-0 md:ml-64"><Navbar onMenu={() => setOpen(true)} /><main key={location.pathname} className="mx-auto max-w-[1500px] p-4 sm:p-5 md:p-8 animate-fade-up"><Outlet /></main></div>
    <TelegramSupport />
  </div>;
}
