import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { unwrap } from '../../api/axios';
import { useLanguage } from '../../context/LanguageContext';
import ThemeSwitch from '../../components/ThemeSwitch';
import Loading from '../../components/Loading';
import PasswordInput from '../../components/PasswordInput';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
const apiMessage = (error, fallback) => {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.filter(Boolean).join(' ');
  return typeof message === 'string' && message.trim() ? message : fallback;
};

export default function ForgotPassword() {
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const sendOtp = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = unwrap(await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() }));
      setStep('reset');
      setNotice(result.message || t('otpSent'));
    } catch (requestError) {
      setError(apiMessage(requestError, t('couldNotSendOtp')));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!passwordPattern.test(password) || password.length < 10) {
      setError(t('passwordRequirements'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { email: email.trim().toLowerCase(), otp: otp.trim(), password });
      navigate('/login', { replace: true, state: { message: t('passwordResetSuccess') } });
    } catch (resetError) {
      setError(apiMessage(resetError, t('couldNotResetPassword')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {busy && <Loading fullScreen label={step === 'request' ? t('sendingOtp') : t('resettingPassword')} />}
      <main className="auth-background flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8">
        <section className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 shadow-2xl shadow-slate-300/40 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
          <div className="h-2 bg-gradient-to-r from-coral via-[#f6a77f] to-mint" />
          <div className="p-6 sm:p-10">
            <div className="flex items-start justify-between gap-4">
              <Link to="/login" className="text-2xl font-extrabold tracking-tight text-navy dark:text-white">Campus<span className="text-coral">Flow</span></Link>
              <div className="flex items-center gap-2">
                <ThemeSwitch />
                <button type="button" onClick={() => setLanguage(language === 'en' ? 'km' : 'en')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-navy dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">{language === 'en' ? 'ខ្មែរ' : 'English'}</button>
              </div>
            </div>

            <div className="mt-10">
              <p className="mb-3 text-xs font-bold uppercase tracking-[.24em] text-coral">{t('secureSignIn')}</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-ink dark:text-white sm:text-4xl">{t('forgotAdminPassword')}</h1>
              <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">{t('forgotAdminDescription')}</p>
            </div>

            {notice && <div role="status" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">{notice}</div>}
            {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">{error}</div>}

            {step === 'request' ? (
              <form onSubmit={sendOtp} className="mt-8 space-y-5">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">{t('adminEmail')}
                  <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input mt-2 h-14" placeholder="admin@school.com" autoComplete="email" />
                </label>
                <button disabled={busy} className="flex h-14 w-full items-center justify-center rounded-2xl bg-navy px-4 font-bold text-white shadow-lg shadow-navy/20 transition hover:-translate-y-0.5 hover:bg-[#1b3b5d] disabled:cursor-not-allowed disabled:opacity-60">{t('sendOtp')}</button>
              </form>
            ) : (
              <form onSubmit={resetPassword} className="mt-8 space-y-5">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">{t('otpLabel')}
                  <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} className="input mt-2 h-14 text-center text-xl tracking-[.35em]" placeholder="000000" autoComplete="one-time-code" />
                </label>
                <p className="-mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{t('otpExpiresHint')}</p>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">{t('newPassword')}
                  <PasswordInput required value={password} onChange={(event) => setPassword(event.target.value)} className="input mt-2 h-14" autoComplete="new-password" />
                </label>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">{t('confirmPassword')}
                  <PasswordInput required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="input mt-2 h-14" autoComplete="new-password" />
                </label>
                <p className="-mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{t('passwordRequirements')}</p>
                <button disabled={busy} className="flex h-14 w-full items-center justify-center rounded-2xl bg-navy px-4 font-bold text-white shadow-lg shadow-navy/20 transition hover:-translate-y-0.5 hover:bg-[#1b3b5d] disabled:cursor-not-allowed disabled:opacity-60">{t('resetPassword')}</button>
                <button type="button" onClick={() => { setStep('request'); setOtp(''); setNotice(''); setError(''); }} className="w-full text-sm font-bold text-navy hover:underline dark:text-mint">{t('sendOtp')}</button>
              </form>
            )}

            <Link to="/login" className="mt-7 block text-center text-sm font-bold text-slate-500 hover:text-navy hover:underline dark:text-slate-400 dark:hover:text-mint">{t('backToLogin')}</Link>
          </div>
        </section>
      </main>
    </>
  );
}
