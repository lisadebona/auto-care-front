import { useEffect, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import ModulePage from '../components/ModulePage';
import { SortHeader, TablePagination } from '../components/TableControls';
import { DeleteButton, EditButton } from '../components/ActionButtons';
import apiClient from '../api/axios';
import { usePermission } from '../hooks/usePermission';
import { useTableControls } from '../hooks/useTableControls';
import type { ValidationErrors } from '../types';

type CustomWorkflow = {
  id: number;
  name: string;
  value: string;
};

export default function Miscellaneous() {
  const { hasPermission } = usePermission();
  const [workflows, setWorkflows] = useState<CustomWorkflow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [editing, setEditing] = useState<CustomWorkflow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const table = useTableControls(workflows, {
    name: (workflow) => workflow.name,
  });

  const loadWorkflows = async (query = search) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get<CustomWorkflow[]>('/api/workflows', {
        params: query ? { search: query } : {},
      });
      setWorkflows(response.data);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Unable to load workflows.');
      } else {
        setError('Unable to load workflows.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorkflows(search);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const closeModal = () => {
    setIsCreating(false);
    setEditing(null);
    setName('');
    setFieldErrors({});
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setSubmitting(true);

    try {
      if (editing) {
        await apiClient.put(`/api/workflows/${editing.id}`, { name });
      } else {
        await apiClient.post('/api/workflows', { name });
      }
      closeModal();
      await loadWorkflows();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        setFieldErrors((err.response.data as { errors?: ValidationErrors }).errors ?? {});
      } else if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setFieldErrors({ form: [typeof message === 'string' ? message : 'Unable to save workflow.'] });
      } else {
        setFieldErrors({ form: ['Unable to save workflow.'] });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (workflow: CustomWorkflow) => {
    if (!window.confirm(`Delete workflow "${workflow.name}"?`)) {
      return;
    }

    setDeleteError('');
    try {
      await apiClient.delete(`/api/workflows/${workflow.id}`);
      await loadWorkflows();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        const errors = (err.response.data as { errors?: ValidationErrors }).errors;
        setDeleteError(errors?.workflow?.[0] ?? 'Unable to delete this workflow.');
      } else if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setDeleteError(typeof message === 'string' ? message : 'Unable to delete this workflow.');
      }
    }
  };

  return (
    <ModulePage
      title="Miscellaneous"
      description="Shop settings that do not belong to another settings page."
      action={hasPermission('workflows.create') ? (
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
          Add Workflow
        </button>
      ) : undefined}
    >
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          className="border-b-2 border-violet-500 px-1 pb-3 text-sm font-medium text-violet-600 dark:text-violet-400"
          aria-current="page"
        >
          Workflow
        </button>
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Search workflows..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            table.setPage(1);
          }}
          className="form-input w-full max-w-xs"
          aria-label="Search workflows"
        />
      </div>

      {deleteError && <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{deleteError}</div>}
      {loading && <div className="py-8 text-sm text-center text-gray-500">Loading workflows...</div>}
      {!loading && error && <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{error}</div>}

      {!loading && !error && (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-x-auto">
          <table className="table-auto w-full">
            <thead className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="p-2 w-12"><div className="font-semibold text-left">#</div></th>
                <th className="p-2 text-left"><SortHeader label="Name" column="name" table={table} /></th>
                <th className="p-2"><div className="font-semibold text-right">Actions</div></th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-700/60">
              {workflows.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-gray-500">No workflows found.</td>
                </tr>
              )}
              {table.pageRows.map((workflow, index) => (
                <tr key={workflow.id}>
                  <td className="p-2 text-gray-500 dark:text-gray-400">{table.offset + index + 1}</td>
                  <td className="p-2 font-medium text-gray-800 dark:text-gray-100">{workflow.name}</td>
                  <td className="p-2 text-right whitespace-nowrap space-x-1">
                    {hasPermission('workflows.edit') && (
                      <EditButton
                        onClick={() => {
                          setFieldErrors({});
                          setEditing(workflow);
                          setIsCreating(false);
                          setName(workflow.name);
                        }}
                      />
                    )}
                    {hasPermission('workflows.delete') && (
                      <DeleteButton
                        onClick={() => { void handleDelete(workflow); }}
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

      {(isCreating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {editing ? 'Edit Workflow' : 'Create Workflow'}
            </h3>
            <p className="mb-4 text-sm text-gray-500">
              Custom workflows appear in the Workflow dropdown on estimates, orders, and invoices.
            </p>
            {fieldErrors.form && (
              <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{fieldErrors.form[0]}</div>
            )}
            <form onSubmit={(event) => { void handleSubmit(event); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="workflow-name">Name</label>
                <input
                  id="workflow-name"
                  className="form-input w-full"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
                {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name[0]}</p>}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn border-gray-200 dark:border-gray-700/60 text-gray-600 dark:text-gray-300">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 disabled:opacity-60">
                  {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ModulePage>
  );
}
