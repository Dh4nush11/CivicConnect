import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  approveManagedUser,
  changeManagedUserRole,
  createManagedUser,
  deleteManagedAccount,
  getAdminUsers,
  getAuditLog,
  setManagedUserSuspension,
} from '../services/adminService';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Form';
import ConfirmDialog from '../components/ConfirmDialog';

const EMPTY_FORM = { name: '', email: '', password: '', role: 'officer' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [reasons, setReasons] = useState({});
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showError, showSuccess } = useToast();

  const refresh = async () => {
    try {
      setLoading(true);
      const [usersResult, auditResult] = await Promise.all([getAdminUsers(), getAuditLog()]);
      setUsers(usersResult.data.users);
      setAuditLogs(auditResult.data.logs);
    } catch (error) {
      showError(error.message || 'Unable to load users and audit history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const createUser = async (event) => {
    event.preventDefault();
    try {
      await createManagedUser(form);
      setForm(EMPTY_FORM);
      showSuccess(form.role === 'officer' ? 'Officer account created. Sign-in details were emailed.' : 'Citizen account created.');
      await refresh();
    } catch (error) {
      showError(error.message || 'Unable to create the account.');
    }
  };

  const runAction = async (action, successMessage) => {
    try {
      await action();
      showSuccess(successMessage);
      await refresh();
    } catch (error) {
      showError(error.message || 'Unable to complete that action.');
    }
  };

  const visibleUsers = users.filter((account) => {
    const matchesRole = roleFilter === 'all' || account.role === roleFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [
      account.name,
      account.email,
      account._id,
    ].some((value) => String(value || '').toLowerCase().includes(term));
    return matchesRole && matchesSearch;
  });
  const citizenCount = users.filter((account) => account.role === 'citizen').length;
  const officerCount = users.filter((account) => account.role === 'officer').length;

  const confirmDeleteAccount = async () => {
    if (!deleteTarget) return;
    const reason = reasons[deleteTarget._id] || '';
    try {
      setDeleting(true);
      const result = await deleteManagedAccount(deleteTarget._id, reason);
      setDeleteTarget(null);
      showSuccess(result.message || 'Account deleted.');
      await refresh();
    } catch (error) {
      showError(error.message || 'Unable to delete the account.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display text-brand-900 dark:text-paper-100">User management</h1>
          <p className="text-sm text-paper-600 dark:text-paper-400">Only administrators can provision municipal officer accounts. Officer sign-in details are emailed to the address provided.</p>
        </div>
        <Link to="/admin"><Button variant="secondary">Back to dashboard</Button></Link>
      </header>

      <form onSubmit={createUser} className="surface grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
        <Input label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <Input label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        <label className="label">Role
          <select className="input-base block w-full mt-1.5" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value, password: '' })}>
            <option value="citizen">Citizen</option>
            <option value="officer">Municipal Officer</option>
          </select>
        </label>
        {form.role === 'citizen'
          ? <Input label="Initial password" type="password" minLength={6} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          : <p className="text-xs text-paper-600 dark:text-paper-400">A secure temporary password will be generated and sent by email. SMTP must be configured.</p>}
        <Button type="submit">Create account</Button>
      </form>

      <section className="surface overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-brand-900 dark:text-paper-100">Accounts</h2>
            <p className="text-xs text-paper-600 dark:text-paper-400">
              {users.length} total · {citizenCount} citizens · {officerCount} municipal officers
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="input-base"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email or ID"
              aria-label="Search users by name, email, or ID"
            />
            <select className="input-base" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter users by role">
              <option value="all">All roles</option>
              <option value="citizen">Citizens ({citizenCount})</option>
              <option value="officer">Municipal officers ({officerCount})</option>
              <option value="admin">Admins ({users.length - citizenCount - officerCount})</option>
            </select>
          </div>
        </div>
        {loading ? <p>Loading accounts…</p> : (
          <table className="w-full min-w-[1050px] text-sm">
            <thead><tr className="text-left border-b border-paper-200 dark:border-white/10">
              <th className="p-2">Name / email / account ID</th><th className="p-2">Role / status</th><th className="p-2">Action reason</th><th className="p-2">Actions</th>
            </tr></thead>
            <tbody>{visibleUsers.map((account) => (
              <tr key={account._id} className="border-b border-paper-100 dark:border-white/5 align-top">
                <td className="p-2">
                  <strong>{account.name}</strong><br />{account.email}
                  <code className="block mt-1 text-[11px] text-paper-500 dark:text-paper-400 select-all">{account._id}</code>
                </td>
                <td className="p-2 capitalize">{account.role} · {account.approvalStatus}{!account.isActive ? ` · suspended (${account.suspensionReason})` : ''}</td>
                <td className="p-2">
                  <input
                    className="input-base w-56"
                    value={reasons[account._id] || ''}
                    onChange={(event) => setReasons({ ...reasons, [account._id]: event.target.value })}
                    placeholder="Required reason"
                  />
                </td>
                <td className="p-2 flex gap-2 flex-wrap">
                  {account.role === 'officer' && account.approvalStatus === 'pending' && (
                    <Button size="sm" onClick={() => runAction(() => approveManagedUser(account._id, reasons[account._id] || ''), 'Officer approved.')}>Approve</Button>
                  )}
                  {account.email !== 'dhanush11pillai@gmail.com' && (
                    <>
                      <select
                        className="input-base"
                        value={account.role}
                        onChange={(event) => runAction(() => changeManagedUserRole(account._id, event.target.value, reasons[account._id] || ''), 'Role updated.')}
                      >
                        <option value="citizen">Citizen</option><option value="officer">Officer</option><option value="admin">Admin</option>
                      </select>
                      <Button size="sm" variant={account.isActive ? 'danger' : 'secondary'} onClick={() => runAction(
                        () => setManagedUserSuspension(account._id, account.isActive, reasons[account._id] || ''),
                        account.isActive ? 'Account suspended.' : 'Account unsuspended.'
                      )}>{account.isActive ? 'Suspend' : 'Unsuspend'}</Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={!reasons[account._id]?.trim()}
                        onClick={() => setDeleteTarget(account)}
                      >
                        Delete account
                      </Button>
                    </>
                  )}
                  {account.email === 'dhanush11pillai@gmail.com' && (
                    <span
                      className="inline-flex items-center rounded-badge border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200"
                      title="This primary administrator account is protected from deletion and suspension to prevent administrative lockout."
                    >
                      Primary admin — protected
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!visibleUsers.length && <tr><td className="p-4 text-paper-500" colSpan={4}>No accounts match this search/filter.</td></tr>}
            </tbody>
          </table>
        )}
      </section>

      <section className="surface">
        <h2 className="text-lg font-semibold mb-4 text-brand-900 dark:text-paper-100">Recent moderation audit</h2>
        <ul className="space-y-2 text-sm">
          {auditLogs.slice(0, 30).map((entry) => (
            <li key={entry._id} className="border-b border-paper-100 dark:border-white/5 pb-2">
              <strong>{entry.action}</strong> · {entry.actorEmail} · {entry.reason || 'No reason'} · {new Date(entry.createdAt).toLocaleString()}
            </li>
          ))}
          {!auditLogs.length && <li>No moderation actions recorded.</li>}
        </ul>
      </section>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this citizen account?"
        message={deleteTarget
          ? `This permanently deletes ${deleteTarget.name}'s ${deleteTarget.role} account (${deleteTarget.email}), their reports and uploaded photos, their comments, and removes their upvotes. The primary admin account is protected. Enter a reason in the account row before confirming.`
          : ''}
        confirmLabel={deleting ? 'Deleting…' : 'Delete account and reports'}
        onCancel={() => !deleting && setDeleteTarget(null)}
        onConfirm={confirmDeleteAccount}
        danger
      />
    </div>
  );
}
