import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Modal from './Modal';
import PaymentQrFrame from './PaymentQrFrame';
import { useLanguage } from '../context/LanguageContext';

export default function CoursePayment({ payment, error, onCheck, onRefresh, onClose }) {
  const { t, language } = useLanguage();
  const [qrImage, setQrImage] = useState('');

  useEffect(() => {
    if (!payment?.qrString) return;
    QRCode.toDataURL(payment.qrString, { width: 800, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } }).then(setQrImage).catch(() => setQrImage(''));
  }, [payment?.qrString]);

  if (!payment) return null;
  const status = payment.status;
  const scanLabel = language === 'km' ? 'ស្កេនដោយកម្មវិធីធនាគារដែលគាំទ្រ KHQR' : 'Scan with any KHQR-supported bank app';
  const universalPaymentLabel = language === 'km' ? 'KHQR សម្រាប់ធនាគារដែលចូលរួម' : 'Universal KHQR payment';
  const universalPaymentHint = language === 'km' ? 'ប្រើកម្មវិធីធនាគារដែលគាំទ្រ KHQR ដើម្បីស្កេន និងបង់ប្រាក់' : 'Use any participating bank app that supports KHQR to scan and pay.';
  const otherBanksLabel = language === 'km' ? 'ធនាគារផ្សេងទៀត' : 'Other KHQR banks';
  const statusText = status === 'PAID' ? t('paymentPaid') : status === 'EXPIRED' ? t('paymentExpired') : status === 'FAILED' ? t('paymentFailed') : t('paymentPending');
  const statusClass = status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200' : status === 'FAILED' || status === 'EXPIRED' ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200';

  return <Modal open title={t('coursePayment')} onClose={onClose} className="payment-modal-panel">
    <div className="payment-sheet payment-modal-shell mx-auto w-full space-y-3 text-center">
      <div className="hidden">
        <div className="mb-3 flex items-center justify-center gap-2"><span className="payment-bakong-dot" /><span className="text-xs font-extrabold uppercase tracking-[.2em] text-[#174c92] dark:text-[#b9d7ff]">ABA Pay · Bakong</span></div>
        <h3 className="text-2xl font-extrabold tracking-tight text-ink dark:text-white">{payment.courseName || t('course')}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{universalPaymentHint}</p>
      </div>

      {qrImage && status === 'PENDING' ? <><div className="payment-universal-card"><div className="payment-universal-mark">KHQR</div><div className="min-w-0 text-left"><p className="text-sm font-extrabold text-ink dark:text-white">{universalPaymentLabel}</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">ABA Pay · Bakong · {otherBanksLabel}</p></div></div><PaymentQrFrame qrImage={qrImage} alt="KHQR course payment" scanLabel={scanLabel} /></> : status === 'PENDING' ? <div className="payment-qr-loading"><span className="loading-spinner" />Preparing secure QR...</div> : <div className="payment-qr-placeholder">{statusText}</div>}

      <div className="payment-amount-card payment-modal-amount mx-auto flex max-w-sm items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left">
        <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500 dark:text-slate-400">{t('amountDue') || 'Amount due'}</p><p className="mt-1 text-2xl font-extrabold text-[#174c92] dark:text-[#b9d7ff]">{payment.amount} {payment.currency}</p></div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>{status}</span>
      </div>
      <div className="payment-status-card"><span className="payment-status-icon">{status === 'PAID' ? '✓' : status === 'PENDING' ? '⏱' : '!'}</span><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{statusText}</p></div>
      <p className="payment-invoice text-xs text-slate-400">{t('invoice') || 'Invoice'}: {payment.invoiceNumber}</p>
      {error && <div className="rounded-xl bg-amber-50 p-3 text-left text-sm leading-6 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">{error}</div>}
      <div className="payment-modal-actions">{status === 'PENDING' && onRefresh && <button type="button" onClick={onRefresh} className="payment-secondary-button">{t('refreshPayment') || 'New QR code'}</button>}{status === 'PENDING' && <button type="button" onClick={onCheck} className="payment-secondary-button">{t('checkPayment')}</button>}<button type="button" onClick={onClose} className="payment-primary-button">{t('closePayment')}</button></div>
    </div>
  </Modal>;
}
