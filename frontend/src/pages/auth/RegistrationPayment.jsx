import PaymentQrFrame from '../../components/PaymentQrFrame';
import PaymentReceipt from '../../components/PaymentReceipt';
import { useLanguage } from '../../context/LanguageContext';

export default function RegistrationPayment({ payment, qrImage, error, onCheck, onLogin, language }) {
  const { t } = useLanguage();
  const khmer = language === 'km';
  const copy = khmer
    ? { title: 'ការបង់ប្រាក់ចុះឈ្មោះ', description: 'ស្កេន KHQR ដោយប្រើ Bakong ឬ ABA ដើម្បីបញ្ចប់ការចុះឈ្មោះ។', invoice: 'វិក្កយបត្រ', pending: 'កំពុងរង់ចាំការបញ្ជាក់ការបង់ប្រាក់...', paid: 'ការបង់ប្រាក់បានជោគជ័យ', expired: 'QR code បានផុតកំណត់', failed: 'ការបង់ប្រាក់មិនបានជោគជ័យ', check: 'ពិនិត្យស្ថានភាព', login: 'ចូលគណនី', note: 'KHQR មួយអាចបង់តាម Bakong ឬ ABA បាន។', amount: 'ចំនួនទឹកប្រាក់ត្រូវបង់' }
    : { title: 'Registration payment', description: 'Scan the KHQR with Bakong or ABA to finish creating your account.', invoice: 'Invoice', pending: 'Waiting for payment confirmation...', paid: 'Payment successful', expired: 'QR code expired', failed: 'Payment failed', check: 'Check payment status', login: 'Go to sign in', note: 'One KHQR works with Bakong and ABA.', amount: 'Amount due' };
  const statusText = payment.status === 'PAID' ? copy.paid : payment.status === 'EXPIRED' ? copy.expired : payment.status === 'FAILED' ? copy.failed : copy.pending;
  const statusClass = payment.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200' : payment.status === 'FAILED' || payment.status === 'EXPIRED' ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200';
  const supportAlert = Boolean(error) && /bakong|daily request limit|request limit|not configured|temporarily unavailable|verification/i.test(String(error));

  return <div className="auth-background flex min-h-screen items-center justify-center p-4 sm:p-8"><div className="payment-registration-card w-full max-w-xl rounded-[2rem] border border-white/80 bg-white p-5 text-center shadow-2xl shadow-slate-300/40 sm:p-8 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#174c92] to-[#2a78c7] text-2xl text-white shadow-lg shadow-[#174c92]/20">⌁</div>
    <h1 className="text-3xl font-extrabold text-ink dark:text-white">{copy.title}</h1>
    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{copy.description}</p>
    <div className="payment-sheet-network mx-auto mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold"><span className="payment-aba-mark">ABA</span><span className="text-slate-400">+</span><span className="text-[#174c92] dark:text-[#b9d7ff]">Bakong</span><span className="rounded bg-[#174c92] px-2 py-0.5 text-[10px] tracking-[.12em] text-white">KHQR</span></div>
    {qrImage && payment.status === 'PENDING' && <div className="mt-6"><PaymentQrFrame qrImage={qrImage} alt="KHQR registration payment" scanLabel={khmer ? 'ស្កេនដោយ ABA ឬ Bakong' : 'Scan with ABA or Bakong'} /></div>}
    <div className="payment-amount-card mx-auto mt-5 flex max-w-sm items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500 dark:text-slate-400">{copy.amount}</p><p className="mt-1 text-2xl font-extrabold text-[#174c92] dark:text-[#b9d7ff]">{payment.amount} {payment.currency}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>{payment.status}</span></div>
    <p className="mt-5 text-sm font-semibold text-slate-700 dark:text-slate-200">{statusText}</p>
    <p className="mt-2 text-xs text-slate-400">{copy.invoice}: {payment.invoiceNumber}</p>
    <PaymentReceipt payment={payment} item={copy.title} t={t} language={language} registration />
    <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.note}</p>
    {error && <div role="alert" aria-live="polite" className={`mt-5 rounded-xl p-4 text-left text-sm leading-6 ${supportAlert ? 'border border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'}`}><p className="font-bold">{supportAlert ? (khmer ? 'ការបង់ប្រាក់តាម Bakong មិនអាចប្រើបាន ឬបានដល់កំណត់ប្រចាំថ្ងៃ។' : 'Bakong payment is temporarily unavailable or has reached its daily limit.') : error}</p>{supportAlert && <><p className="mt-1">{khmer ? 'សូមទាក់ទងអ្នកគ្រប់គ្រង ដើម្បីទទួលជំនួយ មុនពេលព្យាយាមម្ដងទៀត។' : 'Please contact admin support before trying again.'}</p><a href="https://t.me/RoeunVathana" target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg bg-[#229ed9] px-3 py-2 text-xs font-extrabold text-white transition hover:bg-[#168dcc]">{khmer ? 'ទាក់ទងជំនួយអ្នកគ្រប់គ្រង' : 'Contact admin support'} ↗</a></>}</div>}
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">{payment.status === 'PENDING' && <button type="button" onClick={onCheck} disabled={payment.verification === 'rate_limited'} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">{copy.check}</button>}{payment.status === 'PAID' && <button type="button" onClick={onLogin} className="rounded-xl bg-[#174c92] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#174c92]/20 transition hover:-translate-y-0.5 hover:bg-[#123b73]">{copy.login}</button>}</div>
  </div></div>;
}
