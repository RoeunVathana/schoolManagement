import { useEffect, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import { useLanguage } from '../../context/LanguageContext';
import PasswordInput from '../../components/PasswordInput';

const emptyForm = { botToken: '', chatId: '', enabled: true };
const emptyInvite = { courseId: '', inviteLink: '', audience: 'ALL', message: '' };

const copy = {
  en: {
    access: 'Telegram group access',
    title: 'Send a course-specific group invite',
    description: 'Each course keeps its own Telegram link. Notifications go only to that course teacher and enrolled students.',
    course: 'Course',
    selectCourse: 'Select a course',
    link: 'Telegram invite link',
    sendTo: 'Send to',
    teacherStudents: 'Course teacher and enrolled students',
    teacherOnly: 'Course teacher only',
    studentsOnly: 'Enrolled students only',
    message: 'Message',
    placeholder: 'Please join your course Telegram group for class updates.',
    sending: 'Sending...',
    send: 'Send group invite',
    sent: (count, course) => 'Invite sent to ' + count + ' account(s) for ' + course + '.',
    failed: 'The Telegram invite could not be sent.',
  },
  km: {
    access: '\u1780\u17b6\u179a\u1785\u17bc\u179b\u1780\u17d2\u179a\u17bb\u1798 Telegram',
    title: '\u1795\u17d2\u1789\u17be link \u1780\u17d2\u179a\u17bb\u1798\u179f\u1798\u17d2\u179a\u17b6\u1794\u17cb\u1798\u17bb\u1781\u179c\u17b7\u1787\u17d2\u1787\u17b6\u1787\u17b6\u1780\u17cb\u179b\u17b6\u1780\u17cb',
    description: '\u1798\u17bb\u1781\u179c\u17b7\u1787\u17d2\u1787\u17b6\u1793\u17b8\u1798\u17bd\u1799\u17d7\u1798\u17b6\u1793 Telegram link \u1795\u17d2\u1791\u17b6\u179b\u17cb\u1781\u17d2\u179b\u17bd\u1793\u17d4 \u1780\u17b6\u179a\u1787\u17bc\u1793\u178a\u17c6\u178e\u17b9\u1784\u1793\u17b9\u1784\u1791\u17c5\u178f\u17c2\u1782\u17d2\u179a\u17bc \u1793\u17b7\u1784\u179f\u17b7\u179f\u17d2\u179f\u178a\u17c2\u179b\u1794\u17b6\u1793\u1785\u17bb\u17c7\u1788\u17d2\u1798\u17c4\u17c7\u1780\u17d2\u1793\u17bb\u1784\u1798\u17bb\u1781\u179c\u17b7\u1787\u17d2\u1787\u17b6\u1793\u17c4\u17c7\u17d4',
    course: '\u1798\u17bb\u1781\u179c\u17b7\u1787\u17d2\u1787\u17b6',
    selectCourse: '\u1787\u17d2\u179a\u17be\u179f\u179a\u17be\u179f\u1798\u17bb\u1781\u179c\u17b7\u1787\u17d2\u1787\u17b6',
    link: '\u178f\u17c6\u178e\u17a2\u1789\u17d2\u1787\u17be Telegram',
    sendTo: '\u1795\u17d2\u1789\u17be\u1791\u17c5',
    teacherStudents: '\u1782\u17d2\u179a\u17bc \u1793\u17b7\u1784\u179f\u17b7\u179f\u17d2\u179f\u1780\u17d2\u1793\u17bb\u1784\u1798\u17bb\u1781\u179c\u17b7\u1787\u17d2\u1787\u17b6',
    teacherOnly: '\u1782\u17d2\u179a\u17bc\u1780\u17d2\u1793\u17bb\u1784\u1798\u17bb\u1781\u179c\u17b7\u1787\u17d2\u1787\u17b6\u178f\u17c2\u1794\u17c9\u17bb\u178e\u17d2\u178e\u17c4\u17c7',
    studentsOnly: '\u179f\u17b7\u179f\u17d2\u179f\u178a\u17c2\u179b\u1794\u17b6\u1793\u1785\u17bb\u17c7\u1788\u17d2\u1798\u17c4\u17c7\u178f\u17c2\u1794\u17c9\u17bb\u178e\u17d2\u178e\u17c4\u17c7',
    message: '\u179f\u17b6\u179a',
    placeholder: '\u179f\u17bc\u1798\u1785\u17bc\u179b\u1780\u17d2\u179a\u17bb\u1798 Telegram \u179a\u1794\u179f\u17cb\u1798\u17bb\u1781\u179c\u17b7\u1787\u17d2\u1787\u17b6 \u179f\u1798\u17d2\u179a\u1794\u17cb\u1796\u17d0\u178f\u17cc\u1798\u17b6\u1793\u1790\u17d2\u1793\u17b6\u1780\u17cb\u179a\u17c0\u1793\u17d4',
    sending: '\u1780\u17c6\u1796\u17bb\u1784\u1795\u17d2\u1789\u17be...',
    send: '\u1795\u17d2\u1789\u17be invite \u1780\u17d2\u179a\u17bb\u1798',
    sent: (count, course) => '\u1794\u17b6\u1793\u1795\u17d2\u1789\u17be invite \u1791\u17c5\u1782\u178e\u1793\u17b8 ' + count + ' \u179f\u1798\u17d2\u179a\u17b6\u1794\u17cb ' + course + '\u17d4',
    failed: '\u1798\u17b7\u1793\u17a2\u17b6\u1785\u1795\u17d2\u1789\u17be Telegram invite \u1794\u17b6\u1793\u1791\u17c1\u17d4',
  },
};

export default function TelegramSettings() {
  const { t, language } = useLanguage();
  const text = copy[language] || copy.en;
  const [form, setForm] = useState(emptyForm);
  const [settings, setSettings] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [courses, setCourses] = useState([]);
  const [invite, setInvite] = useState(emptyInvite);
  const [inviteMessage, setInviteMessage] = useState({ type: '', text: '' });
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    api.get('/telegram-settings')
      .then((response) => {
        const data = unwrap(response);
        setSettings(data);
        setForm((current) => ({ ...current, chatId: data.chatId || '', enabled: data.enabled !== false }));
      })
      .catch((error) => setMessage({ type: 'error', text: error.response?.data?.message || t('telegramLoadFailed') }));
    api.get('/courses', { params: { page: 1, limit: 100, status: 'ACTIVE' } })
      .then((response) => setCourses(unwrap(response).data || []))
      .catch(() => setCourses([]));
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

  const sendInvite = async (event) => {
    event.preventDefault();
    setSendingInvite(true);
    setInviteMessage({ type: '', text: '' });
    try {
      const result = unwrap(await api.post('/telegram-settings/group-invite', invite));
      setInviteMessage({ type: 'success', text: text.sent(result.sent, result.course?.courseName || text.selectCourse) });
    } catch (error) {
      setInviteMessage({ type: 'error', text: error.response?.data?.message || text.failed });
    } finally {
      setSendingInvite(false);
    }
  };

  const noticeClass = (notice) => notice.type === 'error'
    ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  const statusClass = settings?.configured
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';

  if (!settings) return <><Header eyebrow="adminTools" title="telegramSettings" description="telegramSettingsDescription" /><Loading /></>;

  return <>
    <Header eyebrow="adminTools" title="telegramSettings" description="telegramSettingsDescription" />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
      <form onSubmit={save} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 sm:p-7">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">Telegram</p><h2 className="mt-2 text-xl font-bold text-ink dark:text-white">{t('telegramPaymentReports')}</h2></div><span className={'rounded-full px-3 py-1.5 text-xs font-bold ' + statusClass}>{settings.configured ? t('telegramConfigured') : t('telegramNotConfigured')}</span></div>
        <div className="space-y-5"><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('telegramBotToken')}<PasswordInput autoComplete="new-password" value={form.botToken} onChange={(event) => setForm({ ...form, botToken: event.target.value })} className="input mt-2" placeholder={settings.botToken || t('telegramTokenPlaceholder')} /><span className="mt-1.5 block text-xs font-normal text-slate-500">{t('telegramTokenHint')}</span></label><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{t('telegramChatId')}<input value={form.chatId} onChange={(event) => setForm({ ...form, chatId: event.target.value })} className="input mt-2" placeholder="5934277627" /><span className="mt-1.5 block text-xs font-normal text-slate-500">{t('telegramChatIdHint')}</span></label><label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} className="h-4 w-4 accent-[#1e9bd7]" />{t('telegramEnabled')}</label></div>
        {message.text && <p className={'mt-5 rounded-2xl px-4 py-3 text-sm font-semibold ' + noticeClass(message)}>{message.text}</p>}
        <div className="mt-6 flex flex-wrap gap-3"><button disabled={busy} className="rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-60">{busy ? t('saving') : t('saveTelegramSettings')}</button><button type="button" disabled={testing || !settings.configured} onClick={test} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200">{testing ? t('loading') : t('testTelegram')}</button></div>
      </form>

      <form onSubmit={sendInvite} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 sm:p-7">
        <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-coral">{text.access}</p><h2 className="mt-2 text-xl font-bold text-ink dark:text-white">{text.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{text.description}</p></div>
        <div className="space-y-4"><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{text.course}<select required value={invite.courseId} onChange={(event) => { const selected = courses.find((course) => course.id === event.target.value); setInvite((current) => ({ ...current, courseId: event.target.value, inviteLink: selected?.telegramGroupLink || '' })); }} className="input mt-2"><option value="">{text.selectCourse}</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.courseCode} - {course.courseName}</option>)}</select></label><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{text.link}<input required type="url" pattern="https://(t\.me|www\.t\.me|telegram\.me|www\.telegram\.me)/.+" value={invite.inviteLink} onChange={(event) => setInvite({ ...invite, inviteLink: event.target.value })} className="input mt-2" placeholder="https://t.me/+course-group-invite" /></label><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{text.sendTo}<select value={invite.audience} onChange={(event) => setInvite({ ...invite, audience: event.target.value })} className="input mt-2"><option value="ALL">{text.teacherStudents}</option><option value="TEACHERS">{text.teacherOnly}</option><option value="STUDENTS">{text.studentsOnly}</option></select></label><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{text.message}<textarea rows="3" maxLength="500" value={invite.message} onChange={(event) => setInvite({ ...invite, message: event.target.value })} className="input mt-2" placeholder={text.placeholder} /></label></div>
        {inviteMessage.text && <p className={'mt-5 rounded-2xl px-4 py-3 text-sm font-semibold ' + noticeClass(inviteMessage)}>{inviteMessage.text}</p>}
        <button disabled={sendingInvite} className="mt-6 rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-60">{sendingInvite ? text.sending : text.send}</button>
      </form>

      <aside className="rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm dark:border-slate-700 dark:from-sky-950/30 dark:to-slate-900/70 sm:p-7"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#229ed9] text-2xl text-white shadow-lg">&gt;</div><h2 className="mt-5 text-xl font-bold text-ink dark:text-white">{t('telegramHelp')}</h2><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{t('telegramHelpDescription')}</p><div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-950/40"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{t('telegramChatId')}</p><p className="mt-2 break-all font-mono text-sm text-slate-700 dark:text-slate-200">{settings.chatId || '-'}</p></div></aside>
    </div>
  </>;
}
