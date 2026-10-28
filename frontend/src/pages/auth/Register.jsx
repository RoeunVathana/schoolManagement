import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import QRCode from 'qrcode';
import api, { unwrap } from '../../api/axios';
import { useLanguage } from '../../context/LanguageContext';

export default function Register() {
  const { register, handleSubmit } = useForm({ defaultValues: { role: 'STUDENT', language: localStorage.getItem('sms_language') || 'en' } });
  const languageField = register('language');
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [payment, setPayment] = useState(null);
  const [qrImage, setQrImage] = useState('');

  useEffect(() => {
    if (!payment?.qrString) return undefined;
    QRCode.toDataURL(payment.qrString, { width: 300, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#10243f', light: '#ffffff' } }).then(setQrImage).catch(() => setError('Could not render the KHQR image.'));
    if (payment.status !== 'PENDING') return undefined;
    const timer = window.setInterval(async () => {
      try {
        const latest = unwrap(await api.post(`/payments/registration/${payment.publicToken}/check`));
        setPayment((current) => ({ ...current, ...latest }));
      } catch (e) {
        setError(e.response?.data?.message || 'Could not check payment status.');
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [payment?.publicToken, payment?.qrString, payment?.status]);

  const submit = async (data) => {
    setBusy(true);
    setError('');
    try {
      const payload = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'profileImage') {
          if (value?.[0]) payload.append('profileImage', value[0]);
        } else if (value !== undefined && value !== null) {
          payload.append(key, value);
        }
      });
      const result = unwrap(await api.post('/auth/register', payload, { headers: { 'Content-Type': 'multipart/form-data' } }));
      if (result.paymentRequired && result.payment) { setPayment(result.payment); return; }
      navigate('/login', { state: { message: 'Account created. You can sign in now.' } });
    } catch (e) {
      setError(e.response?.data?.message || 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  };

  const checkPayment = async () => {
    try {
      const latest = unwrap(await api.post(`/payments/registration/${payment.publicToken}/check`));
      setPayment((current) => ({ ...current, ...latest }));
    } catch (e) {
      setError(e.response?.data?.message || 'Could not check payment status.');
    }
  };

  if (payment) return <RegistrationPayment payment={payment} qrImage={qrImage} error={error} onCheck={checkPayment} onLogin={() => navigate('/login')} language={language} />;

  return <div className="auth-background flex min-h-screen items-center justify-center p-6"><div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/70 dark:bg-slate-800 dark:shadow-none"><div className="mb-8 flex items-start justify-between gap-4"><div><Link to="/login" className="text-2xl font-bold text-navy dark:text-white">Campus<span className="text-coral">Flow</span></Link><p className="mt-6 text-xs font-bold uppercase tracking-[.22em] text-coral">Join your campus</p><h1 className="mt-2 text-3xl font-bold text-ink">Create an account</h1><p className="mt-2 text-sm text-slate-500">Students and teachers can register here.</p></div><button type="button" onClick={() => setLanguage(language === 'en' ? 'km' : 'en')} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">{language === 'en' ? 'Khmer' : 'English'}</button></div>{error && <div className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}<form onSubmit={handleSubmit(submit)} className="space-y-4"><label className="block text-sm font-semibold text-slate-700">Full name<input {...register('fullName', { required: true })} className="input mt-2" placeholder="Your full name" /></label><label className="block text-sm font-semibold text-slate-700">Email<input {...register('email', { required: true })} type="email" className="input mt-2" placeholder="you@school.com" /></label><label className="block text-sm font-semibold text-slate-700">Account type<select {...register('role')} className="input mt-2"><option value="STUDENT">Student</option><option value="TEACHER">Teacher</option></select></label><label className="block text-sm font-semibold text-slate-700">Language<select {...languageField} onChange={(e) => { languageField.onChange(e); setLanguage(e.target.value); }} className="input mt-2"><option value="en">English</option><option value="km">Khmer</option></select></label><label className="block text-sm font-semibold text-slate-700">Specialization <span className="font-normal text-slate-400">(teachers only)</span><input {...register('specialization')} className="input mt-2" placeholder="e.g. Mathematics" /></label><label className="block text-sm font-semibold text-slate-700">Profile image <span className="font-normal text-slate-400">(optional, PNG/JPG/WEBP up to 5 MB)</span><input {...register('profileImage')} type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" className="input mt-2 p-2" /></label><label className="block text-sm font-semibold text-slate-700">Password<input {...register('password', { required: true, minLength: 8 })} type="password" className="input mt-2" placeholder="At least 8 characters" /></label><button disabled={busy} className="w-full rounded-xl bg-navy py-3.5 font-semibold text-white disabled:opacity-60">{busy ? 'Creating account...' : 'Create account'}</button></form><p className="mt-6 text-center text-sm text-slate-500">Already registered? <Link to="/login" className="font-semibold text-navy dark:text-mint">Sign in</Link></p></div></div>;
}

function RegistrationPayment({ payment, qrImage, error, onCheck, onLogin, language }) {
  const khmer = language === 'km';
  const copy = khmer ? { title: 'បង់ប្រាក់ចុះឈ្មោះ', description: 'ស្កេន KHQR ដោយប្រើ Bakong ឬ ABA ដើម្បីបញ្ចប់ការចុះឈ្មោះ។', invoice: 'លេខវិក្កយបត្រ', pending: 'កំពុងរង់ចាំការបញ្ជាក់...', paid: 'ការបង់ប្រាក់បានជោគជ័យ', expired: 'កូដ QR បានផុតកំណត់', failed: 'ការបង់ប្រាក់មិនបានជោគជ័យ', check: 'ពិនិត្យស្ថានភាព', login: 'ចូលប្រើគណនី', note: 'KHQR មួយអាចបង់តាម Bakong ឬ ABA។' } : { title: 'Registration payment', description: 'Scan the KHQR with Bakong or ABA to finish creating your account.', invoice: 'Invoice', pending: 'Waiting for payment confirmation...', paid: 'Payment successful', expired: 'QR code expired', failed: 'Payment failed', check: 'Check payment status', login: 'Go to sign in', note: 'One KHQR works with Bakong and ABA.' };
  const statusText = payment.status === 'PAID' ? copy.paid : payment.status === 'EXPIRED' ? copy.expired : payment.status === 'FAILED' ? copy.failed : copy.pending;
  return <div className="auth-background flex min-h-screen items-center justify-center p-6"><div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-200/70 dark:bg-slate-800 dark:shadow-none"><div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-mint text-2xl">៛</div><h1 className="text-3xl font-bold text-ink">{copy.title}</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">{copy.description}</p><div className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"><span>Bakong</span><span className="text-slate-400">/</span><span>ABA</span><span className="ml-1 rounded bg-navy px-2 py-0.5 text-xs text-white">KHQR</span></div>{qrImage && payment.status === 'PENDING' && <div className="mx-auto mt-6 w-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><img src={qrImage} alt="KHQR registration payment" className="h-64 w-64" /></div>}<p className="mt-5 text-sm font-semibold text-slate-700">{statusText}</p><p className="mt-2 text-2xl font-bold text-navy">{payment.amount} {payment.currency}</p><p className="mt-2 text-xs text-slate-400">{copy.invoice}: {payment.invoiceNumber}</p><p className="mt-4 text-xs leading-5 text-slate-500">{copy.note}</p>{error && <div className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">{error}</div>}<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">{payment.status === 'PENDING' && <button onClick={onCheck} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">{copy.check}</button>}{payment.status === 'PAID' && <button onClick={onLogin} className="rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white">{copy.login}</button>}</div></div></div>;
}
