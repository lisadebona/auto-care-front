import { useEffect, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import ModulePage from '../components/ModulePage';
import { SortHeader, TablePagination } from './TableControls';
import apiClient from '../api/axios';
import { usePermission } from '../hooks/usePermission';
import { useTableControls } from '../hooks/useTableControls';
import type { NamedRecord, ValidationErrors } from '../types';

type NamedRecordsPageProps = {
  singular: string;
  plural: string;
  permissionPrefix: string;
  endpoint: string;
  description: string;
};

export default function NamedRecordsPage({
  singular,
  plural,
  permissionPrefix,
  endpoint,
  description,
}: NamedRecordsPageProps) {
  const { hasPermission } = usePermission();
  const [records, setRecords] = useState<NamedRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [editing, setEditing] = useState<NamedRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const table = useTableControls(records, {
    name: (record) => record.name,
    products: (record) => record.products_count ?? 0,
  });

  const loadRecords = async (query = search) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get<NamedRecord[]>(endpoint, {
        params: query ? { search: query } : {},
      });
      setRecords(response.data);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : `Unable to load ${plural.toLowerCase()}.`);
      } else {
        setError(`Unable to load ${plural.toLowerCase()}.`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRecords(search);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const closeModal = () => {
    setIsCreating(false);
    setEditing(null);
    setName('');
    setFieldErrors({});
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    setSubmitting(true);
    try {
      if (editing) {
        await apiClient.put(`${endpoint}/${editing.id}`, { name });
      } else {
        await apiClient.post(endpoint, { name });
      }
      closeModal();
      await loadRecords();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        setFieldErrors((err.response.data as { errors?: ValidationErrors }).errors ?? {});
      } else if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setFieldErrors({ form: [typeof message === 'string' ? message : `Unable to save ${singular.toLowerCase()}.`] });
      } else {
        setFieldErrors({ form: [`Unable to save ${singular.toLowerCase()}.`] });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: NamedRecord) => {
    if (!window.confirm(`Are you sure you want to delete "${record.name}"?`)) {
      return;
    }
    setDeleteError('');
    try {
      await apiClient.delete(`${endpoint}/${record.id}`);
      await loadRecords();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        const errors = (err.response.data as { errors?: ValidationErrors }).errors;
        setDeleteError(errors?.[singular.toLowerCase()]?.[0] ?? 'Unable to delete this record.');
      } else if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setDeleteError(typeof message === 'string' ? message : 'Unable to delete this record.');
      }
    }
  };

  return (
    <ModulePage
      title={plural}
      description={description}
      action={hasPermission(`${permissionPrefix}.create`) ? (
        <button
          type="button"
          onClick={() => {
            setFieldErrors({});
            setName('');
            setEditing(null);
            setIsCreating(true);
          }}
          className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
        >
          Add New {singular}
        </button>
      ) : undefined}
    >
      <div className="mb-4">
        <input
          type="search"
          placeholder={`Search ${plural.toLowerCase()}...`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            table.setPage(1);
          }}
          className="form-input w-full max-w-xs"
        />
      </div>

      {deleteError && <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{deleteError}</div>}
      {loading && <div className="py-8 text-sm text-center text-gray-500">Loading {plural.toLowerCase()}…</div>}
      {!loading && error && <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{error}</div>}

      {!loading && !error && (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-x-auto">
          <table className="table-auto w-full">
            <thead className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="p-2 w-12"><div className="font-semibold text-left">#</div></th>
                <th className="p-2 text-left"><SortHeader label="Name" column="name" table={table} /></th>
                <th className="p-2 text-left"><SortHeader label="Products" column="products" table={table} /></th>
                <th className="p-2"><div className="font-semibold text-right">Actions</div></th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-700/60">
              {records.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-500">No {plural.toLowerCase()} found.</td>
                </tr>
              )}
              {table.pageRows.map((record, index) => (
                <tr key={record.id}>
                  <td className="p-2 text-gray-500 dark:text-gray-400">{table.offset + index + 1}</td>
                  <td className="p-2 font-medium text-gray-800 dark:text-gray-100">{record.name}</td>
                  <td className="p-2 text-gray-600 dark:text-gray-300">{record.products_count ?? 0}</td>
                  <td className="p-2 text-right whitespace-nowrap space-x-3">
                    {hasPermission(`${permissionPrefix}.edit`) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFieldErrors({});
                          setEditing(record);
                          setIsCreating(false);
                          setName(record.name);
                        }}
                        className="text-sm font-medium text-violet-500 hover:text-violet-600"
                      >
                        Edit
                      </button>
                    )}
                    {hasPermission(`${permissionPrefix}.delete`) && (
                      <button
                        type="button"
                        onClick={() => { void handleDelete(record); }}
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
          <TablePagination table={table} />
        </div>
      )}

      {(isCreating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {editing ? `Edit ${singular}` : `Create New ${singular}`}
            </h3>
            {fieldErrors.form && (
              <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{fieldErrors.form[0]}</div>
            )}
            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor={`${permissionPrefix}-name`}>Name</label>
                <input
                  id={`${permissionPrefix}-name`}
                  className="form-input w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name[0]}</p>}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn border-gray-200 dark:border-gray-700/60 text-gray-600 dark:text-gray-300">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 disabled:opacity-60">
                  {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ModulePage>
  );
}
