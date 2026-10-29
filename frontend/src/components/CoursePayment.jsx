import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Modal from './Modal';
import PaymentQrFrame from './PaymentQrFrame';
import PaymentReceipt from './PaymentReceipt';
import { useLanguage } from '../context/LanguageContext';

export default function CoursePayment({ payment, error, paymentUnavailable = false, onCheck, checkingPayment = false, onRefresh, onPlanChange, planChanging = false, onClose }) {
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
  const paymentPlanLabel = payment.paymentPlan === 'MONTHLY' ? t('monthlyPayment') : t('fullCoursePayment');
  const fullCourseAmount = payment.fullCourseAmount || (payment.paymentPlan === 'FULL' ? payment.amount : '—');
  const monthlyAmount = payment.monthlyPrice || (payment.paymentPlan === 'MONTHLY' ? payment.amount : '—');
  const choosePlan = (plan) => { if (status === 'PENDING' && !planChanging && payment.paymentPlan !== plan) onPlanChange?.(plan); };
  const supportAlert = Boolean(error) && (paymentUnavailable || /bakong|daily request limit|request limit|not configured|temporarily unavailable|verification/i.test(String(error)));

  return <Modal open title={t('coursePayment')} onClose={onClose} className="payment-modal-panel">
    <div className="payment-sheet payment-modal-shell mx-auto w-full text-center">
      <div className="payment-modal-hero rounded-2xl border border-[#d7e7f2] bg-gradient-to-br from-[#f3f9ff] via-white to-[#f1fcf7] text-left shadow-sm dark:border-slate-700 dark:from-[#172f4b] dark:via-[#132238] dark:to-[#122e35]"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2"><span className="payment-bakong-dot" /><span className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#174c92] dark:text-[#b9d7ff]">Secure KHQR checkout</span></div><h3 className="mt-2 truncate text-lg font-extrabold tracking-tight text-ink dark:text-white">{payment.courseName || t('course')}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-300">{universalPaymentHint}</p></div><span className="payment-universal-mark">KHQR</span></div></div>

      <div className="payment-universal-card"><div className="payment-universal-mark">KHQR</div><div className="min-w-0 text-left"><p className="text-sm font-extrabold text-ink dark:text-white">{universalPaymentLabel}</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">ABA Pay · Bakong · {otherBanksLabel}</p></div><span className="ml-auto hidden rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 sm:inline-flex">Verified network</span></div>

      <div className="payment-modal-content"><div className="payment-modal-visual">{qrImage && status === 'PENDING' ? <PaymentQrFrame qrImage={qrImage} alt="KHQR course payment" scanLabel={scanLabel} /> : status === 'PENDING' ? <div className="payment-qr-loading"><span className="loading-spinner" />Preparing secure QR...</div> : <div className="payment-qr-placeholder">{statusText}</div>}</div><div className="payment-modal-details">
      <div className="payment-amount-card payment-modal-amount flex items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left">
        <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500 dark:text-slate-400">{t('amountDue') || 'Amount due'}</p><p className="mt-1 text-2xl font-extrabold text-[#174c92] dark:text-[#b9d7ff]">{payment.amount} {payment.currency}</p></div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>{status}</span>
      </div>
      <section className="payment-plan-card rounded-2xl border border-[#8de4ca]/70 bg-gradient-to-br from-[#effcf7] to-[#eef6ff] p-4 text-left shadow-sm dark:border-[#2f8b78] dark:from-[#122e35] dark:to-[#132238]" aria-label={t('paymentPlan')}>
        <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500 dark:text-slate-400">{t('choosePaymentPlan')}</p>{planChanging && <span className="text-xs font-bold text-[#229ed9]">{t('loading')}</span>}</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button type="button" disabled={status !== 'PENDING' || planChanging} onClick={() => choosePlan('FULL')} className={`rounded-xl border p-3 text-left transition ${payment.paymentPlan === 'FULL' ? 'border-[#17624e] bg-[#dff8ee] shadow-sm dark:border-[#8de4ca] dark:bg-[#173f42]' : 'border-white/80 bg-white/55 hover:border-[#229ed9] dark:border-slate-700 dark:bg-slate-950/35'} disabled:cursor-not-allowed disabled:opacity-70`}><div className="flex items-center justify-between gap-2"><span className="text-sm font-black text-[#10243f] dark:text-white">{t('fullCoursePayment')}</span><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${payment.paymentPlan === 'FULL' ? 'bg-[#17624e] text-white' : 'bg-slate-200 text-slate-400 dark:bg-slate-700'}`}>{payment.paymentPlan === 'FULL' ? '✓' : ''}</span></div><p className="mt-2 text-sm font-extrabold text-[#10243f] dark:text-[#a5f1dc]">{fullCourseAmount} {payment.currency}</p><span className="mt-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">{t('oneTimePayment')}</span></button>
          {payment.monthlyPaymentEnabled ? <button type="button" disabled={status !== 'PENDING' || planChanging} onClick={() => choosePlan('MONTHLY')} className={`rounded-xl border p-3 text-left transition ${payment.paymentPlan === 'MONTHLY' ? 'border-[#229ed9] bg-[#e3f5ff] shadow-sm dark:border-[#229ed9] dark:bg-[#123047]' : 'border-white/80 bg-white/55 hover:border-[#229ed9] dark:border-slate-700 dark:bg-slate-950/35'} disabled:cursor-not-allowed disabled:opacity-70`}><div className="flex items-center justify-between gap-2"><span className="text-sm font-black text-[#10243f] dark:text-white">{t('monthlyPayment')}</span><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${payment.paymentPlan === 'MONTHLY' ? 'bg-[#229ed9] text-white' : 'bg-slate-200 text-slate-400 dark:bg-slate-700'}`}>{payment.paymentPlan === 'MONTHLY' ? '✓' : ''}</span></div><p className="mt-2 text-sm font-extrabold text-[#10243f] dark:text-[#a5f1dc]">{monthlyAmount} {payment.currency}</p><span className="mt-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">{payment.billingPeriod ? `${t('billingPeriod')}: ${payment.billingPeriod}` : `/${t('month')}`}</span></button> : <div className="rounded-xl border border-dashed border-slate-300 bg-white/35 p-3 dark:border-slate-700 dark:bg-slate-950/25"><p className="text-sm font-black text-slate-400">{t('monthlyPayment')}</p><p className="mt-2 text-[10px] font-semibold text-slate-400">{t('monthlyPaymentNotAvailable')}</p></div>}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/70 pt-3 text-xs dark:border-slate-700"><span className="text-slate-500 dark:text-slate-400">{t('selectedOption')}</span><strong className="text-[#17624e] dark:text-[#a5f1dc]">{paymentPlanLabel}{payment.paymentPlan === 'MONTHLY' && payment.billingPeriod ? ` · ${payment.billingPeriod}` : ''}</strong></div>
      </section>
      <div className="payment-status-card"><span className="payment-status-icon">{status === 'PAID' ? '✓' : status === 'PENDING' ? '⏱' : '!'}</span><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{statusText}</p></div>
      <p className="payment-invoice text-xs text-slate-400">{t('invoice') || 'Invoice'}: {payment.invoiceNumber}</p>
      <PaymentReceipt payment={payment} item={payment.courseName || t('course')} t={t} language={language} />
      {error && <div role="alert" aria-live="polite" className={`payment-error-card rounded-xl p-4 text-left text-sm leading-6 ${supportAlert ? 'border border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'}`}><p className="font-bold">{supportAlert ? t('bakongUnavailable') : error}</p>{supportAlert && <><p className="mt-1">{t('contactAdminSupport')}</p><a href="https://t.me/RoeunVathana" target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg bg-[#229ed9] px-3 py-2 text-xs font-extrabold text-white transition hover:bg-[#168dcc]">{t('contactAdminSupportButton')} ↗</a></>}</div>}
      </div></div>
      <div className="payment-modal-actions">{status === 'PENDING' && onRefresh && <button type="button" onClick={onRefresh} disabled={checkingPayment || planChanging} className="payment-secondary-button disabled:cursor-wait disabled:opacity-60">{t('refreshPayment') || 'New QR code'}</button>}{status === 'PENDING' && <button type="button" onClick={onCheck} disabled={checkingPayment || planChanging} aria-busy={checkingPayment} className="payment-secondary-button disabled:cursor-wait disabled:opacity-60">{checkingPayment ? t('verifyingPayment') : t('checkPayment')}</button>}<button type="button" onClick={onClose} disabled={checkingPayment} className="payment-primary-button disabled:cursor-not-allowed disabled:opacity-60">{t('closePayment')}</button></div>
    </div>
  </Modal>;
}
