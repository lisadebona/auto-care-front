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

function WorkflowIcon({ workflow }: { workflow: string }) {
  const common = {
    className: 'h-4 w-4 fill-current',
    viewBox: '0 0 16 16',
    'aria-hidden': true as const,
  };

  if (workflow === 'dropped_off') {
    return (
      <svg {...common}>
        <path d="M3.1 4.4A1.4 1.4 0 0 1 4.4 3.2h7.2a1.4 1.4 0 0 1 1.3 1.1L13.7 7H14.2a1 1 0 0 1 1 1v3.2a1 1 0 0 1-1 1h-.45a1.6 1.6 0 0 1-3.1 0H5.35a1.6 1.6 0 0 1-3.1 0H1.8a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h.5l.8-2.6ZM4.4 4.4a.2.2 0 0 0-.19.14L3.5 7h9l-.71-2.46a.2.2 0 0 0-.19-.14H4.4ZM4.2 10.3a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6Zm7.6 0a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6Z" />
      </svg>
    );
  }

  if (workflow === 'in_progress') {
    return (
      <svg {...common}>
        <path d="M11.05 1.15a3.15 3.15 0 0 0-3.85 4.12L2.55 9.92a1.55 1.55 0 0 0 0 2.19l1.34 1.34a1.55 1.55 0 0 0 2.19 0l4.65-4.65a3.15 3.15 0 0 0 4.12-3.85L12.4 7.4 9.6 4.6l2.45-2.45a3.15 3.15 0 0 0-1-.99Z" />
      </svg>
    );
  }

  if (workflow === 'invoices') {
    return (
      <svg {...common}>
        <path d="M4.25 1.2A1.25 1.25 0 0 1 5.5 0h5A1.25 1.25 0 0 1 11.75 1.2V16L9.6 14.6 8 16l-1.6-1.4L4.25 16V1.2ZM6 4.4a.6.6 0 0 0 0 1.2h4a.6.6 0 0 0 0-1.2H6Zm0 2.6a.6.6 0 0 0 0 1.2h4a.6.6 0 0 0 0-1.2H6Zm0 2.6a.6.6 0 0 0 0 1.2h2.4a.6.6 0 1 0 0-1.2H6Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M5.25 1.25A1.25 1.25 0 0 1 6.5 0h3A1.25 1.25 0 0 1 10.75 1.25V2H12.5A1.5 1.5 0 0 1 14 3.5v10A1.5 1.5 0 0 1 12.5 15h-9A1.5 1.5 0 0 1 2 13.5v-10A1.5 1.5 0 0 1 3.5 2h1.75v-.75ZM6.5 1.25V2.5h3V1.25a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25ZM5 5.75A.75.75 0 0 1 5.75 5h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 5.75Zm0 3A.75.75 0 0 1 5.75 8h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 8.75Zm0 3a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 fill-current text-gray-400" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 8a2.75 2.75 0 1 0 0-5.5A2.75 2.75 0 0 0 8 8Zm4.15 5.75c.47 0 .84-.43.67-.87a5.25 5.25 0 0 0-9.64 0c-.17.44.2.87.67.87h8.3Z" />
    </svg>
  );
}

function VehicleIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 fill-current text-gray-400" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.1 4.4A1.4 1.4 0 0 1 4.4 3.2h7.2a1.4 1.4 0 0 1 1.3 1.1L13.7 7H14.2a1 1 0 0 1 1 1v3.2a1 1 0 0 1-1 1h-.45a1.6 1.6 0 0 1-3.1 0H5.35a1.6 1.6 0 0 1-3.1 0H1.8a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h.5l.8-2.6ZM4.4 4.4a.2.2 0 0 0-.19.14L3.5 7h9l-.71-2.46a.2.2 0 0 0-.19-.14H4.4ZM4.2 10.3a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6Zm7.6 0a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6Z" />
    </svg>
  );
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
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                      <WorkflowIcon workflow={workflow.value} />
                    </span>
                    <h2 className="font-semibold text-gray-800 dark:text-gray-100">{workflow.label}</h2>
                  </div>
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
                            <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-200">
                              <PersonIcon />
                              <span className="truncate">{item.customer ?? '—'}</span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                              <VehicleIcon />
                              <span className="truncate">{item.vehicle ?? '—'}</span>
                            </div>
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
