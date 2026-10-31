import { useEffect, useState } from 'react';
import api, { unwrap } from '../api/axios';
import Modal from './Modal';
import { useLanguage } from '../context/LanguageContext';

const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh' }).format(new Date());
const formatStamp = (value, language) => value ? new Date(value).toLocaleString(language === 'km' ? 'km-KH' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
const dateTimeInput = (value) => value ? new Date(value).toISOString().slice(0, 16) : '';

export default function TeacherAttendancePanel({ admin = false }) {
  const { language, t } = useLanguage();
  const [date, setDate] = useState(todayKey);
  const [rows, setRows] = useState([]);
  const [record, setRecord] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({ attendanceDate: date, status: 'PRESENT', checkInAt: '', checkOutAt: '', note: '' });
  const [meetingTarget, setMeetingTarget] = useState(null);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [telegramSettings, setTelegramSettings] = useState(null);
  const [telegramForm, setTelegramForm] = useState({ botToken: '', chatId: '', enabled: true });
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState({ type: '', text: '' });

  const load = async () => {
    setError('');
    try {
      const response = admin
        ? await api.get('/attendance/teachers', { params: { date } })
        : await api.get('/attendance/teacher/me', { params: { date } });
      const data = unwrap(response);
      if (admin) setRows(Array.isArray(data) ? data : []);
      else setRecord(data || null);
    } catch (e) {
      setError(e.response?.data?.message || t('teacherAttendanceLoadError'));
      if (admin) setRows([]); else setRecord(null);
    }
  };

  useEffect(() => { load(); }, [admin, date]);

  useEffect(() => {
    if (admin) return undefined;
    api.get('/attendance/teacher/telegram').then((response) => {
      const data = unwrap(response);
      setTelegramSettings(data);
      setTelegramForm((current) => ({ ...current, chatId: data.chatId || '', enabled: data.enabled !== false }));
    }).catch(() => setTelegramSettings({ configured: false, enabled: true, botToken: '', chatId: '' }));
    return undefined;
  }, [admin]);

  const action = async (teacherId, type, payload = {}) => {
    const key = `${teacherId || 'me'}:${type}`;
    setBusy(key);
    setError('');
    try {
      const endpoint = admin ? `/attendance/teachers/${teacherId}/${type}` : `/attendance/teacher/${type}`;
      await api.post(endpoint, admin ? { date, ...payload } : payload);
      await load();
      return true;
    } catch (e) {
      setError(e.response?.data?.message || t('teacherAttendanceActionError'));
      return false;
    } finally {
      setBusy('');
    }
  };

  const openCheckIn = (teacherId = null) => { setMeetingTarget({ teacherId }); setMeetingUrl(''); setError(''); };
  const submitCheckIn = async (event) => {
    event.preventDefault();
    if (!meetingTarget) return;
    if (await action(meetingTarget.teacherId, 'check-in', { meetingUrl })) setMeetingTarget(null);
  };

  const saveTelegram = async (event) => {
    event.preventDefault(); setTelegramBusy(true); setTelegramMessage({ type: '', text: '' });
    try {
      const response = await api.patch('/attendance/teacher/telegram', { botToken: telegramForm.botToken || undefined, chatId: telegramForm.chatId, enabled: telegramForm.enabled });
      const data = unwrap(response); setTelegramSettings(data); setTelegramForm((current) => ({ ...current, botToken: '' })); setTelegramMessage({ type: 'success', text: 'Telegram group settings saved.' });
    } catch (e) { setTelegramMessage({ type: 'error', text: e.response?.data?.message || 'Could not save Telegram settings.' }); } finally { setTelegramBusy(false); }
  };
  const testTelegram = async () => {
    setTelegramBusy(true); setTelegramMessage({ type: '', text: '' });
    try { await api.post('/attendance/teacher/telegram/test'); setTelegramMessage({ type: 'success', text: 'Telegram test message sent.' }); } catch (e) { setTelegramMessage({ type: 'error', text: e.response?.data?.message || 'Telegram test failed.' }); } finally { setTelegramBusy(false); }
  };

  const openEdit = (row) => {
    setEditingRow(row);
    setEditForm({
      attendanceDate: date,
      status: row.attendance?.status || 'PRESENT',
      checkInAt: dateTimeInput(row.attendance?.checkInAt),
      checkOutAt: dateTimeInput(row.attendance?.checkOutAt),
      note: row.attendance?.note || '',
    });
    setError('');
  };

  const closeEdit = () => setEditingRow(null);

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editingRow) return;
    if (editForm.checkInAt && editForm.checkOutAt && new Date(editForm.checkOutAt) < new Date(editForm.checkInAt)) {
      setError(language === 'km' ? 'ពេលចេញត្រូវតែបន្ទាប់ពីពេលចូល។' : 'Check-out time must be after check-in time.');
      return;
    }
    setBusy(`edit:${editingRow.id}`);
    setError('');
    try {
      await api.patch(`/attendance/teachers/${editingRow.id}`, {
        attendanceDate: editForm.attendanceDate,
        status: editForm.status,
        checkInAt: editForm.checkInAt ? new Date(editForm.checkInAt).toISOString() : null,
        checkOutAt: editForm.checkOutAt ? new Date(editForm.checkOutAt).toISOString() : null,
        note: editForm.note || null,
      });
      const targetDate = editForm.attendanceDate;
      closeEdit();
      if (targetDate !== date) setDate(targetDate);
      else await load();
    } catch (e) {
      setError(e.response?.data?.message || t('teacherAttendanceActionError'));
    } finally {
      setBusy('');
    }
  };

  const filteredRows = rows.filter((row) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [row.user?.fullName, row.user?.email, row.teacherCode].some((value) => String(value || '').toLowerCase().includes(query));
  });

  return <section className="relative isolate mb-6 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-gradient-to-br from-white via-[#f7fbff] to-[#effaf6] p-4 shadow-[0_20px_55px_rgba(16,36,63,.08)] dark:border-slate-700/80 dark:from-[#121f35] dark:via-[#101c31] dark:to-emerald-950/20 sm:p-6 lg:p-7">
    <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#8de4ca]/20 blur-3xl dark:bg-[#8de4ca]/10" />
    <div className="pointer-events-none absolute -bottom-32 -left-20 h-56 w-56 rounded-full bg-[#7c8cf8]/10 blur-3xl" />
    <div className="relative">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#10243f] text-xl text-[#a5f1dc] shadow-lg shadow-[#10243f]/15 dark:bg-[#229ed9] dark:text-white" aria-hidden="true">✓</span>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.2em] text-coral">{t('attendance')}</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-ink dark:text-white">{admin ? t('teacherAttendanceManagement') : t('teacherAttendanceTitle')}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{admin ? t('teacherAttendanceManagementDescription') : t('teacherAttendanceTodayDescription')}</p>
          </div>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[34rem]">
          {admin && <label className="group flex w-full flex-col gap-1.5 rounded-[1.25rem] border border-slate-200/80 bg-white/80 px-3.5 py-2.5 text-slate-500 shadow-[0_8px_22px_rgba(16,36,63,.06)] backdrop-blur transition focus-within:border-[#229ed9] focus-within:ring-4 focus-within:ring-[#229ed9]/10 dark:border-slate-700 dark:bg-slate-900/55 dark:text-slate-300">
            <span className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400 dark:text-slate-500">{t('searchTeachers')}</span>
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-[#2185a8]" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} className="input min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-black text-ink shadow-none focus:ring-0 dark:text-white" placeholder={t('searchTeachersPlaceholder')} aria-label={t('searchTeachers')} />
            </span>
          </label>}
          <label className="group flex w-full flex-col gap-1.5 rounded-[1.25rem] border border-slate-200/80 bg-white/80 px-3.5 py-2.5 text-slate-500 shadow-[0_8px_22px_rgba(16,36,63,.06)] backdrop-blur transition focus-within:border-[#229ed9] focus-within:ring-4 focus-within:ring-[#229ed9]/10 dark:border-slate-700 dark:bg-slate-900/55 dark:text-slate-300">
            <span className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400 dark:text-slate-500">{t('attendanceDate')}</span>
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-[#2185a8]" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="input min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-black text-ink shadow-none focus:ring-0 dark:text-white" />
            </span>
          </label>
        </div>
      </div>
      {error && <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"><span className="font-black">!</span><p>{error}</p></div>}
      {admin ? <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredRows.length ? filteredRows.map((row) => <TeacherRow key={row.id} row={row} busy={busy} date={date} onAction={action} onCheckIn={() => openCheckIn(row.id)} onEdit={openEdit} language={language} t={t} />) : <p className="rounded-2xl border border-dashed border-slate-300 bg-white/40 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/20 dark:text-slate-400 md:col-span-2 xl:col-span-3">{search.trim() ? t('noTeachersMatchSearch') : t('noTeachersForAttendance')}</p>}
      </div> : <><SelfAttendance record={record} busy={busy} onAction={action} onCheckIn={() => openCheckIn()} language={language} t={t} />{telegramSettings && <TeacherTelegramCard settings={telegramSettings} form={telegramForm} setForm={setTelegramForm} onSave={saveTelegram} onTest={testTelegram} busy={telegramBusy} message={telegramMessage} />}</>}
    </div>
    {admin && <Modal open={Boolean(editingRow)} title={editingRow ? `${t('editAttendance')} · ${editingRow.user?.fullName || ''}` : t('editAttendance')} onClose={closeEdit}>
      <form onSubmit={saveEdit} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-600 dark:text-slate-300"><span>{t('attendanceDate')}</span><input required type="date" value={editForm.attendanceDate} className="input mt-2" onChange={(event) => setEditForm({ ...editForm, attendanceDate: event.target.value })} /></label>
        <label className="text-sm font-bold text-slate-600 dark:text-slate-300"><span>{t('status')}</span><select value={editForm.status} className="input mt-2" onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}><option value="PRESENT">{t('present')}</option><option value="ABSENT">{t('absent')}</option><option value="LATE">{t('late')}</option><option value="EXCUSED">{t('excused')}</option></select></label>
        <label className="text-sm font-bold text-slate-600 dark:text-slate-300"><span>{t('checkIn')}</span><input type="datetime-local" value={editForm.checkInAt} className="input mt-2" onChange={(event) => setEditForm({ ...editForm, checkInAt: event.target.value })} /></label>
        <label className="text-sm font-bold text-slate-600 dark:text-slate-300"><span>{t('checkOut')}</span><input type="datetime-local" value={editForm.checkOutAt} className="input mt-2" onChange={(event) => setEditForm({ ...editForm, checkOutAt: event.target.value })} /></label>
        <label className="text-sm font-bold text-slate-600 dark:text-slate-300 sm:col-span-2"><span>{t('noteOptional')}</span><textarea rows="3" value={editForm.note} className="input mt-2" placeholder={t('noteOptional')} onChange={(event) => setEditForm({ ...editForm, note: event.target.value })} /></label>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-300 sm:col-span-2">{error}</p>}
        <button disabled={busy === `edit:${editingRow?.id}`} className="w-full rounded-xl bg-navy py-3.5 font-semibold text-white shadow-lg transition hover:bg-[#1b3b5d] disabled:opacity-60 sm:col-span-2">{busy === `edit:${editingRow?.id}` ? t('saving') : t('saveChanges')}</button>
      </form>
    </Modal>}
    <Modal open={Boolean(meetingTarget)} title="Start Google Meet class" onClose={() => setMeetingTarget(null)}>
      <form onSubmit={submitCheckIn} className="space-y-4">
        <p className="rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-sky-800 dark:bg-sky-950/30 dark:text-sky-200">Paste the Google Meet link. It will be sent to the teacher's Telegram group when check-in is saved.</p>
        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300">Google Meet link<input required type="url" value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} className="input mt-2" placeholder="https://meet.google.com/abc-defg-hij" pattern="https://meet\\.google\\.com/.+" /></label>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
        <button disabled={Boolean(busy)} className="w-full rounded-xl bg-navy py-3.5 font-semibold text-white shadow-lg disabled:opacity-60">{busy ? t('saving') : 'Check in and send Meet link'}</button>
      </form>
    </Modal>
  </section>;
}

