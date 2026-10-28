import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api, { unwrap } from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import Header from '../../components/Header';
import Loading from '../../components/Loading';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const mediaUrl = (path) => path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;
const dateValue = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { setLanguage } = useLanguage();
  const { register, handleSubmit, reset } = useForm();
  const [profile, setProfile] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const applyProfile = (data) => {
    setProfile(data);
    setLanguage(data.language || 'en');
    reset({ fullName: data.fullName, phone: data.phone || '', gender: data.student?.gender || '', dateOfBirth: dateValue(data.student?.dateOfBirth), address: data.student?.address || data.teacher?.address || '', guardianName: data.student?.guardianName || '', guardianPhone: data.student?.guardianPhone || '', specialization: data.teacher?.specialization || '', language: data.language || 'en', password: '' });
  };

  useEffect(() => {
    api.get('/auth/profile').then((response) => applyProfile(unwrap(response))).catch((e) => setError(e.response?.data?.message || 'Unable to load profile.'));
  }, [reset]);

  const save = async (data) => {
    setBusy(true);
    setNotice('');
    setError('');
    if (!data.password) delete data.password;
    try {
      const updated = unwrap(await api.patch('/auth/profile', data));
      applyProfile(updated);
      updateUser(updated);
      setNotice('Profile updated successfully.');
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to update profile.');
    } finally {
      setBusy(false);
    }
  };

  const uploadImage = async () => {
    if (!profileImage) return;
    setImageBusy(true);
    setNotice('');
    setError('');
    try {
      const formData = new FormData();
      formData.append('profileImage', profileImage);
      const updated = unwrap(await api.post('/auth/profile/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }));
      applyProfile(updated);
      updateUser(updated);
      setProfileImage(null);
      setNotice('Profile image updated successfully.');
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to upload profile image.');
    } finally {
      setImageBusy(false);
    }
  };

  if (!profile) return <Loading label="Loading profile..." />;
  const isStudent = profile.role === 'STUDENT';
  const isTeacher = profile.role === 'TEACHER';
  return <><Header eyebrow="accountSettings" title="Your profile" description="Keep your personal information and profile image up to date." /><form onSubmit={handleSubmit(save)} className="grid gap-6 lg:grid-cols-[1fr_360px]"><div className="card space-y-5"><div><h2 className="text-lg font-bold text-ink">Personal information</h2><p className="mt-1 text-sm text-slate-500">This information is visible to your school workspace.</p></div><div className="flex flex-wrap items-center gap-4 rounded-2xl bg-slate-50 p-4"><div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-navy text-2xl font-bold text-white">{profile.profileImageUrl ? <img src={mediaUrl(profile.profileImageUrl)} alt={profile.fullName} className="h-full w-full object-cover" /> : profile.fullName?.charAt(0)?.toUpperCase()}</div><div className="min-w-[220px] flex-1"><p className="font-semibold text-ink">Profile image</p><p className="mt-1 text-xs text-slate-500">PNG, JPG or WEBP up to 5 MB.</p><input type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" className="input mt-3 p-2" onChange={(e) => setProfileImage(e.target.files?.[0] || null)} /><button type="button" disabled={!profileImage || imageBusy} onClick={uploadImage} className="mt-2 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{imageBusy ? 'Uploading...' : 'Upload image'}</button></div></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Full name<input {...register('fullName', { required: true })} className="input mt-2" /></label><label className="text-sm font-semibold text-slate-700">Email<input value={profile.email} readOnly className="input mt-2 cursor-not-allowed bg-slate-50" /></label><label className="text-sm font-semibold text-slate-700">Phone<input {...register('phone')} className="input mt-2" /></label><label className="text-sm font-semibold text-slate-700">Language<select {...register('language')} className="input mt-2"><option value="en">English</option><option value="km">Khmer</option></select></label>{isStudent && <label className="text-sm font-semibold text-slate-700">Gender<input {...register('gender')} className="input mt-2" /></label>}{isStudent && <label className="text-sm font-semibold text-slate-700">Date of birth<input {...register('dateOfBirth')} type="date" className="input mt-2" /></label>}<label className="text-sm font-semibold text-slate-700 sm:col-span-2">Address<textarea {...register('address')} rows="3" className="input mt-2" /></label></div>{isStudent && <div className="border-t border-slate-100 pt-5"><h2 className="text-lg font-bold text-ink">Guardian information</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Guardian name<input {...register('guardianName')} className="input mt-2" /></label><label className="text-sm font-semibold text-slate-700">Guardian phone<input {...register('guardianPhone')} className="input mt-2" /></label></div></div>}{isTeacher && <div className="border-t border-slate-100 pt-5"><h2 className="text-lg font-bold text-ink">Teaching profile</h2><label className="mt-4 block text-sm font-semibold text-slate-700">Specialization<input {...register('specialization')} className="input mt-2" placeholder="e.g. Mathematics" /></label></div>}</div><div className="space-y-6"><div className="card"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.2em] text-coral">Security</p><h2 className="mt-2 text-lg font-bold text-ink">Change password</h2><p className="mt-1 text-sm text-slate-500">Leave blank to keep your current password.</p></div><input {...register('password', { minLength: { value: 8, message: 'Use at least 8 characters.' } })} type="password" className="input" placeholder="New password" /></div><div className="card"><p className="text-sm text-slate-500">Account type</p><p className="mt-2 text-2xl font-bold text-ink">{profile.role}</p><p className="mt-2 text-xs text-slate-400">Your role is managed by an administrator.</p></div><button disabled={busy} className="w-full rounded-xl bg-navy px-5 py-3.5 font-semibold text-white shadow-lg shadow-navy/10 disabled:opacity-60">{busy ? 'Saving changes...' : 'Save profile changes'}</button>{notice && <div className="rounded-xl bg-mint p-4 text-sm text-emerald-800">{notice}</div>}{error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}</div></form></>;
}
