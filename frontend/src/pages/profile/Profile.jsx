import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api, { unwrap } from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import ImageCropper from '../../components/ImageCropper';
import { isImageTooLarge } from '../../utils/fileValidation';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const mediaUrl = (path) => path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;
const dateValue = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { setLanguage, t } = useLanguage();
  const { register, handleSubmit, reset } = useForm();
  const [profile, setProfile] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [cropFile, setCropFile] = useState(null);
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
    api.get('/auth/profile').then((response) => applyProfile(unwrap(response))).catch((e) => setError(e.response?.data?.message || t('unableToLoadProfile')));
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
      setNotice(t('profileUpdated'));
    } catch (e) {
      setError(e.response?.data?.message || t('unableToUpdateProfile'));
    } finally {
      setBusy(false);
    }
  };

  const uploadImage = async () => {
    if (!profileImage) return;
    if (isImageTooLarge(profileImage)) {
      setError(t('imageTooLarge'));
      return;
    }
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
      setNotice(t('profileImageUpdated'));
    } catch (e) {
      setError(e.response?.data?.message || t('unableToUploadImage'));
    } finally {
      setImageBusy(false);
    }
  };

  if (!profile) return <Loading label="Loading profile..." />;
  const isStudent = profile.role === 'STUDENT';
  const isTeacher = profile.role === 'TEACHER';
  return <><Header eyebrow="accountSettings" title={t('yourProfile')} description={t('profileDescription')} /><ImageCropper file={cropFile} labels={{ title: t('cropImage'), description: t('cropImageDescription'), zoom: t('zoom'), cancel: t('cancel'), useImage: t('useCroppedImage'), processing: t('preparingImage') }} onCancel={() => setCropFile(null)} onComplete={(croppedFile) => { if (isImageTooLarge(croppedFile)) { setError(t('imageTooLarge')); return; } setProfileImage(croppedFile); setCropFile(null); }} /><form onSubmit={handleSubmit(save)} className="grid gap-6 lg:grid-cols-[1fr_360px]"><div className="card space-y-5"><div><h2 className="text-lg font-bold text-ink">{t('personalInformation')}</h2><p className="mt-1 text-sm text-slate-500">{t('personalInfoDescription')}</p></div><div className="flex flex-wrap items-center gap-4 rounded-2xl bg-slate-50 p-4"><div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-navy text-2xl font-bold text-white">{profile.profileImageUrl ? <img src={mediaUrl(profile.profileImageUrl)} alt={profile.fullName} className="h-full w-full object-cover" /> : profile.fullName?.charAt(0)?.toUpperCase()}</div><div className="min-w-[220px] flex-1"><p className="font-semibold text-ink">{t('profileImage')}</p><p className="mt-1 text-xs text-slate-500">{t('profileImageHint')}</p><input type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" className="input mt-3 p-2" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; setProfileImage(null); if (!file) return; if (isImageTooLarge(file)) { setError(t('imageTooLarge')); return; } setError(''); setCropFile(file); }} /><button type="button" disabled={!profileImage || imageBusy} onClick={uploadImage} className="mt-2 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{imageBusy ? t('uploading') : t('uploadImage')}</button>{profileImage && !imageBusy && <p className="mt-2 text-xs font-semibold text-emerald-700">{t('useCroppedImage')}</p>}</div></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">{t('fullName')}<input {...register('fullName', { required: true })} className="input mt-2" /></label><label className="text-sm font-semibold text-slate-700">{t('email')}<input value={profile.email} readOnly className="input mt-2 cursor-not-allowed bg-slate-50" /></label><label className="text-sm font-semibold text-slate-700">{t('phone')}<input {...register('phone')} className="input mt-2" /></label><label className="text-sm font-semibold text-slate-700">{t('language')}<select {...register('language')} className="input mt-2"><option value="en">English</option><option value="km">Khmer</option></select></label>{isStudent && <label className="text-sm font-semibold text-slate-700">{t('gender')}<input {...register('gender')} className="input mt-2" /></label>}{isStudent && <label className="text-sm font-semibold text-slate-700">{t('dateOfBirth')}<input {...register('dateOfBirth')} type="date" className="input mt-2" /></label>}<label className="text-sm font-semibold text-slate-700 sm:col-span-2">{t('address')}<textarea {...register('address')} rows="3" className="input mt-2" /></label></div>{isStudent && <div className="border-t border-slate-100 pt-5"><h2 className="text-lg font-bold text-ink">{t('guardianInfo')}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">{t('guardianName')}<input {...register('guardianName')} className="input mt-2" /></label><label className="text-sm font-semibold text-slate-700">{t('guardianPhone')}<input {...register('guardianPhone')} className="input mt-2" /></label></div></div>}{isTeacher && <div className="border-t border-slate-100 pt-5"><h2 className="text-lg font-bold text-ink">{t('teachingProfile')}</h2><label className="mt-4 block text-sm font-semibold text-slate-700">{t('specialization')}<input {...register('specialization')} className="input mt-2" placeholder={t('specialization')} /></label></div>}</div><div className="space-y-6"><div className="card"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.2em] text-coral">{t('security')}</p><h2 className="mt-2 text-lg font-bold text-ink">{t('changePassword')}</h2><p className="mt-1 text-sm text-slate-500">{t('leaveBlankCurrent')}</p></div><input {...register('password', { minLength: { value: 8, message: 'Use at least 8 characters.' } })} type="password" className="input" placeholder={t('newPasswordPlaceholder')} /></div><div className="card"><p className="text-sm text-slate-500">{t('accountType')}</p><p className="mt-2 text-2xl font-bold text-ink">{profile.role}</p><p className="mt-2 text-xs text-slate-400">{t('roleManaged')}</p></div><button disabled={busy} className="w-full rounded-xl bg-navy px-5 py-3.5 font-semibold text-white shadow-lg shadow-navy/10 disabled:opacity-60">{busy ? t('savingChanges') : t('saveProfileChanges')}</button>{notice && <div className="rounded-xl bg-mint p-4 text-sm text-emerald-800">{notice}</div>}{error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}</div></form></>;
}
