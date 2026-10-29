import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import QRCode from 'qrcode';
import api, { unwrap } from '../../api/axios';
import { useLanguage } from '../../context/LanguageContext';
import ThemeSwitch from '../../components/ThemeSwitch';
import Loading from '../../components/Loading';
import ImageCropper from '../../components/ImageCropper';
import RegistrationPayment from './RegistrationPayment';
import { isImageTooLarge } from '../../utils/fileValidation';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
const transitionDelay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const copyByLanguage = {
  en: {
    join: 'Join your campus',
    create: 'Create your account',
    subtitle: 'Set up your student or teacher profile to access your learning workspace.',
    start: 'Start your journey',
    sideTitle: 'One simple start for your whole campus.',
    sideDescription: 'Create your learning account, complete your profile, and join your school workspace in minutes.',
    steps: [['01', 'Account details', 'Tell us who you are.'], ['02', 'Profile setup', 'Add the details your campus needs.'], ['03', 'Ready to learn', 'Sign in and get started.']],
    secure: 'Secure access for students and teachers.',
    chooseType: 'Choose your account type',
    chooseDescription: 'You can only register as a student or teacher.',
    basic: 'Basic information',
    basicDescription: 'Use an email address you can access.',
    profileSecurity: 'Profile and security',
    profileDescription: 'Add a photo and protect your new account.',
    fullName: 'Full name',
    fullNamePlaceholder: 'e.g. Sopheak Chan',
    email: 'Email address',
    emailPlaceholder: 'you@school.com',
    language: 'Preferred language',
    student: 'Student',
    studentDescription: 'Learn, submit work and view results.',
    teacher: 'Teacher',
    teacherDescription: 'Teach classes and manage learning records.',
    specialization: 'Specialization',
    teacherOnly: 'Teacher only',
    specializationPlaceholder: 'e.g. Mathematics',
    optional: 'optional',
    upload: 'Upload a profile photo',
    imageHint: 'PNG, JPG or WEBP · maximum 50 MB',
    imageTooLarge: 'Choose an image smaller than 50 MB.',
    password: 'Password',
    passwordPlaceholder: 'Create a strong password',
    characters: '10+ characters',
    uppercase: 'Uppercase',
    lowercase: 'Lowercase',
    number: 'Number',
    symbol: 'Symbol',
    createButton: 'Create account',
    creatingButton: 'Creating your account...',
    already: 'Already registered?',
    signIn: 'Sign in',
    step: 'Step',
    requiredName: 'Please enter your full name.',
    requiredEmail: 'Please enter your email.',
    invalidEmail: 'Enter a valid email address.',
    requiredPassword: 'Please create a password.',
    minPassword: 'Use at least 10 characters.',
    strongPassword: 'Include uppercase, lowercase, number and special character.',
    accountCreated: 'Account created. You can sign in now.',
    renderQrError: 'Could not render the KHQR image.',
    checkPaymentError: 'Could not check payment status.',
    createError: 'Could not create your account.',
  },
  km: {
    join: 'ចូលរួមជាមួយសាលារបស់អ្នក',
    create: 'បង្កើតគណនី',
    subtitle: 'រៀបចំប្រវត្តិរូបសិស្ស ឬគ្រូ ដើម្បីចូលប្រើប្រព័ន្ធសិក្សារបស់អ្នក។',
    start: 'ចាប់ផ្តើមដំណើររបស់អ្នក',
    sideTitle: 'ចាប់ផ្តើមសម្រាប់សាលារបស់អ្នកយ៉ាងងាយស្រួល។',
    sideDescription: 'បង្កើតគណនីសិក្សា បំពេញប្រវត្តិរូប និងចូលរួមប្រព័ន្ធសាលារបស់អ្នកក្នុងរយៈពេលប៉ុន្មាននាទី។',
    steps: [['០១', 'ព័ត៌មានគណនី', 'ប្រាប់យើងអំពីអ្នក។'], ['០២', 'រៀបចំប្រវត្តិរូប', 'បន្ថែមព័ត៌មានដែលសាលាត្រូវការ។'], ['០៣', 'ត្រៀមខ្លួនសិក្សា', 'ចូលគណនី និងចាប់ផ្តើម។']],
    secure: 'សុវត្ថិភាពសម្រាប់សិស្ស និងគ្រូ។',
    chooseType: 'ជ្រើសរើសប្រភេទគណនី',
    chooseDescription: 'អ្នកអាចចុះឈ្មោះជាសិស្ស ឬគ្រូបង្រៀនប៉ុណ្ណោះ។',
    basic: 'ព័ត៌មានមូលដ្ឋាន',
    basicDescription: 'ប្រើអាសយដ្ឋានអ៊ីមែលដែលអ្នកអាចចូលប្រើបាន។',
    profileSecurity: 'ប្រវត្តិរូប និងសុវត្ថិភាព',
    profileDescription: 'បន្ថែមរូបថត និងការពារគណនីថ្មីរបស់អ្នក។',
    fullName: 'ឈ្មោះពេញ',
    fullNamePlaceholder: 'ឧ. សុភ័ក្ត្រ ចាន់',
    email: 'អាសយដ្ឋានអ៊ីមែល',
    emailPlaceholder: 'you@school.com',
    language: 'ភាសាដែលចូលចិត្ត',
    student: 'សិស្ស',
    studentDescription: 'រៀន ដាក់កិច្ចការ និងមើលលទ្ធផល។',
    teacher: 'គ្រូបង្រៀន',
    teacherDescription: 'បង្រៀនថ្នាក់ និងគ្រប់គ្រងកំណត់ត្រាសិក្សា។',
    specialization: 'ជំនាញ',
    teacherOnly: 'គ្រូបង្រៀនប៉ុណ្ណោះ',
    specializationPlaceholder: 'ឧ. គណិតវិទ្យា',
    optional: 'ជាជម្រើស',
    upload: 'បញ្ចូលរូបភាពប្រវត្តិរូប',
    imageHint: 'PNG, JPG ឬ WEBP · ទំហំអតិបរមា ៥០ MB',
    imageTooLarge: 'សូមជ្រើសរើសរូបភាពដែលមានទំហំតិចជាង ៥០ MB។',
    password: 'ពាក្យសម្ងាត់',
    passwordPlaceholder: 'បង្កើតពាក្យសម្ងាត់រឹងមាំ',
    characters: 'យ៉ាងតិច ១០ តួអក្សរ',
    uppercase: 'អក្សរធំ',
    lowercase: 'អក្សរតូច',
    number: 'លេខ',
    symbol: 'និមិត្តសញ្ញា',
    createButton: 'បង្កើតគណនី',
    creatingButton: 'កំពុងបង្កើតគណនី...',
    already: 'មានគណនីរួចហើយ?',
    signIn: 'ចូលប្រើ',
    step: 'ជំហាន',
    requiredName: 'សូមបញ្ចូលឈ្មោះពេញរបស់អ្នក។',
    requiredEmail: 'សូមបញ្ចូលអ៊ីមែលរបស់អ្នក។',
    invalidEmail: 'សូមបញ្ចូលអាសយដ្ឋានអ៊ីមែលត្រឹមត្រូវ។',
    requiredPassword: 'សូមបង្កើតពាក្យសម្ងាត់។',
    minPassword: 'សូមប្រើយ៉ាងតិច ១០ តួអក្សរ។',
    strongPassword: 'ត្រូវមានអក្សរធំ អក្សរតូច លេខ និងនិមិត្តសញ្ញា។',
    accountCreated: 'គណនីត្រូវបានបង្កើត។ អ្នកអាចចូលប្រើបានឥឡូវនេះ។',
    renderQrError: 'មិនអាចបង្ហាញរូបភាព KHQR បានទេ។',
    checkPaymentError: 'មិនអាចពិនិត្យស្ថានភាពការបង់ប្រាក់បានទេ។',
    createError: 'មិនអាចបង្កើតគណនីបានទេ។',
  },
};

