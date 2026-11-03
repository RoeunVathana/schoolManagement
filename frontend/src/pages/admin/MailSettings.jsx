import { useEffect, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import PasswordInput from '../../components/PasswordInput';
import { useLanguage } from '../../context/LanguageContext';

const emptyForm = { host: 'smtp.gmail.com', port: '465', secure: true, user: '', password: '', from: '' };

const normalizeSecureForPort = (port, fallback = true) => {
  const numericPort = Number(port);
  if (numericPort === 465) return true;
  if (numericPort === 587) return false;
  return fallback;
};

export default function MailSettings() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = () => api.get('/mail-settings').then((response) => {
    const data = unwrap(response);
    setSettings(data);
    setForm((current) => ({
      ...current,
      host: data.host || current.host,
      port: String(data.port || current.port),
      secure: normalizeSecureForPort(data.port || current.port, data.secure === true),
    }));
  });

  useEffect(() => {
    load().catch((error) => setNotice({ type: 'error', text: error.response?.data?.message || t('mailSettingsLoadFailed') }));
  }, [t]);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice({ type: '', text: '' });
    try {
      const payload = {
        host: form.host.trim(),
        port: Number(form.port),
        secure: form.secure,
        user: form.user.trim() || undefined,
        password: form.password || undefined,
        from: form.from.trim() || undefined,
      };
      const data = unwrap(await api.patch('/mail-settings', payload));
      setSettings(data);
      setForm((current) => ({
        ...current,
        host: data.host || current.host,
        port: String(data.port || current.port),
        secure: normalizeSecureForPort(data.port || current.port, data.secure === true),
        password: '',
        user: '',
        from: '',
      }));
      setNotice({ type: 'success', text: t('mailSettingsSaved') });
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || t('mailSettingsSaveFailed') });
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setNotice({ type: '', text: '' });
    try {
      await api.post('/mail-settings/test');
      setNotice({ type: 'success', text: t('mailSettingsTestSuccess') });
      await load();
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || t('mailSettingsTestFailed') });
    } finally {
      setTesting(false);
    }
  };

  const clear = async () => {
    if (!window.confirm(t('mailSettingsClearConfirm'))) return;
    setClearing(true);
    setNotice({ type: '', text: '' });
    try {
      const data = unwrap(await api.delete('/mail-settings'));
      setSettings(data);
      setForm(emptyForm);
      setNotice({ type: 'success', text: t('mailSettingsCleared') });
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || t('mailSettingsClearFailed') });
    } finally {
      setClearing(false);
    }
  };

  const connectionFailed = settings?.status === 'failed';
  const statusClass = connectionFailed
    ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
    : settings?.configured
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
  const sourceLabel = settings?.source === 'database' ? t('mailSettingsDatabase') : settings?.source === 'environment' ? t('mailSettingsEnvironment') : t('mailSettingsNone');
  const noticeClass = notice.type === 'error'
    ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';

  if (!settings) return <><Header eyebrow="adminTools" title="mailSettings" description="mailSettingsDescription" /><Loading /></>;

  return <>
    <Header eyebrow="adminTools" title="mailSettings" description="mailSettingsDescription" />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,.75fr)]">
      <form onSubmit={save} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 sm:p-7">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">SMTP</p><h2 className="mt-2 text-xl font-bold text-ink dark:text-white">{t('mailSettingsConnection')}</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('mailSettingsSecurityHint')}</p></div>
          <span className={'rounded-full px-3 py-1.5 text-xs font-bold ' + statusClass}>{connectionFailed ? t('mailSettingsTestFailed') : settings.configured ? t('mailSettingsConfigured') : t('mailSettingsNotConfigured')}</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">{t('mailHost')}<input required value={form.host} onChange={(event) => setForm({ ...form, host: event.target.value })} className="input mt-2" placeholder="smtp.gmail.com" /></label>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('mailPort')}<input required type="number" min="1" max="65535" value={form.port} onChange={(event) => { const port = event.target.value; setForm((current) => ({ ...current, port, secure: normalizeSecureForPort(port, current.secure) })); }} className="input mt-2" placeholder="465" /></label>
          <label className={'flex items-center gap-3 self-end rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 ' + (Number(form.port) === 587 ? 'cursor-not-allowed opacity-75' : 'cursor-pointer')}><input type="checkbox" checked={form.secure} disabled={Number(form.port) === 587} onChange={(event) => setForm((current) => ({ ...current, secure: event.target.checked }))} className="h-4 w-4 accent-[#1e9bd7]" />{t('mailSecure')}<span className="text-xs font-normal text-slate-500">{Number(form.port) === 587 ? 'STARTTLS' : 'TLS'}</span></label>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('mailUser')}<input type="email" value={form.user} onChange={(event) => setForm({ ...form, user: event.target.value })} className="input mt-2" placeholder={settings.user || 'your-email@gmail.com'} autoComplete="off" /><span className="mt-1.5 block text-xs font-normal text-slate-500">{t('mailUserHint')}</span></label>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('mailPassword')}<PasswordInput value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="input mt-2 pr-12" placeholder={settings.passwordConfigured ? t('mailPasswordKeep') : t('mailPasswordPlaceholder')} autoComplete="new-password" /><span className="mt-1.5 block text-xs font-normal text-slate-500">{t('mailPasswordHint')}</span></label>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">{t('mailFrom')}<input value={form.from} onChange={(event) => setForm({ ...form, from: event.target.value })} className="input mt-2" placeholder={settings.from || 'CampusFlow <your-email@gmail.com>'} autoComplete="off" /></label>
        </div>

        {connectionFailed && <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">{t('mailSettingsTestFailed')}</p>}
        {notice.text && <p className={'mt-5 rounded-2xl px-4 py-3 text-sm font-semibold ' + noticeClass}>{notice.text}</p>}
        <div className="mt-6 flex flex-wrap gap-3"><button disabled={busy} className="rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-60">{busy ? t('saving') : t('saveMailSettings')}</button><button type="button" disabled={testing || !settings.configured} onClick={test} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200">{testing ? t('loading') : t('testMailSettings')}</button><button type="button" disabled={clearing} onClick={clear} className="rounded-xl border border-red-200 px-5 py-3 text-sm font-bold text-red-700 disabled:opacity-50 dark:border-red-900/60 dark:text-red-300">{clearing ? t('loading') : t('clearMailSettings')}</button></div>
      </form>

      <aside className="rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm dark:border-slate-700 dark:from-sky-950/30 dark:to-slate-900/70 sm:p-7"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-white shadow-lg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6.5h18v11H3zM3 7l9 6 9-6" /></svg></div><h2 className="mt-5 text-xl font-bold text-ink dark:text-white">{t('mailSettingsActive')}</h2><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{t('mailSettingsActiveDescription')}</p><div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-950/40"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{t('mailSettingsSource')}</p><p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{sourceLabel}</p></div><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{t('mailSettingsAccount')}</p><p className="mt-1 break-all font-mono text-sm text-slate-700 dark:text-slate-200">{settings.user || '-'}</p></div><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{t('mailSettingsPassword')}</p><p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{settings.passwordConfigured ? '••••••••••••' : t('mailSettingsMissing')}</p></div></div></aside>
    </div>
  </>;
}