function TeacherRow({ row, busy, date, onAction, onCheckIn, onEdit, language, t }) {
  const attendance = row.attendance;
  const checkedIn = Boolean(attendance?.checkInAt);
  const checkedOut = Boolean(attendance?.checkOutAt);
  const state = checkedOut ? 'complete' : checkedIn ? 'active' : 'idle';
  const stateLabel = checkedOut ? t('checkedOut') : checkedIn ? t('checkedIn') : t('notCheckedIn');
  return <article className="group relative overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white/85 p-4 shadow-[0_10px_28px_rgba(16,36,63,.05)] transition duration-300 hover:-translate-y-1 hover:border-[#8de4ca] hover:shadow-[0_18px_38px_rgba(16,36,63,.12)] dark:border-slate-700/80 dark:bg-slate-900/55">
    <div className={`absolute inset-x-0 top-0 h-1 ${state === 'complete' ? 'bg-emerald-400' : state === 'active' ? 'bg-amber-400' : 'bg-slate-300 dark:bg-slate-600'}`} />
    <div className="flex items-start justify-between gap-3 pt-1">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10243f] to-[#2185a8] text-xs font-black text-[#a5f1dc] shadow-md dark:from-[#229ed9] dark:to-[#176d8b] dark:text-white">{initials(row.user?.fullName)}</span>
        <div className="min-w-0"><h3 className="truncate font-black text-ink dark:text-white">{row.user?.fullName || '-'}</h3><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{row.teacherCode} · {row.user?.email || '-'}</p></div>
      </div>
      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-black ${state === 'complete' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : state === 'active' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}><i className={`h-1.5 w-1.5 rounded-full ${state === 'complete' ? 'bg-emerald-500' : state === 'active' ? 'bg-amber-500' : 'bg-slate-400'}`} />{stateLabel}</span>
    </div>
    <div className="mt-5 grid grid-cols-2 gap-2">
      <TimeCard label={t('checkIn')} value={formatStamp(attendance?.checkInAt, language)} active={checkedIn} />
      <TimeCard label={t('checkOut')} value={formatStamp(attendance?.checkOutAt, language)} active={checkedOut} />
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2">
      <button type="button" disabled={Boolean(busy) || checkedIn} onClick={onCheckIn} className="rounded-xl bg-[#2185a8] px-3 py-3 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#176d8b] hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none dark:disabled:bg-slate-800 dark:disabled:text-slate-500">{busy === `${row.id}:check-in` ? t('saving') : t('checkIn')}</button>
      <button type="button" disabled={Boolean(busy) || !checkedIn || checkedOut} onClick={() => onAction(row.id, 'check-out')} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-[#8de4ca] hover:bg-[#effcf7] disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 dark:disabled:border-slate-800 dark:disabled:bg-slate-900 dark:disabled:text-slate-600">{busy === `${row.id}:check-out` ? t('saving') : t('checkOut')}</button>
    </div>
    <button type="button" disabled={Boolean(busy)} onClick={() => onEdit(row)} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-600 transition hover:-translate-y-0.5 hover:border-[#229ed9] hover:bg-[#e8f5fb] hover:text-[#17624e] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:border-[#8de4ca] dark:hover:bg-[#173f42] dark:hover:text-[#a5f1dc]"><span aria-hidden="true">✎</span>{t('edit')}</button>
    <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-400 dark:border-slate-800">{t('attendanceDate')}: <span className="text-slate-500 dark:text-slate-300">{date}</span></p>
    {attendance?.meetingUrl && <a href={attendance.meetingUrl} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs font-bold text-sky-700 hover:underline dark:text-sky-300">{attendance.meetingActive ? '🟢 Open active Google Meet' : 'Meeting ended — open link'}</a>}
  </article>;
}

function TimeCard({ label, value, active }) {
  return <div className={`rounded-2xl border p-3 ${active ? 'border-emerald-100 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20' : 'border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/70'}`}><p className="text-[11px] font-bold text-slate-400">{label}</p><p className={`mt-1 truncate text-xs font-black ${active ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}>{value}</p></div>;
}

function SelfAttendance({ record, busy, onAction, onCheckIn, language, t }) {
  const checkedIn = Boolean(record?.checkInAt);
  const checkedOut = Boolean(record?.checkOutAt);
  return <div className="mt-6 rounded-[1.35rem] border border-slate-200/80 bg-white/75 p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/50 sm:p-5"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><span className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${checkedOut ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : checkedIn ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>{checkedOut ? t('attendanceComplete') : checkedIn ? t('attendanceInProgress') : t('readyToCheckIn')}</span><div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:flex sm:gap-8"><span className="text-slate-500 dark:text-slate-400">{t('checkIn')}: <strong className="ml-1 text-ink dark:text-white">{formatStamp(record?.checkInAt, language)}</strong></span><span className="text-slate-500 dark:text-slate-400">{t('checkOut')}: <strong className="ml-1 text-ink dark:text-white">{formatStamp(record?.checkOutAt, language)}</strong></span></div>{record?.meetingUrl && <a href={record.meetingUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-bold text-sky-700 hover:underline dark:text-sky-300">{record.meetingActive ? '🟢 Open active Google Meet' : 'Meeting ended — open link'}</a>}</div><div className="grid grid-cols-2 gap-2 lg:min-w-[16rem]"><button type="button" disabled={Boolean(busy) || checkedIn} onClick={onCheckIn} className="rounded-xl bg-[#2185a8] px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#176d8b] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500">{busy === 'me:check-in' ? t('saving') : t('checkIn')}</button><button type="button" disabled={Boolean(busy) || !checkedIn || checkedOut} onClick={() => onAction(null, 'check-out')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-[#8de4ca] hover:bg-[#effcf7] disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 dark:disabled:border-slate-800 dark:disabled:bg-slate-900 dark:disabled:text-slate-600">{busy === 'me:check-out' ? t('saving') : t('checkOut')}</button></div></div></div>;
}

function TeacherTelegramCard({ settings, form, setForm, onSave, onTest, busy, message }) {
  return <div className="mt-4 rounded-[1.35rem] border border-slate-200/80 bg-white/75 p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/50 sm:p-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-coral">Telegram class group</p><h3 className="mt-1 text-lg font-black text-ink dark:text-white">Send Google Meet alerts to your group</h3><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Use a bot added as an administrator in your Telegram group.</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${settings.configured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{settings.configured ? 'Configured' : 'Not configured'}</span></div>
    <form onSubmit={onSave} className="mt-4 grid gap-3 md:grid-cols-2"><label className="text-sm font-bold text-slate-600 dark:text-slate-300">Bot token<input type="password" autoComplete="new-password" value={form.botToken} onChange={(event) => setForm({ ...form, botToken: event.target.value })} className="input mt-2" placeholder={settings.botToken || 'Paste token from BotFather'} /></label><label className="text-sm font-bold text-slate-600 dark:text-slate-300">Telegram group Chat ID<input value={form.chatId} onChange={(event) => setForm({ ...form, chatId: event.target.value })} className="input mt-2" placeholder="-1001234567890" /></label><label className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-300 md:col-span-2"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} className="h-4 w-4 accent-[#1e9bd7]" /> Enable check-in and check-out Telegram alerts</label>{message.text && <p className={`rounded-xl p-3 text-sm font-semibold md:col-span-2 ${message.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>{message.text}</p>}<div className="flex flex-wrap gap-2 md:col-span-2"><button disabled={busy} className="rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Saving...' : 'Save Telegram settings'}</button><button type="button" disabled={busy || !settings.configured} onClick={onTest} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300">Send test</button></div></form>
  </div>;
}