const defaultValues = {
  fullName: '',
  email: '',
  role: 'STUDENT',
  language: localStorage.getItem('sms_language') || 'en',
  specialization: '',
  password: '',
};

export default function Register() {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues });
  const languageField = register('language');
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const copy = copyByLanguage[language] || copyByLanguage.en;
  const profileImageField = register('profileImage');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [payment, setPayment] = useState(null);
  const [qrImage, setQrImage] = useState('');
  const [cropFile, setCropFile] = useState(null);
  const [croppedProfileImage, setCroppedProfileImage] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  const selectedRole = watch('role', 'STUDENT');
  const password = watch('password', '');
  const passwordChecks = useMemo(() => ({
    length: password.length >= 10,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z\d]/.test(password),
  }), [password]);

  useEffect(() => {
    if (!payment?.qrString || payment.status !== 'PENDING' || payment.verification === 'rate_limited') return undefined;

    QRCode.toDataURL(payment.qrString, {
      width: 800,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: { dark: '#10243f', light: '#ffffff' },
    })
      .then(setQrImage)
      .catch(() => setError(copy.renderQrError));

    const timer = window.setInterval(async () => {
      try {
        const latest = unwrap(await api.post(`/payments/registration/${payment.publicToken}/check`));
        setPayment((current) => ({ ...current, ...latest }));
        if (latest.verification === 'rate_limited') setError(latest.message || copy.checkPaymentError);
      } catch (e) {
        const message = e.response?.data?.message || copy.checkPaymentError;
        setError(Array.isArray(message) ? message.join(', ') : message);
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [payment?.publicToken, payment?.qrString, payment?.status, payment?.verification]);

  const submit = async (data) => {
    setBusy(true);
    setError('');

    try {
      const payload = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'profileImage') {
          if (croppedProfileImage) payload.append('profileImage', croppedProfileImage);
        } else if (value !== undefined && value !== null) {
          payload.append(key, value);
        }
      });

      const result = unwrap(await api.post('/auth/register', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }));

      if (result.paymentRequired && result.payment) {
        setPayment(result.payment);
        return;
      }

      setRedirecting(true);
      await transitionDelay(650);
      navigate('/login', { state: { message: copy.accountCreated } });
    } catch (e) {
      const message = e.response?.data?.message || copy.createError;
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setBusy(false);
    }
  };

  const checkPayment = async () => {
    try {
      const latest = unwrap(await api.post(`/payments/registration/${payment.publicToken}/check`));
      setPayment((current) => ({ ...current, ...latest }));
      if (latest.verification === 'rate_limited') setError(latest.message || copy.checkPaymentError);
    } catch (e) {
      const message = e.response?.data?.message || copy.checkPaymentError;
      setError(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  const goToStudentLogin = async () => {
    setRedirecting(true);
    await transitionDelay(650);
    navigate('/login/student');
  };

  if (payment) {
    return (
      <>
        {redirecting && <Loading fullScreen label={t('redirecting')} />}
        <RegistrationPayment
          payment={payment}
          qrImage={qrImage}
          error={error}
          onCheck={checkPayment}
          onLogin={goToStudentLogin}
          language={language}
        />
      </>
    );
  }

  return (
    <>
      {redirecting && <Loading fullScreen label={t('redirecting')} />}
      <div className="auth-background min-h-screen p-4 sm:p-6 lg:p-8">
      <ImageCropper file={cropFile} labels={{ title: t('cropImage'), description: t('cropImageDescription'), zoom: t('zoom'), cancel: t('cancel'), useImage: t('useCroppedImage'), processing: t('preparingImage') }} onCancel={() => setCropFile(null)} onComplete={(croppedFile) => { setCroppedProfileImage(croppedFile); setCropFile(null); }} />
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl shadow-slate-300/40 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none lg:grid-cols-[.78fr_1.22fr]">
        <aside className="auth-hero-panel relative hidden overflow-hidden bg-gradient-to-br from-navy via-[#173957] to-[#246574] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-mint/10 blur-2xl" />
          <div className="relative">
            <Link to="/login" className="text-2xl font-extrabold tracking-tight">
              Campus<span className="text-coral">Flow</span>
            </Link>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[.28em] text-white/55">{language === 'km' ? 'ប្រព័ន្ធសិក្សា' : 'Learning system'}</p>
          </div>

          <div className="auth-hero-content relative my-12">
            <p className="text-xs font-bold uppercase tracking-[.28em] text-mint">{copy.start}</p>
            <h2 className="mt-4 max-w-sm text-4xl font-extrabold leading-tight tracking-tight">{copy.sideTitle}</h2>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/70">{copy.sideDescription}</p>

            <div className="mt-10 space-y-5">
              {copy.steps.map(([number, title, description]) => (
                <div key={number} className="flex items-center gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-mint ring-1 ring-white/10">{number}</span>
                  <div>
                    <p className="text-sm font-bold">{title}</p>
                    <p className="mt-0.5 text-xs text-white/55">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="auth-hero-footer relative text-xs text-white/45">{copy.secure}</p>
        </aside>

        <main className="auth-form-panel min-w-0 p-6 sm:p-10 lg:p-12">
          <div className="flex items-start justify-between gap-5">
            <div>
              <Link to="/login" className="text-2xl font-extrabold tracking-tight text-navy dark:text-white lg:hidden">
                Campus<span className="text-coral">Flow</span>
              </Link>
              <p className="mt-1 text-xs font-bold uppercase tracking-[.24em] text-coral">{copy.join}</p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{copy.create}</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">{copy.subtitle}</p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <ThemeSwitch />
              <button
                type="button"
                onClick={() => setLanguage(language === 'en' ? 'km' : 'en')}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:border-navy hover:text-navy dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                {language === 'en' ? 'ខ្មែរ' : 'English'}
              </button>
            </div>
          </div>

          {error && <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700"><span className="mt-0.5">!</span><span>{error}</span></div>}

          <form onSubmit={handleSubmit(submit)} className="mt-8 space-y-6">
            <input type="hidden" {...register('role')} />

            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink">{copy.chooseType}</p>
                  <p className="mt-1 text-xs text-slate-500">{copy.chooseDescription}</p>
                </div>
                <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 sm:inline-flex dark:bg-slate-700">{copy.step} 1</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <RoleCard
                  active={selectedRole === 'STUDENT'}
                  title={copy.student}
                  description={copy.studentDescription}
                  icon="student"
                  onClick={() => setValue('role', 'STUDENT', { shouldDirty: true })}
                />
                <RoleCard
                  active={selectedRole === 'TEACHER'}
                  title={copy.teacher}
                  description={copy.teacherDescription}
                  icon="teacher"
                  onClick={() => setValue('role', 'TEACHER', { shouldDirty: true })}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900/30">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink">{copy.basic}</p>
                  <p className="mt-1 text-xs text-slate-500">{copy.basicDescription}</p>
                </div>
                <span className="hidden rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 shadow-sm sm:inline-flex dark:bg-slate-800">{copy.step} 2</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={copy.fullName} error={errors.fullName?.message}>
                  <input {...register('fullName', { required: copy.requiredName })} className="input mt-2" placeholder={copy.fullNamePlaceholder} autoComplete="name" />
                </Field>
                <Field label={copy.email} error={errors.email?.message}>
                  <input {...register('email', { required: copy.requiredEmail, pattern: { value: /\S+@\S+\.\S+/, message: copy.invalidEmail } })} type="email" className="input mt-2" placeholder={copy.emailPlaceholder} autoComplete="email" />
                </Field>
                <Field label={copy.language}>
                  <select {...languageField} value={language} onChange={(event) => { languageField.onChange(event); setLanguage(event.target.value); }} className="input mt-2">
                    <option value="en">English</option>
                    <option value="km">Khmer</option>
                  </select>
                </Field>
                {selectedRole === 'TEACHER' && (
                  <Field label={copy.specialization} hint={copy.teacherOnly}>
                    <input {...register('specialization')} className="input mt-2" placeholder={copy.specializationPlaceholder} />
                  </Field>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900/30">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink">{copy.profileSecurity}</p>
                  <p className="mt-1 text-xs text-slate-500">{copy.profileDescription}</p>
                </div>
                <span className="hidden rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 shadow-sm sm:inline-flex dark:bg-slate-800">{copy.step} 3</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('profileImage')} <span className="font-normal text-slate-400">({copy.optional})</span></label>
                  <label className="register-image-upload mt-2 flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 transition hover:border-navy hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint/30 text-xl text-navy dark:text-white">↑</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-navy dark:text-white">{t('uploadImage')}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">{t('profileImageHint')}</span>
                    </span>
                    <input {...profileImageField} type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { profileImageField.onChange(event); const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (isImageTooLarge(file)) { setError(copy.imageTooLarge); return; } setError(''); setCroppedProfileImage(null); setCropFile(file); }} />
                  </label>
                  {croppedProfileImage && <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{t('useCroppedImage')}: {croppedProfileImage.name}</p>}
                </div>

                <div>
                  <Field label={copy.password} error={errors.password?.message}>
                    <input {...register('password', { required: copy.requiredPassword, minLength: { value: 10, message: copy.minPassword }, pattern: { value: passwordPattern, message: copy.strongPassword } })} type="password" className="input mt-2" placeholder={copy.passwordPlaceholder} autoComplete="new-password" />
                  </Field>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <PasswordCheck active={passwordChecks.length} label={copy.characters} />
                    <PasswordCheck active={passwordChecks.uppercase} label={copy.uppercase} />
                    <PasswordCheck active={passwordChecks.lowercase} label={copy.lowercase} />
                    <PasswordCheck active={passwordChecks.number} label={copy.number} />
                    <PasswordCheck active={passwordChecks.special} label={copy.symbol} />
                  </div>
                </div>
              </div>
            </section>

            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-navy py-4 text-sm font-bold text-white shadow-lg shadow-navy/20 transition hover:-translate-y-0.5 hover:bg-[#173957] disabled:cursor-not-allowed disabled:opacity-60">
              {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              {busy ? copy.creatingButton : copy.createButton}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">{copy.already} <Link to="/login" className="font-bold text-navy hover:underline dark:text-mint">{copy.signIn}</Link></p>
        </main>
      </div>
      </div>
    </>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
      <span>{label} {hint && <span className="font-normal text-slate-400">({hint})</span>}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

function RoleCard({ active, title, description, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group flex items-center gap-3 rounded-2xl border p-4 text-left transition ${active ? 'border-navy bg-navy text-white shadow-lg shadow-navy/15' : 'border-slate-200 bg-white text-ink hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-600 dark:bg-slate-800'}`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${active ? 'bg-white/15 text-mint' : 'bg-mint/25 text-navy dark:text-mint'}`}>
        {icon === 'student' ? '⌂' : '✦'}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{title}</span>
        <span className={`mt-1 block text-xs leading-5 ${active ? 'text-white/70' : 'text-slate-500'}`}>{description}</span>
      </span>
      <span className={`ml-auto h-4 w-4 shrink-0 rounded-full border-2 ${active ? 'border-mint bg-mint' : 'border-slate-300'}`} />
    </button>
  );
}

function PasswordCheck({ active, label }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'}`}>{active ? '✓ ' : ''}{label}</span>;
}
