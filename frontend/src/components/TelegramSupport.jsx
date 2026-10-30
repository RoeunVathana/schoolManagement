import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '../hooks/useAuth';

const telegramUrl = 'https://t.me/RoeunVathana';
const telegramHandle = '@RoeunVathana';

function TelegramIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current"><path d="M21.6 3.2 2.9 10.4c-1.28.5-1.27 1.2-.23 1.51l4.8 1.5 1.85 5.74c.22.6.11.85.74.85.49 0 .7-.22.96-.48l2.32-2.25 4.83 3.57c.88.49 1.52.23 1.74-.82l3.15-14.85c.32-1.28-.49-1.86-1.46-1.41Zm-11.8 9.88 9.46-5.97c.47-.29.9-.13.55.19l-7.66 6.91-.3 3.22-2.05-4.35Z" /></svg>;
}

export default function TelegramSupport({ alwaysShow = false, publicMode = false, dockOpen = true }) {
  const { user } = useAuth();
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (!showQr || qrDataUrl) return;
    QRCode.toDataURL(telegramUrl, { width: 240, margin: 2, errorCorrectionLevel: 'H' })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [showQr, qrDataUrl]);

  useEffect(() => {
    if (!dockOpen) setShowQr(false);
  }, [dockOpen]);

  if (!alwaysShow && !['STUDENT', 'TEACHER', 'CUSTOMER'].includes(user?.role)) return null;

  const openTelegram = () => window.open(telegramUrl, '_blank', 'noopener,noreferrer');

  return <div aria-hidden={!dockOpen} className={`support-dock-item ${dockOpen ? 'is-expanded' : 'is-collapsed'} storefront-floating-support ${publicMode ? 'community-telegram-support' : ''} fixed bottom-5 right-5 z-40 flex items-end gap-2 sm:bottom-7 sm:right-7`}>
    {showQr && <div className="absolute bottom-14 right-0 w-64 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3"><div className="text-left"><p className="text-sm font-extrabold text-slate-800 dark:text-white">Scan for support</p><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{telegramHandle}</p></div><button type="button" onClick={() => setShowQr(false)} className="rounded-lg px-2 py-1 text-lg leading-none text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close QR code">×</button></div>
      {qrDataUrl ? <img src={qrDataUrl} alt={`Telegram QR code for ${telegramHandle}`} className="mx-auto h-52 w-52 rounded-xl border border-slate-100 object-contain dark:border-slate-700" /> : <div className="flex h-52 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">Preparing QR code…</div>}
      <button type="button" onClick={openTelegram} className="mt-3 w-full rounded-xl bg-[#229ED9] px-3 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#168dcc]">Open Telegram</button>
    </div>}
    <button type="button" onClick={() => setShowQr((current) => !current)} className="flex h-12 w-12 items-center justify-center rounded-full border border-[#263956] bg-[#0c192c] text-slate-200 shadow-xl shadow-[#07111f]/25 transition hover:-translate-y-0.5 hover:bg-[#132640]" aria-label="Scan Telegram support QR code" title="Scan Telegram QR code">▦</button>
    <button type="button" onClick={openTelegram} className="flex h-12 items-center gap-2 rounded-full bg-[#229ED9] px-4 text-sm font-extrabold text-white shadow-xl shadow-[#229ED9]/30 transition hover:-translate-y-0.5 hover:bg-[#168dcc]" aria-label={`Contact support on Telegram ${telegramHandle}`} title={`Contact support on Telegram ${telegramHandle}`}><TelegramIcon /><span className="hidden sm:inline">Support</span></button>
  </div>;
}
