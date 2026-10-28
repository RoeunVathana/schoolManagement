import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Modal from './Modal';
import PaymentQrFrame from './PaymentQrFrame';
import { useLanguage } from '../context/LanguageContext';

export default function CoursePayment({ payment, error, onCheck, onClose }) {
  const { t } = useLanguage();
  const [qrImage, setQrImage] = useState('');

  useEffect(() => {
    if (!payment?.qrString) return;
    QRCode.toDataURL(payment.qrString, { width: 360, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#10243f', light: '#ffffff' } }).then(setQrImage).catch(() => setQrImage(''));
  }, [payment?.qrString]);

  if (!payment) return null;
  const status = payment.status;
  const statusText = status === 'PAID' ? t('paymentPaid') : status === 'EXPIRED' ? t('paymentExpired') : status === 'FAILED' ? t('paymentFailed') : t('paymentPending');
  const statusClass = status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200' : status === 'FAILED' || status === 'EXPIRED' ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200';

  return <Modal open fullScreen title={t('coursePayment')} onClose={onClose}>
    <div className="payment-sheet payment-sheet-fullscreen mx-auto w-full max-w-5xl space-y-5 text-center">
      <div className="payment-sheet-heading">
        <div className="mb-3 flex items-center justify-center gap-2"><span className="payment-bakong-dot" /><span className="text-xs font-extrabold uppercase tracking-[.2em] text-[#174c92] dark:text-[#b9d7ff]">ABA Pay · Bakong</span></div>
        <h3 className="text-xl font-extrabold text-ink">{payment.courseName || t('course')}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{t('scanCoursePayment')}</p>
      </div>

      {qrImage && status === 'PENDING' && <PaymentQrFrame qrImage={qrImage} alt="KHQR course payment" />}

      <div className="payment-amount-card mx-auto flex max-w-sm items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left">
        <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500 dark:text-slate-400">{t('amountDue') || 'Amount due'}</p><p className="mt-1 text-2xl font-extrabold text-[#174c92] dark:text-[#b9d7ff]">{payment.amount} {payment.currency}</p></div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>{status}</span>
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{statusText}</p>
      <p className="text-xs text-slate-400">{t('invoice') || 'Invoice'}: {payment.invoiceNumber}</p>
      {error && <div className="rounded-xl bg-amber-50 p-3 text-left text-sm leading-6 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">{error}</div>}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">{status === 'PENDING' && <button type="button" onClick={onCheck} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">{t('checkPayment')}</button>}<button type="button" onClick={onClose} className="rounded-xl bg-[#174c92] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#174c92]/20 transition hover:-translate-y-0.5 hover:bg-[#123b73]">{t('closePayment')}</button></div>
    </div>
  </Modal>;
}
