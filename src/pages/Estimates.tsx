import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import ModulePage from '../components/ModulePage';
import apiClient from '../api/axios';
import { usePermission } from '../hooks/usePermission';
import type { Estimate } from '../types';

function formatMoney(value: string | number | undefined): string {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : '$0.00';
}

export default function Estimates() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEstimates = async (query = search) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get<{ estimates: Estimate[] }>('/api/estimates', {
        params: query ? { search: query } : {},
      });
      setEstimates(response.data.estimates);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Unable to load estimates.');
      } else {
        setError('Unable to load estimates.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEstimates(search);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const handleDelete = async (estimate: Estimate) => {
    if (!window.confirm(`Delete estimate ${estimate.display_number}?`)) {
      return;
    }

    try {
      await apiClient.delete(`/api/estimates/${estimate.id}`);
      await loadEstimates();
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Unable to delete estimate.');
      }
    }
  };

  return (
    <ModulePage
      title="Estimates"
      description="Create and manage repair estimates for customers."
      action={hasPermission('estimates.create') ? (
        <button
          type="button"
          onClick={() => navigate('/estimates/new')}
          className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
        >
          New Estimate
        </button>
      ) : undefined}
    >
      <div className="mb-4">
        <input
          type="search"
          className="form-input w-full max-w-md"
          placeholder="Search by estimate #, customer, vehicle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{error}</div>}

      <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Estimates</h2>
        </div>

        {loading ? (
          <p className="px-5 py-8 text-sm text-gray-500">Loading estimates...</p>
        ) : estimates.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-500">No estimates found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <th className="px-5 py-3 font-semibold">Estimate</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Vehicle</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {estimates.map((estimate) => (
                  <tr key={estimate.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                    <td className="px-5 py-3">
                      <Link
                        to={`/estimates/${estimate.id}`}
                        className="font-medium text-violet-600 dark:text-violet-400 hover:underline"
                      >
                        {estimate.display_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-200">
                      {estimate.customer?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-200">
                      {estimate.vehicle?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-700 dark:text-gray-200">
                        {estimate.order_status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-100">
                      {formatMoney(estimate.totals?.grand_total)}
                    </td>
                    <td className="px-5 py-3 text-right space-x-2">
                      {hasPermission('estimates.edit') && (
                        <button
                          type="button"
                          onClick={() => navigate(`/estimates/${estimate.id}`)}
                          className="text-violet-600 dark:text-violet-400 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                      {hasPermission('estimates.delete') && (
                        <button
                          type="button"
                          onClick={() => { void handleDelete(estimate); }}
                          className="text-red-500 hover:underline"
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
      </div>
    </ModulePage>
  );
}
