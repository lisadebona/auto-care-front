import { useEffect, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import ModulePage from '../components/ModulePage';
import { SortHeader, TablePagination } from '../components/TableControls';
import { DeleteButton, EditButton } from '../components/ActionButtons';
import apiClient from '../api/axios';
import { usePermission } from '../hooks/usePermission';
import { useTableControls } from '../hooks/useTableControls';
import type { Role, ValidationErrors } from '../types';
import { formatRoleName } from '../utils/format';

const SUPER_ADMIN_ROLE = 'super-admin';

type RolesResponse = {
  roles: Role[];
  permissions: string[];
};

type RoleForm = {
  name: string;
  permissions: string[];
};

export default function Roles() {
  const { hasPermission } = usePermission();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<RoleForm>({ name: '', permissions: [] });
  const table = useTableControls(roles, {
    name: (role) => formatRoleName(role.name),
    permissions: (role) => role.permissions.length,
    users: (role) => role.users_count,
  });
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const loadRoles = async (query = search) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get<RolesResponse>('/api/roles', {
        params: query ? { search: query } : {},
      });
      setRoles(response.data.roles);
      setPermissions(response.data.permissions);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Unable to load roles.');
      } else {
        setError('Unable to load roles.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRoles(search);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const closeModal = () => {
    setIsCreating(false);
    setEditingRole(null);
    setForm({ name: '', permissions: [] });
    setFieldErrors({});
  };

  const togglePermission = (permission: string) => {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((name) => name !== permission)
        : [...current.permissions, permission],
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    setSubmitting(true);
    try {
      if (editingRole) {
        await apiClient.put(`/api/roles/${editingRole.id}`, form);
      } else {
        await apiClient.post('/api/roles', form);
      }
      closeModal();
      await loadRoles();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        setFieldErrors((err.response.data as { errors?: ValidationErrors }).errors ?? {});
      } else if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setFieldErrors({ form: [typeof message === 'string' ? message : 'Unable to save role.'] });
      } else {
        setFieldErrors({ form: ['Unable to save role.'] });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (!window.confirm(`Are you sure you want to delete the "${formatRoleName(role.name)}" role?`)) {
      return;
    }
    try {
      await apiClient.delete(`/api/roles/${role.id}`);
      await loadRoles();
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Unable to delete role.');
      }
    }
  };

  const isEditingSuperAdmin = editingRole?.name === SUPER_ADMIN_ROLE;

  return (
    <ModulePage
      title="Roles"
      description="Define roles and the permissions they grant."
      action={hasPermission('roles.create') ? (
        <button
          type="button"
          onClick={() => {
            setFieldErrors({});
            setForm({ name: '', permissions: [] });
            setEditingRole(null);
            setIsCreating(true);
          }}
          className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
        >
          Add New Role
        </button>
      ) : undefined}
    >
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search roles..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            table.setPage(1);
          }}
          className="form-input w-full max-w-xs"
        />
      </div>

      {loading && <div className="py-8 text-sm text-center text-gray-500">Loading roles…</div>}
      {!loading && error && <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{error}</div>}

      {!loading && !error && (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-x-auto">
          <table className="table-auto w-full">
            <thead className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="p-2 w-12"><div className="font-semibold text-left">#</div></th>
                <th className="p-2 text-left"><SortHeader label="Name" column="name" table={table} /></th>
                <th className="p-2 text-left"><SortHeader label="Permissions" column="permissions" table={table} /></th>
                <th className="p-2 text-left"><SortHeader label="Users" column="users" table={table} /></th>
                <th className="p-2"><div className="font-semibold text-right">Actions</div></th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-700/60">
              {roles.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">No roles found.</td>
                </tr>
              )}
              {table.pageRows.map((role, index) => (
                <tr key={role.id}>
                  <td className="p-2 text-gray-500 dark:text-gray-400">{table.offset + index + 1}</td>
                  <td className="p-2 font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap">{formatRoleName(role.name)}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.length === 0 && <span className="text-gray-400">None</span>}
                      {role.permissions.map((permission) => (
                        <span key={permission} className="rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-xs px-2 py-0.5">
                          {permission}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-2 text-gray-600 dark:text-gray-300">{role.users_count}</td>
                  <td className="p-2 text-right whitespace-nowrap space-x-1">
                    {hasPermission('roles.edit') && (
                      <EditButton
                        onClick={() => {
                          setFieldErrors({});
                          setEditingRole(role);
                          setIsCreating(false);
                          setForm({ name: role.name, permissions: role.permissions });
                        }}
                      />
                    )}
                    {hasPermission('roles.delete') && role.name !== SUPER_ADMIN_ROLE && (
                      <DeleteButton
                        onClick={() => { void handleDelete(role); }}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <TablePagination table={table} />
        </div>
      )}

      {(isCreating || editingRole) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {editingRole ? 'Edit Role' : 'Create New Role'}
            </h3>
            {fieldErrors.form && (
              <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{fieldErrors.form[0]}</div>
            )}
            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="role-name">Name</label>
                <input
                  id="role-name"
                  className="form-input w-full disabled:opacity-60"
                  value={form.name}
                  disabled={isEditingSuperAdmin}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                {isEditingSuperAdmin && (
                  <p className="mt-1 text-xs text-gray-500">The super-admin role cannot be renamed.</p>
                )}
                {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name[0]}</p>}
              </div>
              <div>
                <span className="block text-sm font-medium mb-2">Permissions</span>
                {permissions.length === 0 ? (
                  <p className="text-xs text-gray-500">No permissions exist yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {permissions.map((permission) => (
                      <label key={permission} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-violet-500"
                          checked={form.permissions.includes(permission)}
                          onChange={() => togglePermission(permission)}
                        />
                        {permission}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn border-gray-200 dark:border-gray-700/60 text-gray-600 dark:text-gray-300">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 disabled:opacity-60">
                  {submitting ? 'Saving…' : editingRole ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ModulePage>
  );
}
