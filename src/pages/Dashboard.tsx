import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import apiClient from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import type { EstimateOrderStatus, EstimateWorkflow } from '../types';

type DashboardItem = {
  id: number;
  reference: string;
  customer: string | null;
  vehicle: string | null;
  total: string;
  order_status: EstimateOrderStatus;
  workflow: EstimateWorkflow;
};

type DashboardWorkflow = {
  value: string;
  label: string;
  items: DashboardItem[];
};

const listPath: Record<string, string> = {
  estimates: '/estimates',
  in_progress: '/orders',
  invoices: '/invoices',
};

function formatMoney(value: string | number | undefined): string {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : '$0.00';
}

function recordPath(item: DashboardItem): string {
  if (item.order_status === 'invoice') {
    return `/invoices/${item.id}`;
  }

  if (item.workflow === 'in_progress') {
    return `/orders/${item.id}`;
  }

  return `/estimates/${item.id}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const canViewEstimates = hasPermission('estimates.view');
  const [workflows, setWorkflows] = useState<DashboardWorkflow[]>([]);
  const [loading, setLoading] = useState(canViewEstimates);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canViewEstimates) {
      return;
    }

    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await apiClient.get<{ workflows: DashboardWorkflow[] }>('/api/dashboard');
        if (active) {
          setWorkflows(response.data.workflows);
        }
      } catch (err: unknown) {
        if (!active) {
          return;
        }

        if (isAxiosError(err)) {
          const message = err.response?.data?.message;
          setError(typeof message === 'string' ? message : 'Unable to load the dashboard.');
        } else {
          setError('Unable to load the dashboard.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [canViewEstimates]);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Welcome back, {user?.name}.</p>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{error}</div>}

      {canViewEstimates && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {loading ? (
            <p className="text-sm text-gray-500">Loading recent work...</p>
          ) : workflows.map((workflow) => {
            const to = listPath[workflow.value];

            return (
              <section key={workflow.value} className="bg-white dark:bg-gray-800 shadow-xs rounded-xl">
                <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100">{workflow.label}</h2>
                  {to && (
                    <Link to={to} className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline">
                      View all
                    </Link>
                  )}
                </header>
                {workflow.items.length === 0 ? (
                  <p className="px-5 py-8 text-sm text-gray-500">No recent items.</p>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {workflow.items.map((item) => (
                      <li key={item.id}>
                        <Link
                          to={recordPath(item)}
                          className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/20"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-violet-600 dark:text-violet-400">{item.reference}</div>
                            <div className="truncate text-sm text-gray-700 dark:text-gray-200">{item.customer ?? '—'}</div>
                            <div className="truncate text-xs text-gray-500 dark:text-gray-400">{item.vehicle ?? '—'}</div>
                          </div>
                          <div className="shrink-0 text-sm font-medium text-gray-800 dark:text-gray-100">
                            {formatMoney(item.total)}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
