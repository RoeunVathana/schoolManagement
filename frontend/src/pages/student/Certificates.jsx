import { useEffect, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import { useLanguage } from '../../context/LanguageContext';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const mediaUrl = (path) => path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;
const isImage = (path) => /\.(png|jpe?g|webp)$/i.test(path || '');
const formatDate = (value, language) => value ? new Date(value).toLocaleDateString(language === 'km' ? 'km-KH' : 'en-US', { dateStyle: 'medium' }) : '-';
const formatFileSize = (bytes) => {
  const value = Number(bytes || 0);
  if (!value) return '-';
  return value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export default function Certificates() {
  const { language, t } = useLanguage();
  const [certificates, setCertificates] = useState(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState('');

  useEffect(() => {
    api.get('/certificates/my').then((response) => setCertificates(unwrap(response) || [])).catch((e) => { setError(e.response?.data?.message || t('noRecords')); setCertificates([]); });
  }, []);

  const downloadCertificate = async (certificate) => {
    setDownloading(certificate.id);
    setError('');
    try {
      const response = await api.get(`/certificates/${certificate.id}/file`, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = certificate.originalName || `${certificate.title || 'certificate'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setError(e.response?.data?.message || t('certificateDownloadFailed'));
    } finally {
      setDownloading('');
    }
  };

  return <>
    <Header eyebrow="studentSpace" title="certificates" description="certificatesStudentDescription" />
    {error && <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {certificates === null ? <Loading /> : <>
      <div className="mb-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-700 dark:text-emerald-300">{t('learningMilestone')}</p><h2 className="mt-2 text-2xl font-extrabold text-ink dark:text-white">{t('yourCertificates')}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-300">{t('certificatesStudentDescription')}</p></div><div className="rounded-2xl bg-white/80 px-5 py-4 text-center shadow-sm dark:bg-slate-900/60"><p className="text-3xl font-extrabold text-emerald-600">{certificates.length}</p><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('certificatesEarned')}</p></div></div>
      </div>
      {certificates.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{certificates.map((certificate) => <article key={certificate.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-emerald-50 to-sky-100 dark:from-slate-800 dark:via-emerald-950/30 dark:to-slate-900">{isImage(certificate.fileUrl) ? <img src={mediaUrl(certificate.fileUrl)} alt={certificate.title} className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-red-100 text-2xl font-black text-red-600 shadow-inner dark:bg-red-950/50 dark:text-red-300">PDF</div>}<span className="absolute right-3 top-3 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">{t('completed')}</span></div>
        <div className="p-5"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-coral">{certificate.course?.courseCode || t('course')}</p><h3 className="mt-2 text-xl font-extrabold text-ink dark:text-white">{certificate.title}</h3><p className="mt-2 font-semibold text-slate-700 dark:text-slate-200">{certificate.course?.courseName || '-'}</p>{certificate.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{certificate.description}</p>}<div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400"><span>{t('issuedAt')}: {formatDate(certificate.issuedAt, language)}</span><span>{formatFileSize(certificate.fileSize)}</span></div><div className="mt-5 grid gap-2 sm:grid-cols-2"><a href={mediaUrl(certificate.fileUrl)} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{t('viewCurrent')} ↗</a><button type="button" disabled={downloading === certificate.id} onClick={() => downloadCertificate(certificate)} className="inline-flex w-full items-center justify-center rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60">{downloading === certificate.id ? t('uploadingFile') : t('downloadCertificate')} ↓</button></div></div>
      </article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-2xl dark:bg-emerald-950/40">🎓</div><h3 className="mt-4 text-lg font-extrabold text-ink dark:text-white">{t('noCertificates')}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{t('certificateWillAppear')}</p></div>}
    </>}
  </>;
}
