import { useEffect, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import { useLanguage } from '../../context/LanguageContext';

const emptyForm = { botToken: '', chatId: '', enabled: true };

export default function TelegramSettings() {
  const { t } = useLanguage();
  const [form, setForm] = useState(emptyForm);
  const [settings, setSettings] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    api.get('/telegram-settings')
      .then((response) => {
        const data = unwrap(response);
        setSettings(data);
        setForm((current) => ({ ...current, chatId: data.chatId || '', enabled: data.enabled !== false }));
      })
      .catch((error) => setMessage({ type: 'error', text: error.response?.data?.message || t('telegramLoadFailed') }));
  }, [t]);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await api.patch('/telegram-settings', { botToken: form.botToken || undefined, chatId: form.chatId, enabled: form.enabled });
      setSettings(unwrap(response));
      setForm((current) => ({ ...current, botToken: '' }));
      setMessage({ type: 'success', text: t('telegramSaved') });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || t('telegramSaveFailed') });
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setMessage({ type: '', text: '' });
    try {
      await api.post('/telegram-settings/test');
      setMessage({ type: 'success', text: t('telegramTestSuccess') });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || t('telegramTestFailed') });
    } finally {
      setTesting(false);
    }
  };

  if (!settings) return <><Header eyebrow="adminTools" title="telegramSettings" description="telegramSettingsDescription" /><Loading /></>;

  return <>
    <Header eyebrow="adminTools" title="telegramSettings" description="telegramSettingsDescription" />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
      <form onSubmit={save} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 sm:p-7">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-coral">Telegram</p>
            <h2 className="mt-2 text-xl font-bold text-ink dark:text-white">{t('telegramPaymentReports')}</h2>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${settings.configured ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'}`}>
            {settings.configured ? t('telegramConfigured') : t('telegramNotConfigured')}
          </span>
        </div>

        <div className="space-y-5">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('telegramBotToken')}
            <input type="password" autoComplete="new-password" value={form.botToken} onChange={(event) => setForm({ ...form, botToken: event.target.value })} className="input mt-2" placeholder={settings.botToken || t('telegramTokenPlaceholder')} />
            <span className="mt-1.5 block text-xs font-normal text-slate-500">{t('telegramTokenHint')}</span>
          </label>

          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('telegramChatId')}
            <input value={form.chatId} onChange={(event) => setForm({ ...form, chatId: event.target.value })} className="input mt-2" placeholder="5934277627" />
            <span className="mt-1.5 block text-xs font-normal text-slate-500">{t('telegramChatIdHint')}</span>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
            <input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} className="h-4 w-4 accent-[#1e9bd7]" />
            {t('telegramEnabled')}
          </label>
        </div>

        {message.text && <p className={`mt-5 rounded-2xl px-4 py-3 text-sm font-semibold ${message.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>{message.text}</p>}

        <div className="mt-6 flex flex-wrap gap-3">
          <button disabled={busy} className="rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white shadow-lg shadow-navy/15 transition hover:-translate-y-0.5 hover:bg-[#1b3b5d] disabled:opacity-60">{busy ? t('saving') : t('saveTelegramSettings')}</button>
          <button type="button" disabled={testing || !settings.configured} onClick={test} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-sky-400 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200">{testing ? t('loading') : t('testTelegram')}</button>
        </div>
      </form>

      <aside className="rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm dark:border-slate-700 dark:from-sky-950/30 dark:to-slate-900/70 sm:p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#229ed9] text-2xl text-white shadow-lg shadow-sky-500/20">✈</div>
        <h2 className="mt-5 text-xl font-bold text-ink dark:text-white">{t('telegramHelp')}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{t('telegramHelpDescription')}</p>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-950/40">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{t('telegramChatId')}</p>
          <p className="mt-2 break-all font-mono text-sm text-slate-700 dark:text-slate-200">{settings.chatId || '—'}</p>
        </div>
      </aside>
    </div>
  </>;
}
