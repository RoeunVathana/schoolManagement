import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../hooks/useAuth';
import { roleHome } from '../../utils/roles';

const roleOptions = {
  ADMIN: { label: 'Administrator', shortLabel: 'Admin', description: 'Manage users, courses, permissions and school records.', color: 'bg-coral', path: '/login/admin', placeholder: 'vothanarern@mail.com' },
  TEACHER: { label: 'Teacher', shortLabel: 'Teacher', description: 'Manage assigned courses, attendance and student work.', color: 'bg-[#7c8cf8]', path: '/login/teacher', placeholder: 'teacher@example.com' },
  STUDENT: { label: 'Student', shortLabel: 'Student', description: 'Learn, submit work and review your results.', color: 'bg-emerald-500', path: '/login/student', placeholder: 'student@example.com' },
};
const roleFromPath = { '/login/admin': 'ADMIN', '/login/teacher': 'TEACHER', '/login/student': 'STUDENT' };

export default function Login() {
  const { register, handleSubmit, reset } = useForm();
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedRole = roleFromPath[location.pathname] || 'STUDENT';
  const selected = roleOptions[selectedRole];
  const [error, setError] = useState(location.state?.message || '');
  const [busy, setBusy] = useState(false);

  useEffect(() => { reset({ email: '', password: '' }); setError(location.state?.message || ''); }, [location.pathname, location.state, reset]);

  const submit = async (data) => {
    setBusy(true);
    setError('');
    try {
      const user = await login({ ...data, role: selectedRole });
      if (user.role !== selectedRole) {
        await logout();
        setError(`This is not a ${selected.label} account. Please use the correct login page.`);
        return;
      }
      navigate(roleHome(user.role), { replace: true });
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to sign in. Check your credentials.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="flex min-h-screen bg-navy"><div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-navy to-[#1d4660] p-12 text-white lg:flex"><div className="text-2xl font-bold">Campus<span className="text-mint">Flow</span></div><div className="max-w-md"><p className="mb-4 text-sm font-semibold uppercase tracking-[.25em] text-mint">Student management system</p><h1 className="text-5xl font-bold leading-tight">Make learning feel a little more human.</h1><p className="mt-6 text-lg leading-8 text-slate-300">A focused workspace for administrators, teachers and students to stay in sync.</p></div><p className="text-sm text-slate-400">PostgreSQL - NestJS - React</p></div><div className="auth-background flex flex-1 items-center justify-center p-6"><div className="w-full max-w-md"><div className="mb-8 lg:hidden"><div className="text-2xl font-bold text-navy dark:text-white">Campus<span className="text-coral">Flow</span></div></div><div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/70 dark:bg-slate-800 dark:shadow-none"><div className="mb-6 flex items-center justify-between gap-3"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.22em] text-coral">Secure sign in</p><h2 className="text-3xl font-bold text-ink">{selected.label} login</h2></div><span className={`rounded-2xl px-3 py-2 text-xs font-bold text-white ${selected.color}`}>{selected.shortLabel}</span></div><p className="text-sm leading-6 text-slate-500">{selected.description}</p><div className="mt-6 grid grid-cols-3 gap-2">{Object.entries(roleOptions).map(([key, role]) => <Link key={key} to={role.path} className={`rounded-xl border px-2 py-3 text-center text-xs font-bold transition ${selectedRole === key ? `${role.color} border-transparent text-white shadow-md` : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{role.shortLabel}</Link>)}</div>{error && <div role="alert" className="mt-6 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</div>}<form onSubmit={handleSubmit(submit)} className="mt-8 space-y-5"><label className="block text-sm font-semibold text-slate-700">{selected.label} email<input {...register('email', { required: 'Enter your email address.' })} type="email" autoComplete="email" className="input mt-2" placeholder={selected.placeholder} /></label><label className="block text-sm font-semibold text-slate-700">Password<input {...register('password', { required: 'Enter your password.' })} type="password" autoComplete="current-password" className="input mt-2" placeholder="Enter your password" /></label><button disabled={busy} className="w-full rounded-xl bg-navy px-4 py-3.5 font-semibold text-white transition hover:bg-[#1b3b5d] disabled:opacity-60">{busy ? 'Signing in...' : `Sign in as ${selected.shortLabel}`}</button></form>{selectedRole === 'ADMIN' ? <p className="mt-5 rounded-xl bg-slate-50 p-3 text-center text-xs leading-5 text-slate-500">Administrator accounts are created and managed by the system owner.</p> : <p className="mt-5 text-center text-sm text-slate-500">Need a {selected.shortLabel.toLowerCase()} account? <Link to="/register" className="font-semibold text-navy dark:text-mint">Register here</Link></p>}</div></div></div></div>;
}
