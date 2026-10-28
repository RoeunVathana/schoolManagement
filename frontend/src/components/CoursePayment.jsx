import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Modal from './Modal';
import { useLanguage } from '../context/LanguageContext';

export default function CoursePayment({ payment, error, onCheck, onClose }) {
  const { t } = useLanguage();
  const [qrImage, setQrImage] = useState('');

  useEffect(() => {
    if (!payment?.qrString) return;
    QRCode.toDataURL(payment.qrString, { width: 320, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#10243f', light: '#ffffff' } }).then(setQrImage).catch(() => setQrImage(''));
  }, [payment?.qrString]);

  if (!payment) return null;
  const status = payment.status;
  const statusText = status === 'PAID' ? t('paymentPaid') : status === 'EXPIRED' ? t('paymentExpired') : status === 'FAILED' ? t('paymentFailed') : t('paymentPending');
  const statusClass = status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : status === 'FAILED' || status === 'EXPIRED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';

  return <Modal open title={t('coursePayment')} onClose={onClose}><div className="space-y-5 text-center"><div><h3 className="text-xl font-bold text-ink">{payment.courseName || t('course')}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{t('scanCoursePayment')}</p></div>{qrImage && status === 'PENDING' && <div className="mx-auto w-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><img src={qrImage} alt="KHQR course payment" className="h-64 w-64" /></div>}<div className="flex items-center justify-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>{status}</span><span className="text-2xl font-extrabold text-navy">{payment.amount} {payment.currency}</span></div><p className="text-sm font-semibold text-slate-700">{statusText}</p><p className="text-xs text-slate-400">Invoice: {payment.invoiceNumber}</p>{error && <div className="rounded-xl bg-amber-50 p-3 text-left text-sm leading-6 text-amber-700">{error}</div>}<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">{status === 'PENDING' && <button type="button" onClick={onCheck} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">{t('checkPayment')}</button>}<button type="button" onClick={onClose} className="rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white">{t('closePayment')}</button></div></div></Modal>;
}
