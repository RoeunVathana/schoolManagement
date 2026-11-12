import { useEffect, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import PasswordInput from '../../components/PasswordInput';
import { useLanguage } from '../../context/LanguageContext';

const emptyForm = {
  registrationPaymentRequired: false,
  registrationFee: '1.00',
  registrationCurrency: 'USD',
  paymentQrExpiresMinutes: '10',
  apiUrl: 'https://api-bakong.nbc.gov.kh',
  apiToken: '',
  apiEnabled: true,
  accountId: '',
  bakongMerchantName: '',
  bakongMerchantNameKm: '',
  bakongMerchantCity: '',
  bakongMerchantCityKm: '',
  merchantName: '',
  merchantCity: '',
  merchantPhone: '',
  storeLabel: '',
};

const field = (data, key, fallback = '') => data?.[key] ?? fallback;

export default function BakongSettings() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState(false);

  const applySettings = (data) => {
    setSettings(data);
    setForm((current) => ({
      ...current,
      registrationPaymentRequired: data.registrationPaymentRequired === true,
      registrationFee: String(field(data, 'registrationFee', current.registrationFee)),
      registrationCurrency: field(data, 'registrationCurrency', current.registrationCurrency),
      paymentQrExpiresMinutes: String(field(data, 'paymentQrExpiresMinutes', current.paymentQrExpiresMinutes)),
      apiUrl: field(data, 'apiUrl', current.apiUrl),
      apiToken: '',
      apiEnabled: data.apiEnabled !== false,
      accountId: field(data, 'accountId', current.accountId),
      bakongMerchantName: field(data, 'bakongMerchantName', current.bakongMerchantName),
      bakongMerchantNameKm: field(data, 'bakongMerchantNameKm', current.bakongMerchantNameKm),
      bakongMerchantCity: field(data, 'bakongMerchantCity', current.bakongMerchantCity),
      bakongMerchantCityKm: field(data, 'bakongMerchantCityKm', current.bakongMerchantCityKm),
      merchantName: field(data, 'merchantName', current.merchantName),
      merchantCity: field(data, 'merchantCity', current.merchantCity),
      merchantPhone: field(data, 'merchantPhone', current.merchantPhone),
      storeLabel: field(data, 'storeLabel', current.storeLabel),
    }));
  };

  const load = () => api.get('/bakong-settings').then((response) => {
    setError('');
    applySettings(unwrap(response));
  });

  useEffect(() => {
    load().catch((requestError) => setError(requestError.response?.data?.message || t('bakongSettingsLoadFailed')));
  }, [t]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice({ type: '', text: '' });
    try {
      const payload = {
        ...form,
        registrationFee: form.registrationFee.trim(),
        paymentQrExpiresMinutes: Number(form.paymentQrExpiresMinutes),
        apiToken: form.apiToken.trim() || undefined,
        accountId: form.accountId.trim(),
        bakongMerchantName: form.bakongMerchantName.trim(),
        bakongMerchantNameKm: form.bakongMerchantNameKm.trim(),
        bakongMerchantCity: form.bakongMerchantCity.trim(),
        bakongMerchantCityKm: form.bakongMerchantCityKm.trim(),
        merchantName: form.merchantName.trim(),
        merchantCity: form.merchantCity.trim(),
        merchantPhone: form.merchantPhone.trim(),
        storeLabel: form.storeLabel.trim(),
      };
      const data = unwrap(await api.patch('/bakong-settings', payload));
      applySettings(data);
      setNotice({ type: 'success', text: t('bakongSettingsSaved') });
    } catch (requestError) {
      setNotice({ type: 'error', text: requestError.response?.data?.message || t('bakongSettingsSaveFailed') });
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    if (!window.confirm(t('bakongSettingsClearConfirm'))) return;
    setClearing(true);
    setNotice({ type: '', text: '' });
    try {
      const data = unwrap(await api.delete('/bakong-settings'));
      applySettings(data);
      setNotice({ type: 'success', text: t('bakongSettingsCleared') });
    } catch (requestError) {
      setNotice({ type: 'error', text: requestError.response?.data?.message || t('bakongSettingsClearFailed') });
    } finally {
      setClearing(false);
    }
  };

  const noticeClass = notice.type === 'error'
    ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  const sourceLabel = settings?.source === 'database' ? t('bakongSettingsDatabase') : settings?.source === 'environment' ? t('bakongSettingsEnvironment') : t('bakongSettingsNone');

  if (!settings && error) return <>
    <Header eyebrow="adminTools" title="bakongSettings" description="bakongSettingsDescription" />
    <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
      <p className="font-bold">{error}</p>
      <button type="button" onClick={() => { setError(''); load().catch((requestError) => setError(requestError.response?.data?.message || t('bakongSettingsLoadFailed'))); }} className="mt-4 rounded-xl bg-navy px-5 py-3 font-bold text-white">{t('retry')}</button>
    </div>
  </>;

  if (!settings) return <><Header eyebrow="adminTools" title="bakongSettings" description="bakongSettingsDescription" /><Loading /></>;

  return <>
    <Header eyebrow="adminTools" title="bakongSettings" description="bakongSettingsDescription" />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
      <form onSubmit={save} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 sm:p-7">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">KHQR / Bakong</p><h2 className="mt-2 text-xl font-bold text-ink dark:text-white">{t('bakongSettingsConnection')}</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{t('bakongSettingsSecurityHint')}</p></div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${settings.configured ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'}`}>{settings.configured ? t('bakongSettingsConfigured') : t('bakongSettingsNotConfigured')}</span>
        </div>

        <div className="space-y-6">
          <section><h3 className="text-sm font-extrabold uppercase tracking-[.14em] text-slate-400">{t('bakongSettingsRegistration')}</h3><div className="mt-3 grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('bakongRegistrationFee')}<input required type="number" min="0.01" max="1000000" step="0.01" value={form.registrationFee} onChange={(event) => update('registrationFee', event.target.value)} className="input mt-2" /></label>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('bakongRegistrationCurrency')}<select value={form.registrationCurrency} onChange={(event) => update('registrationCurrency', event.target.value)} className="input mt-2"><option value="USD">USD</option><option value="KHR">KHR</option></select></label>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('bakongQrExpiry')}<input required type="number" min="1" max="10" value={form.paymentQrExpiresMinutes} onChange={(event) => update('paymentQrExpiresMinutes', event.target.value)} className="input mt-2" /></label>
          </div><label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200"><input type="checkbox" checked={form.registrationPaymentRequired} onChange={(event) => update('registrationPaymentRequired', event.target.checked)} className="h-4 w-4 accent-[#1e9bd7]" />{t('bakongRegistrationRequired')}</label></section>

          <section><h3 className="text-sm font-extrabold uppercase tracking-[.14em] text-slate-400">{t('bakongSettingsApi')}</h3><div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">{t('bakongApiUrl')}<input required type="url" value={form.apiUrl} onChange={(event) => update('apiUrl', event.target.value)} className="input mt-2" placeholder="https://api-bakong.nbc.gov.kh" /></label>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">{t('bakongApiToken')}<PasswordInput autoComplete="new-password" value={form.apiToken} onChange={(event) => update('apiToken', event.target.value)} className="input mt-2" placeholder={settings.apiToken || t('bakongApiTokenKeep')} /><span className="mt-1.5 block text-xs font-normal text-slate-500">{t('bakongApiTokenHint')}</span></label>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 sm:col-span-2"><input type="checkbox" checked={form.apiEnabled} onChange={(event) => update('apiEnabled', event.target.checked)} className="h-4 w-4 accent-[#1e9bd7]" />{t('bakongApiEnabled')}</label>
          </div></section>

          <section><h3 className="text-sm font-extrabold uppercase tracking-[.14em] text-slate-400">{t('bakongSettingsMerchant')}</h3><div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">{t('bakongAccountId')}<input required value={form.accountId} onChange={(event) => update('accountId', event.target.value)} className="input mt-2" placeholder="your_account@bkrt" /></label>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('bakongMerchantName')}<input value={form.bakongMerchantName} onChange={(event) => update('bakongMerchantName', event.target.value)} className="input mt-2" maxLength="25" /></label>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('bakongMerchantNameKm')}<input value={form.bakongMerchantNameKm} onChange={(event) => update('bakongMerchantNameKm', event.target.value)} className="input mt-2" maxLength="25" /></label>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('bakongMerchantCity')}<input value={form.bakongMerchantCity} onChange={(event) => update('bakongMerchantCity', event.target.value)} className="input mt-2" maxLength="15" /></label>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('bakongMerchantCityKm')}<input value={form.bakongMerchantCityKm} onChange={(event) => update('bakongMerchantCityKm', event.target.value)} className="input mt-2" maxLength="15" /></label>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('bakongMerchantNamePrimary')}<input value={form.merchantName} onChange={(event) => update('merchantName', event.target.value)} className="input mt-2" maxLength="25" /></label>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('bakongMerchantCityPrimary')}<input value={form.merchantCity} onChange={(event) => update('merchantCity', event.target.value)} className="input mt-2" maxLength="15" /></label>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('bakongMerchantPhone')}<input value={form.merchantPhone} onChange={(event) => update('merchantPhone', event.target.value)} className="input mt-2" maxLength="25" /></label>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('bakongStoreLabel')}<input value={form.storeLabel} onChange={(event) => update('storeLabel', event.target.value)} className="input mt-2" maxLength="25" /></label>
          </div></section>
        </div>

        {notice.text && <p className={`mt-5 rounded-2xl px-4 py-3 text-sm font-semibold ${noticeClass}`}>{notice.text}</p>}
        <div className="mt-6 flex flex-wrap gap-3"><button disabled={busy} className="rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-60">{busy ? t('saving') : t('saveBakongSettings')}</button><button type="button" disabled={clearing} onClick={clear} className="rounded-xl border border-red-200 px-5 py-3 text-sm font-bold text-red-700 disabled:opacity-50 dark:border-red-900/60 dark:text-red-300">{clearing ? t('loading') : t('clearBakongSettings')}</button></div>
      </form>

      <aside className="rounded-3xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm dark:border-slate-700 dark:from-emerald-950/30 dark:to-slate-900/70 sm:p-7"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1c8c74] text-2xl text-white shadow-lg">៛</div><h2 className="mt-5 text-xl font-bold text-ink dark:text-white">{t('bakongSettingsActive')}</h2><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{t('bakongSettingsActiveDescription')}</p><div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-950/40"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{t('bakongSettingsSource')}</p><p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{sourceLabel}</p></div><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{t('bakongSettingsAccount')}</p><p className="mt-1 break-all font-mono text-sm text-slate-700 dark:text-slate-200">{settings.accountId || '-'}</p></div><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{t('bakongSettingsToken')}</p><p className="mt-1 break-all font-mono text-sm text-slate-700 dark:text-slate-200">{settings.apiToken || t('bakongSettingsMissing')}</p></div></div></aside>
    </div>
  </>;
}
