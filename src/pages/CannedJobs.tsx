import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import ModulePage from '../components/ModulePage';
import { SortHeader, TablePagination } from '../components/TableControls';
import { DeleteButton, EditButton } from '../components/ActionButtons';
import apiClient from '../api/axios';
import { usePermission } from '../hooks/usePermission';
import { useTableControls } from '../hooks/useTableControls';
import type { CannedJob } from '../types';

function formatMoney(value: string | number | undefined): string {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : '$0.00';
}

export default function CannedJobs() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const [cannedJobs, setCannedJobs] = useState<CannedJob[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const table = useTableControls(cannedJobs, {
    name: (job) => job.name,
    items: (job) => job.line_items.length,
    total: (job) => Number(job.subtotal ?? 0),
  });

  const loadCannedJobs = async (query = search) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get<{ canned_jobs: CannedJob[] }>('/api/canned-jobs', {
        params: query ? { search: query } : {},
      });
      setCannedJobs(response.data.canned_jobs);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Unable to load canned jobs.');
      } else {
        setError('Unable to load canned jobs.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCannedJobs(search);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const handleDelete = async (job: CannedJob) => {
    if (!window.confirm(`Delete canned job ${job.name}?`)) {
      return;
    }

    try {
      await apiClient.delete(`/api/canned-jobs/${job.id}`);
      await loadCannedJobs();
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Unable to delete canned job.');
      }
    }
  };

  return (
    <ModulePage
      title="Canned Jobs"
      description="Reusable services with the parts, labor, and fees they need."
      action={hasPermission('canned-jobs.create') ? (
        <button
          type="button"
          onClick={() => navigate('/canned-jobs/new')}
          className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
        >
          New Canned Job
        </button>
      ) : undefined}
    >
      <div className="mb-4">
        <input
          type="search"
          className="form-input w-full max-w-md"
          placeholder="Search by service or item..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            table.setPage(1);
          }}
        />
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{error}</div>}

      <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Canned Jobs</h2>
        </div>

        {loading ? (
          <p className="px-5 py-8 text-sm text-gray-500">Loading canned jobs...</p>
        ) : cannedJobs.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-500">No canned jobs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <th className="px-5 py-3 font-semibold w-12">#</th>
                  <th className="px-5 py-3"><SortHeader label="Service" column="name" table={table} /></th>
                  <th className="px-5 py-3"><SortHeader label="Items" column="items" table={table} /></th>
                  <th className="px-5 py-3"><SortHeader label="Total" column="total" table={table} /></th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {table.pageRows.map((job, index) => (
                  <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{table.offset + index + 1}</td>
                    <td className="px-5 py-3">
                      <Link
                        to={`/canned-jobs/${job.id}`}
                        className="font-medium text-violet-600 dark:text-violet-400 hover:underline"
                      >
                        {job.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-200">{job.line_items.length}</td>
                    <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-100">
                      {formatMoney(job.subtotal)}
                    </td>
                    <td className="px-5 py-3 text-right space-x-1">
                      {hasPermission('canned-jobs.edit') && (
                        <EditButton onClick={() => navigate(`/canned-jobs/${job.id}`)} />
                      )}
                      {hasPermission('canned-jobs.delete') && (
                        <DeleteButton onClick={() => { void handleDelete(job); }} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && <TablePagination table={table} />}
      </div>
    </ModulePage>
  );
}
