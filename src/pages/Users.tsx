import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { SortHeader, TablePagination } from '../components/TableControls';
import { EditButton } from '../components/ActionButtons';
import apiClient from '../api/axios';
import type { User, ValidationErrors } from '../types';
import { formatRoleName } from '../utils/format';
import { usePermission } from '../hooks/usePermission';
import { useTableControls } from '../hooks/useTableControls';

const TECHNICIAN_ROLE = 'technician';

type UserTab = 'details' | 'rates';

type UserForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  roles: string[];
  hourly_rate: string;
  flat_rate: boolean;
};

const emptyForm = (): UserForm => ({
  name: '',
  email: '',
  phone: '',
  password: '',
  password_confirmation: '',
  roles: [],
  hourly_rate: '',
  flat_rate: false,
});

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm());
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<UserTab>('details');
  const { hasPermission } = usePermission();
  const table = useTableControls(users, {
    name: (user) => user.name,
    email: (user) => user.email,
    phone: (user) => user.phone,
    roles: (user) => (user.roles ?? []).map(formatRoleName).join(', '),
    joined: (user) => (user.created_at ? Date.parse(user.created_at) : null),
  });
  const canAssignRoles = hasPermission('roles.edit');
  const hasTechnicianRole = form.roles.includes(TECHNICIAN_ROLE);
  const showRatesTab = editingUser !== null && hasTechnicianRole;
  const showDetails = !showRatesTab || activeTab === 'details';
  const showLabor = hasTechnicianRole && (editingUser === null || activeTab === 'rates');
  const parsedHourlyRate = Number.parseFloat(form.hourly_rate);
  const exampleHourlyRate = Number.isFinite(parsedHourlyRate) ? parsedHourlyRate : 100;
  const exampleHourlyLabel = form.hourly_rate.trim() === '' ? '100' : form.hourly_rate.replace(/\.00$/, '');
  const exampleLaborCost = (4 * exampleHourlyRate).toFixed(2).replace(/\.00$/, '');

  const loadUsers = useCallback(async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get<User[]>('/api/users', {
        params: query ? { search: query } : {},
      });
      setUsers(response.data);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Unable to load users.');
      } else {
        setError('Unable to load users.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers(search);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [loadUsers, search]);

  useEffect(() => {
    if (!showRatesTab && activeTab === 'rates') {
      setActiveTab('details');
    }
  }, [showRatesTab, activeTab]);

  useEffect(() => {
    if (!canAssignRoles) {
      return;
    }

    const loadRoles = async () => {
      try {
        const response = await apiClient.get<{ roles: Array<{ name: string }> }>('/api/roles');
        setAvailableRoles(response.data.roles.map((role) => role.name));
      } catch {
        setAvailableRoles([]);
      }
    };

    void loadRoles();
  }, [canAssignRoles]);

  const formatDate = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const closeModal = () => {
    setIsCreating(false);
    setEditingUser(null);
    setForm(emptyForm());
    setFieldErrors({});
    setActiveTab('details');
  };

  const openCreate = () => {
    setFieldErrors({});
    setForm(emptyForm());
    setEditingUser(null);
    setIsCreating(true);
  };

  const openEdit = (user: User) => {
    setFieldErrors({});
    setIsCreating(false);
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      password: '',
      password_confirmation: '',
      roles: user.roles ?? [],
      hourly_rate: user.hourly_rate ?? '',
      flat_rate: user.flat_rate ?? false,
    });
    setActiveTab('details');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    setSubmitting(true);

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      password: form.password,
      roles: form.roles,
      hourly_rate: form.hourly_rate === '' ? null : form.hourly_rate,
      flat_rate: form.flat_rate,
      ...(editingUser ? { password_confirmation: form.password_confirmation } : {}),
    };

    try {
      if (editingUser) {
        await apiClient.put(`/api/users/${editingUser.id}`, payload);
      } else {
        await apiClient.post('/api/users', payload);
      }
      closeModal();
      await loadUsers(search);
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        const errors = (err.response.data as { errors?: ValidationErrors }).errors ?? {};
        setFieldErrors(errors);
        if (errors.hourly_rate || errors.flat_rate) {
          setActiveTab('rates');
        }
      } else if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setFieldErrors({ form: [typeof message === 'string' ? message : 'Unable to save user.'] });
      } else {
        setFieldErrors({ form: ['Unable to save user.'] });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const modalOpen = isCreating || editingUser !== null;

  return (
    <DashboardLayout>
      <div className="sm:flex sm:justify-between sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Users</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View and manage people with access to the shop.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
        >
          Add New User
        </button>
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Search by name, email, phone, role..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            table.setPage(1);
          }}
          className="form-input w-full max-w-md"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl">
        <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Users</h2>
        </header>

        <div className="p-3">
          {loading && (
            <div className="px-2 py-8 text-sm text-center text-gray-500 dark:text-gray-400">Loading users…</div>
          )}

          {!loading && error && (
            <div className="mx-2 mb-2 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{error}</div>
          )}

          {!loading && !error && users.length === 0 && (
            <div className="px-2 py-8 text-sm text-center text-gray-500 dark:text-gray-400">No users found.</div>
          )}

          {!loading && !error && users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table-auto w-full">
                <thead className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="p-2 w-12 whitespace-nowrap"><div className="font-semibold text-left">#</div></th>
                    <th className="p-2 whitespace-nowrap text-left"><SortHeader label="Name" column="name" table={table} /></th>
                    <th className="p-2 whitespace-nowrap text-left"><SortHeader label="Email" column="email" table={table} /></th>
                    <th className="p-2 whitespace-nowrap text-left"><SortHeader label="Phone" column="phone" table={table} /></th>
                    <th className="p-2 whitespace-nowrap text-left"><SortHeader label="Roles" column="roles" table={table} /></th>
                    <th className="p-2 whitespace-nowrap text-left"><SortHeader label="Joined" column="joined" table={table} /></th>
                    <th className="p-2 whitespace-nowrap"><div className="font-semibold text-right">Actions</div></th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-700/60">
                  {table.pageRows.map((user, index) => (
                    <tr key={user.id}>
                      <td className="p-2 whitespace-nowrap text-gray-500 dark:text-gray-400">{table.offset + index + 1}</td>
                      <td className="p-2 whitespace-nowrap">
                        <div className="font-medium text-gray-800 dark:text-gray-100">{user.name}</div>
                      </td>
                      <td className="p-2 whitespace-nowrap text-gray-600 dark:text-gray-300">{user.email}</td>
                      <td className="p-2 whitespace-nowrap text-gray-600 dark:text-gray-300">{user.phone || '—'}</td>
                      <td className="p-2 text-gray-600 dark:text-gray-300">
                        {(user.roles ?? []).length === 0 ? '—' : (user.roles ?? []).map(formatRoleName).join(', ')}
                      </td>
                      <td className="p-2 whitespace-nowrap text-gray-600 dark:text-gray-300">{formatDate(user.created_at)}</td>
                      <td className="p-2 whitespace-nowrap text-right">
                        <EditButton
                          onClick={() => openEdit(user)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && <TablePagination table={table} className="-mx-3 -mb-3 mt-3" />}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {editingUser ? 'Edit User' : 'Create New User'}
            </h3>

            {fieldErrors.form && (
              <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{fieldErrors.form[0]}</div>
            )}

            {showRatesTab && (
              <div className="mb-4 flex gap-1 border-b border-gray-200 dark:border-gray-700">
                {(['details', 'rates'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                      activeTab === tab
                        ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    {tab === 'details' ? 'Details' : 'Rates'}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
              {showDetails && (
              <>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="user-name">Name</label>
                <input
                  id="user-name"
                  className="form-input w-full"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name[0]}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="user-email">Email</label>
                <input
                  id="user-email"
                  className="form-input w-full"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
                {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email[0]}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="user-phone">
                  Phone Number <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  id="user-phone"
                  className="form-input w-full"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                {fieldErrors.phone && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone[0]}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="user-password">
                  {editingUser ? 'New Password' : 'Password'}
                </label>
                <input
                  id="user-password"
                  className="form-input w-full"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editingUser}
                />
                {editingUser && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Leave blank to keep the current password.</p>
                )}
                {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password[0]}</p>}
              </div>

              {editingUser && (
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="user-password-confirmation">
                    Confirm New Password
                  </label>
                  <input
                    id="user-password-confirmation"
                    className="form-input w-full"
                    type="password"
                    autoComplete="new-password"
                    value={form.password_confirmation}
                    onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                  />
                </div>
              )}

              {canAssignRoles && (
                <div>
                  <span className="block text-sm font-medium mb-2">Roles</span>
                  {availableRoles.length === 0 ? (
                    <p className="text-xs text-gray-500">No roles exist yet.</p>
                  ) : editingUser ? (
                    <div className="grid grid-cols-2 gap-2">
                      {availableRoles.map((role) => (
                        <label key={role} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-violet-500"
                            checked={form.roles.includes(role)}
                            onChange={() => setForm((current) => ({
                              ...current,
                              roles: current.roles.includes(role)
                                ? current.roles.filter((name) => name !== role)
                                : [...current.roles, role],
                            }))}
                          />
                          {formatRoleName(role)}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <select
                      className="form-select w-full"
                      value={form.roles[0] ?? ''}
                      onChange={(e) => setForm({ ...form, roles: e.target.value ? [e.target.value] : [] })}
                    >
                      <option value="">No role</option>
                      {availableRoles.map((role) => (
                        <option key={role} value={role}>{formatRoleName(role)}</option>
                      ))}
                    </select>
                  )}
                  {fieldErrors.roles && <p className="mt-1 text-xs text-red-500">{fieldErrors.roles[0]}</p>}
                </div>
              )}
              </>
              )}

              {showLabor && (
                <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                  <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100">Labor</h4>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    This is used in time tracking reports to track labor cost.
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <label htmlFor="hourly-rate" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                      <svg className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <circle cx="12" cy="12" r="8" />
                        <path d="M12 8v4l2.5 2" strokeLinecap="round" />
                      </svg>
                      Hourly Rate
                    </label>
                    <div className="relative w-36">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-400">$</span>
                      <input
                        id="hourly-rate"
                        className="form-input w-full pl-7 text-right"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={form.hourly_rate}
                        onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
                      />
                    </div>
                  </div>
                  {fieldErrors.hourly_rate && <p className="mt-1 text-xs text-red-500">{fieldErrors.hourly_rate[0]}</p>}

                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                        <svg className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <path d="M12 3v18" strokeLinecap="round" />
                          <path d="M16.5 7.5c0-1.5-1.8-2.5-4.5-2.5s-4.5 1-4.5 2.5 1.8 2.5 4.5 2.5 4.5 1 4.5 2.5-1.8 2.5-4.5 2.5-4.5-1-4.5-2.5" strokeLinecap="round" />
                        </svg>
                        Flat Rate
                        <span
                          title="When enabled, labor cost is calculated from the hourly rate and quoted hours."
                          className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] text-gray-400"
                        >
                          i
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Auto calculate labor cost based on this person&apos;s hourly rate and the quoted hours.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.flat_rate}
                      aria-label="Flat Rate"
                      onClick={() => setForm({ ...form, flat_rate: !form.flat_rate })}
                      className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition ${form.flat_rate ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition ${form.flat_rate ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  {fieldErrors.flat_rate && <p className="mt-1 text-xs text-red-500">{fieldErrors.flat_rate[0]}</p>}

                  {form.flat_rate && (
                    <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                      <span className="font-semibold">Example.</span>{' '}
                      If labor is quoted at 4 hours and this person&apos;s hourly rate is ${exampleHourlyLabel}/hr, the labor cost would be automatically calculated at ${exampleLaborCost}.
                    </div>
                  )}
                </section>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 text-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:opacity-60"
                >
                  {submitting ? 'Saving…' : editingUser ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
