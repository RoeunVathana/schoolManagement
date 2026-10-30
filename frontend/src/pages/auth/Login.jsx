import { useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../hooks/useAuth';
import { roleHome } from '../../utils/roles';
import { useLanguage } from '../../context/LanguageContext';
import ThemeSwitch from '../../components/ThemeSwitch';
import Loading from '../../components/Loading';
import PasswordInput from '../../components/PasswordInput';
import { firebaseAuth } from '../../config/firebase';

const roleOptions = {
  ADMIN: { color: 'bg-coral', path: '/login/admin', placeholder: 'mouychheak3227@gmail.com', icon: 'shield' },
  TEACHER: { color: 'bg-[#7c8cf8]', path: '/login/teacher', placeholder: 'teacher@example.com', icon: 'teacher' },
  STUDENT: { color: 'bg-emerald-500', path: '/login/student', placeholder: 'student@example.com', icon: 'student' },
  CUSTOMER: { color: 'bg-sky-500', path: '/login/customer', placeholder: 'customer@example.com', icon: 'student' },
};

const roleFromPath = { '/login/admin': 'ADMIN', '/login/teacher': 'TEACHER', '/login/student': 'STUDENT', '/login/customer': 'CUSTOMER' };
const transitionDelay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
const apiMessage = (error, fallback) => {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.filter(Boolean).join(' ');
  if (typeof message === 'string' && message.trim()) return message;
  return typeof error?.message === 'string' && error.message.trim() ? error.message : fallback;
};

export default function Login() {
  const { register, handleSubmit, reset, formState: { errors: formErrors } } = useForm();
  const { login, loginWithGoogle, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedRole = roleFromPath[location.pathname] || 'STUDENT';
  const selected = roleOptions[selectedRole];
  const roleLabels = { ADMIN: t('admin'), TEACHER: t('teacher'), STUDENT: t('student'), CUSTOMER: 'Customer' };
  const roleDescriptions = { ADMIN: t('adminLoginDescription'), TEACHER: t('teacherLoginDescription'), STUDENT: t('studentLoginDescription'), CUSTOMER: 'Connect with your learning community and manage your profile.' };
  const selectedLabel = selectedRole === 'ADMIN' ? t('administrator') : roleLabels[selectedRole];
  const [notice, setNotice] = useState(location.state?.message || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    reset({ email: '', password: '' });
    setNotice(location.state?.message || '');
    setError('');
  }, [location.pathname, location.state, reset]);

  const submit = async (data) => {
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const user = await login({ ...data, email: data.email.trim().toLowerCase(), role: selectedRole });
      if (user.role !== selectedRole) {
        await logout();
        setError(t('wrongRole').replace('{role}', selectedLabel));
        return;
      }
      setRedirecting(true);
      await transitionDelay(650);
      navigate(location.state?.from || roleHome(user.role), { replace: true });
    } catch (e) {
      setError(apiMessage(e, t('unableToSignIn')));
    } finally {
      setBusy(false);
    }
  };

  const submitGoogle = async () => {
    setGoogleBusy(true);
    setNotice('');
    setError('');
    try {
      const result = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      const idToken = await result.user.getIdToken(true);
      const user = await loginWithGoogle({ idToken, role: selectedRole });
      setRedirecting(true);
      await transitionDelay(650);
      navigate(location.state?.from || roleHome(user.role), { replace: true });
    } catch (e) {
      await signOut(firebaseAuth).catch(() => undefined);
      const code = e.code || '';
      const invalidApiKey = code === 'auth/invalid-api-key' || code.startsWith('auth/api-key-not-valid');
      const firebaseMessage = code === 'auth/popup-closed-by-user'
        ? t('googleSignInCancelled')
        : code === 'auth/operation-not-allowed'
          ? t('googleProviderDisabled')
          : code === 'auth/unauthorized-domain'
            ? t('googleDomainNotAuthorized')
            : code === 'auth/popup-blocked'
              ? t('googlePopupBlocked')
                : invalidApiKey
                  ? t('firebaseApiKeyInvalid')
                  : code === 'auth/network-request-failed'
                    ? 'Firebase could not connect to Google. Check your internet connection and Firebase configuration.'
              : apiMessage(e, t('googleSignInFailed'));
      setError(firebaseMessage);
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <>
      {redirecting && <Loading fullScreen label={t('redirecting')} />}
      <div className="auth-background min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="auth-layout mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 shadow-2xl shadow-slate-300/40 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none lg:grid-cols-[1.12fr_.88fr]">
        <aside className="auth-hero-panel relative hidden overflow-hidden bg-gradient-to-br from-navy via-[#173957] to-[#246574] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-mint/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-coral/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-6">
            <Link to="/login" className="text-2xl font-extrabold tracking-tight">Campus<span className="text-mint">Flow</span></Link>
            <div className="flex items-center gap-2">
              <ThemeSwitch />
              <LanguageSwitch language={language} setLanguage={setLanguage} />
            </div>
          </div>

          <div className="auth-hero-content relative max-w-xl py-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-mint/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.2em] text-mint">
              <span className="h-2 w-2 rounded-full bg-mint shadow-[0_0_12px_#8de4ca]" />
              {t('studentManagementSystem')}
            </div>
            <h1 className="max-w-2xl text-5xl font-extrabold leading-[1.08] tracking-tight xl:text-6xl">{t('learningHuman')}</h1>
            <p className="mt-7 max-w-lg text-base leading-8 text-white/70">{t('loginHeroDescription')}</p>
            <div className="mt-10 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
              {[[t('students'), '01'], [t('teachers'), '02'], [t('courses'), '03']].map(([label, number]) => <div key={number} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><p className="text-2xl font-extrabold text-mint">{number}</p><p className="mt-2 text-xs font-semibold text-white/65">{label}</p></div>)}
            </div>
          </div>

          <div className="auth-hero-footer relative flex items-center justify-between gap-4 text-xs text-white/45"><span>PostgreSQL · NestJS · React</span><span>{language === 'km' ? 'សុវត្ថិភាព និងងាយស្រួលប្រើ' : 'Secure and simple to use'}</span></div>
        </aside>

        <main className="auth-form-panel flex min-w-0 items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-lg">
            <div className="mb-8 flex items-start justify-between gap-4 lg:hidden">
              <Link to="/login" className="text-2xl font-extrabold tracking-tight text-navy dark:text-white">Campus<span className="text-coral">Flow</span></Link>
              <div className="flex items-center gap-2">
                <ThemeSwitch />
                <LanguageSwitch language={language} setLanguage={setLanguage} />
              </div>
            </div>

            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[.24em] text-coral">{t('secureSignIn')}</p>
                <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{selectedLabel} {t('login')}</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">{roleDescriptions[selectedRole]}</p>
              </div>
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${selected.color}`}><RoleIcon type={selected.icon} /></span>
            </div>

            <div className="auth-role-tabs grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-1.5 dark:bg-slate-800 sm:grid-cols-4">
              {Object.entries(roleOptions).map(([key, role]) => <Link key={key} to={role.path} className={`flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-bold transition ${selectedRole === key ? `${role.color} text-white shadow-md` : 'text-slate-500 hover:bg-white hover:text-navy dark:hover:bg-slate-700 dark:hover:text-white'}`}><RoleIcon type={role.icon} small />{roleLabels[key]}</Link>)}
            </div>

            {notice && <div role="status" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">{notice}</div>}
            {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"><div className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 font-bold dark:bg-red-900/60">!</span><div className="min-w-0"><p className="font-bold">{t('loginFailed')}</p><p className="mt-1">{error}</p><p className="mt-2 font-semibold">{t('loginCheckList')}</p><ul className="mt-1 list-disc space-y-0.5 pl-5"><li>{t('loginCheckEmail')}</li><li>{t('loginCheckPassword')}</li><li>{t('loginCheckRole')}</li></ul></div></div></div>}

            <form onSubmit={handleSubmit(submit)} className="mt-8 space-y-5">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">{selectedLabel} {t('emailLabel')}<input {...register('email', { required: t('enterEmail') })} type="email" autoComplete="email" aria-invalid={!!formErrors.email} className={`input mt-2 h-14 ${formErrors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : ''}`} placeholder={selected.placeholder} />{formErrors.email && <span className="mt-1 block text-xs font-semibold text-red-600 dark:text-red-300">{formErrors.email.message}</span>}</label>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">{t('passwordLabel')}<PasswordInput {...register('password', { required: t('enterPassword') })} autoComplete="current-password" aria-invalid={!!formErrors.password} className={`input mt-2 h-14 ${formErrors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : ''}`} placeholder={t('enterPassword')} />{formErrors.password && <span className="mt-1 block text-xs font-semibold text-red-600 dark:text-red-300">{formErrors.password.message}</span>}</label>
              <button disabled={busy} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-navy px-4 font-bold text-white shadow-lg shadow-navy/20 transition hover:-translate-y-0.5 hover:bg-[#1b3b5d] disabled:cursor-not-allowed disabled:opacity-60">
                {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {busy ? t('signingIn') : `${t('signInAs')} ${roleLabels[selectedRole]}`}
              </button>
              {selectedRole !== 'ADMIN' && <>
                <div className="relative py-1 text-center"><span className="relative z-10 bg-white px-3 text-xs font-semibold text-slate-400 dark:bg-slate-900">{t('orContinueWith')}</span><span className="absolute inset-x-0 top-1/2 border-t border-slate-200 dark:border-slate-700" /></div>
                <button type="button" disabled={googleBusy || busy} onClick={submitGoogle} className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-500">
                  {googleBusy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-navy dark:border-slate-500 dark:border-t-mint" /> : <GoogleIcon />}
                  {googleBusy ? t('googleSigningIn') : t('continueWithGoogle')}
                </button>
              </>}
            </form>

            {selectedRole === 'ADMIN' ? <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center text-xs leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-800"><p>{t('adminManagedAccount')}</p><Link to="/forgot-password" className="mt-2 inline-block font-bold text-navy hover:underline dark:text-mint">{t('forgotPasswordLink')}</Link></div> : <p className="mt-7 text-center text-sm text-slate-500">{t('needAccount').replace('{role}', roleLabels[selectedRole].toLowerCase())} <Link to="/register" className="font-bold text-navy hover:underline dark:text-mint">{t('registerHere')}</Link></p>}
          </div>
        </main>
      </div>
      </div>
    </>
  );
}

function LanguageSwitch({ language, setLanguage }) {
  return <button type="button" onClick={() => setLanguage(language === 'en' ? 'km' : 'en')} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-navy hover:text-navy dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-mint dark:hover:text-mint"><span className="text-sm">{language === 'en' ? 'ខ្មែរ' : 'EN'}</span><span>{language === 'en' ? 'Khmer' : 'English'}</span></button>;
}

function RoleIcon({ type, small = false }) {
  const size = small ? 14 : 21;
  if (type === 'shield') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6l-7-3Z" /><path d="m9.5 12 1.7 1.7 3.5-3.5" /></svg>;
  if (type === 'teacher') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m3 9 9-5 9 5-9 5-9-5Z" /><path d="M7 11.2V16c2.8 2.5 7.2 2.5 10 0v-4.8M21 9v6" /></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="8" r="3" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>;
}

function GoogleIcon() {
  return <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm dark:border-slate-600" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" role="img"><path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z" /><path fill="#34A853" d="M12 21.8c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.29v2.53A9.75 9.75 0 0 0 12 21.8Z" /><path fill="#FBBC05" d="M6.54 13.88a5.86 5.86 0 0 1 0-3.76V7.59H3.29a9.8 9.8 0 0 0 0 8.82l3.25-2.53Z" /><path fill="#EA4335" d="M12 6.09c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.84 3.05 14.63 2.2 12 2.2a9.75 9.75 0 0 0-8.71 5.39l3.25 2.53C7.31 7.81 9.46 6.09 12 6.09Z" /></svg></span>;
}
