import { useEffect, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import ModulePage from '../components/ModulePage';
import apiClient from '../api/axios';
import { usePermission } from '../hooks/usePermission';
import type { Permission, ValidationErrors } from '../types';

export default function Permissions() {
  const { hasPermission } = usePermission();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const loadPermissions = async (query = search) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get<Permission[]>('/api/permissions', {
        params: query ? { search: query } : {},
      });
      setPermissions(response.data);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Unable to load permissions.');
      } else {
        setError('Unable to load permissions.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPermissions(search);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const closeModal = () => {
    setIsCreating(false);
    setEditingPermission(null);
    setName('');
    setFieldErrors({});
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    setSubmitting(true);
    try {
      if (editingPermission) {
        await apiClient.put(`/api/permissions/${editingPermission.id}`, { name });
      } else {
        await apiClient.post('/api/permissions', { name });
      }
      closeModal();
      await loadPermissions();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        setFieldErrors((err.response.data as { errors?: ValidationErrors }).errors ?? {});
      } else if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setFieldErrors({ form: [typeof message === 'string' ? message : 'Unable to save permission.'] });
      } else {
        setFieldErrors({ form: ['Unable to save permission.'] });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (permission: Permission) => {
    if (!window.confirm(`Are you sure you want to delete the "${permission.name}" permission? It will be removed from every role.`)) {
      return;
    }
    try {
      await apiClient.delete(`/api/permissions/${permission.id}`);
      await loadPermissions();
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Unable to delete permission.');
      }
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString();
  };

  return (
    <ModulePage
      title="Permissions"
      description="Manage fine-grained access permissions."
      action={hasPermission('permissions.create') ? (
        <button
          type="button"
          onClick={() => {
            setFieldErrors({});
            setName('');
            setEditingPermission(null);
            setIsCreating(true);
          }}
          className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
        >
          Add New Permission
        </button>
      ) : undefined}
    >
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search permissions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input w-full max-w-xs"
        />
      </div>

      {loading && <div className="py-8 text-sm text-center text-gray-500">Loading permissions…</div>}
      {!loading && error && <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{error}</div>}

      {!loading && !error && (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-x-auto">
          <table className="table-auto w-full">
            <thead className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="p-2"><div className="font-semibold text-left">Name</div></th>
                <th className="p-2"><div className="font-semibold text-left">Roles</div></th>
                <th className="p-2"><div className="font-semibold text-left">Created</div></th>
                <th className="p-2"><div className="font-semibold text-right">Actions</div></th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-700/60">
              {permissions.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-500">No permissions found.</td>
                </tr>
              )}
              {permissions.map((permission) => (
                <tr key={permission.id}>
                  <td className="p-2 font-medium text-gray-800 dark:text-gray-100">{permission.name}</td>
                  <td className="p-2 text-gray-600 dark:text-gray-300">{permission.roles_count}</td>
                  <td className="p-2 text-gray-600 dark:text-gray-300">{formatDate(permission.created_at)}</td>
                  <td className="p-2 text-right whitespace-nowrap space-x-3">
                    {hasPermission('permissions.edit') && (
                      <button
                        type="button"
                        onClick={() => {
                          setFieldErrors({});
                          setEditingPermission(permission);
                          setIsCreating(false);
                          setName(permission.name);
                        }}
                        className="text-sm font-medium text-violet-500 hover:text-violet-600"
                      >
                        Edit
                      </button>
                    )}
                    {hasPermission('permissions.delete') && (
                      <button
                        type="button"
                        onClick={() => { void handleDelete(permission); }}
                        className="text-sm font-medium text-red-500 hover:text-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(isCreating || editingPermission) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {editingPermission ? 'Edit Permission' : 'Create New Permission'}
            </h3>
            {fieldErrors.form && (
              <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{fieldErrors.form[0]}</div>
            )}
            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="permission-name">Name</label>
                <input
                  id="permission-name"
                  className="form-input w-full"
                  placeholder="e.g. invoices.view"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                {editingPermission && (
                  <p className="mt-1 text-xs text-amber-600">
                    Renaming a permission the app checks for (like users.view) will break that check.
                  </p>
                )}
                {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name[0]}</p>}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn border-gray-200 dark:border-gray-700/60 text-gray-600 dark:text-gray-300">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 disabled:opacity-60">
                  {submitting ? 'Saving…' : editingPermission ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ModulePage>
  );
}
