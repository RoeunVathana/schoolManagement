import { useEffect, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import Table from '../../components/Table';
import { useLanguage } from '../../context/LanguageContext';

const permissions = [['canCreate', 'Create'], ['canEdit', 'Edit'], ['canDelete', 'Delete']];
const hasPermission = (user, key) => user.role === 'ADMIN' || user[key] === true;

export default function Users() {
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState('');
  const [notice, setNotice] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [assigningAdmin, setAssigningAdmin] = useState(false);
  const [selectedRoleUser, setSelectedRoleUser] = useState(null);
  const { language, t } = useLanguage();

  const load = (targetPage = page) =>
    api.get('/users', { params: { search, page: targetPage, limit: 10 } })
      .then((response) => setResult(unwrap(response)));

  useEffect(() => { load(page); }, [page]);

  const searchUsers = () => {
    setPage(1);
    load(1);
  };

  const toggle = async (user, key) => {
    if (user.role === 'ADMIN') return;
    setSaving(user.id);
    setNotice('');
    try {
      await api.patch(`/users/${user.id}`, { [key]: !user[key] });
      setNotice(`${user.fullName}'s permissions were updated.`);
      await load(page);
    } catch (error) {
      setNotice(error.response?.data?.message || 'Could not update permissions.');
    } finally {
      setSaving('');
    }
  };

  const assignAdmin = async (event) => {
    event.preventDefault();
    const email = adminEmail.trim().toLowerCase();
    if (!email) {
      setNotice(language === 'km' ? 'សូមបញ្ចូលអ៊ីមែលអ្នកប្រើ។' : 'Enter a user email first.');
      return;
    }
    const confirmed = window.confirm(
      language === 'km'
        ? `ផ្តល់សិទ្ធិអ្នកគ្រប់គ្រងទៅ ${email}?`
        : `Grant administrator access to ${email}?`,
    );
    if (!confirmed) return;

    setAssigningAdmin(true);
    setNotice('');
    try {
      const response = await api.patch('/users/role-by-email', { email, role: 'ADMIN' });
      const user = unwrap(response);
      setAdminEmail('');
      setNotice(
        language === 'km'
          ? `${user.fullName} ឥឡូវនេះជាអ្នកគ្រប់គ្រង។`
          : `${user.fullName} is now an administrator.`,
      );
      await load(page);
    } catch (error) {
      const message = error.response?.data?.message;
      setNotice(
        Array.isArray(message)
          ? message.join(', ')
          : message || (language === 'km' ? 'មិនអាចផ្តល់សិទ្ធិបានទេ។' : 'Could not assign administrator access.'),
      );
    } finally {
      setAssigningAdmin(false);
    }
  };

  const rows = result?.data || [];
  const roleDescription = selectedRoleUser?.role === 'ADMIN'
    ? 'Full system access and management permissions.'
    : selectedRoleUser?.role === 'TEACHER'
      ? 'Manages assigned courses, classes and student work.'
      : 'Can access learning content and submit coursework.';

  return (
    <>
      <Header
        eyebrow="Administration"
        title="Users & permissions"
        description="Control which accounts may create, edit and delete learning records. Administrators always retain full access."
      />

      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <form
          onSubmit={assignAdmin}
          className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20"
        >
          <p className="text-sm font-extrabold text-ink dark:text-white">
            {language === 'km' ? 'ផ្តល់សិទ្ធិអ្នកគ្រប់គ្រង' : 'Assign administrator role'}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {language === 'km'
              ? 'បញ្ចូលអ៊ីមែលគណនីផ្សេងទៀត ដើម្បីផ្តល់សិទ្ធិអ្នកគ្រប់គ្រង។'
              : 'Enter another account email to grant full administrator access.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="email"
              required
              className="input min-w-0 flex-1"
              placeholder={language === 'km' ? 'អ៊ីមែលអ្នកប្រើ' : 'user@example.com'}
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
            />
            <button
              type="submit"
              disabled={assigningAdmin}
              className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {assigningAdmin
                ? (language === 'km' ? 'កំពុងរក្សាទុក...' : 'Assigning...')
                : (language === 'km' ? 'ផ្តល់សិទ្ធិ' : 'Grant admin')}
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <input
            className="input max-w-sm"
            placeholder={language === 'km' ? 'ស្វែងរកអ្នកប្រើ...' : 'Search users...'}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && searchUsers()}
          />
          <button
            onClick={searchUsers}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600"
          >
            {language === 'km' ? 'ស្វែងរក' : 'Search'}
          </button>
          {notice && <span role="status" className="rounded-xl bg-mint px-4 py-3 text-sm text-emerald-800">{notice}</span>}
        </div>
      </div>

      {result ? (
        <>
          <Table
            columns={[
              {
                key: 'name',
                label: 'Account',
                render: (user) => <div><p className="font-semibold text-ink">{user.fullName}</p><p className="text-xs text-slate-400">{user.email}</p></div>,
              },
              {
                key: 'role',
                label: 'Role',
                render: (user) => <button type="button" onClick={() => setSelectedRoleUser(user)} className="badge cursor-pointer bg-slate-100 text-slate-600 transition hover:bg-[#dff6ed] hover:text-emerald-800" title={t('viewDetails')}>{user.role}</button>,
              },
              ...permissions.map(([key, label]) => ({
                key,
                label,
                render: (user) => {
                  const enabled = hasPermission(user, key);
                  return <button disabled={saving === user.id || user.role === 'ADMIN'} onClick={() => toggle(user, key)} className={`relative h-7 w-12 rounded-full transition ${enabled ? 'bg-emerald-500' : 'bg-slate-300'} disabled:cursor-not-allowed disabled:opacity-60`} title={user.role === 'ADMIN' ? 'Administrators always have this permission' : `Toggle ${label}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? 'left-6' : 'left-1'}`} /></button>;
                },
              })),
            ]}
            rows={rows}
            empty="No user accounts found."
          />
          <Pagination value={result.pagination} onChange={setPage} />
        </>
      ) : <Loading />}

      <Modal open={!!selectedRoleUser} title={`${selectedRoleUser?.role || ''} ${t('viewDetails')}`} onClose={() => setSelectedRoleUser(null)}>
        <div className="space-y-4">
          {selectedRoleUser && <>
            <div className="rounded-2xl bg-gradient-to-r from-[#eefaf6] to-[#eef7ff] p-4 dark:from-emerald-950/30 dark:to-indigo-950/30">
              <p className="text-xs font-extrabold uppercase tracking-[.16em] text-coral">{selectedRoleUser.role}</p>
              <h3 className="mt-1 text-xl font-extrabold text-ink dark:text-white">{selectedRoleUser.fullName}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{roleDescription}</p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Email" value={selectedRoleUser.email} />
              <DetailField label="Phone" value={selectedRoleUser.phone} />
              <DetailField label="Status" value={selectedRoleUser.status} />
              <DetailField label="Language" value={selectedRoleUser.language === 'km' ? 'Khmer' : 'English'} />
              <DetailField label="Created" value={selectedRoleUser.createdAt ? new Date(selectedRoleUser.createdAt).toLocaleString(language === 'km' ? 'km-KH' : 'en-US') : '-'} />
              <DetailField label="Last active" value={selectedRoleUser.lastSeenAt ? new Date(selectedRoleUser.lastSeenAt).toLocaleString(language === 'km' ? 'km-KH' : 'en-US') : '-'} />
            </dl>
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-sm font-extrabold text-ink dark:text-white">Permissions</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">{permissions.map(([key, label]) => <div key={key} className={`rounded-xl px-3 py-2 text-center text-xs font-extrabold ${hasPermission(selectedRoleUser, key) ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>{label}: {hasPermission(selectedRoleUser, key) ? 'On' : 'Off'}</div>)}</div>
            </div>
          </>}
        </div>
      </Modal>
    </>
  );
}

function DetailField({ label, value }) {
  return <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/70"><dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-slate-700 dark:text-slate-200">{value || '-'}</dd></div>;
}
