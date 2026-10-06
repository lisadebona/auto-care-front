import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import ModulePage from '../components/ModulePage';
import { SortHeader, TablePagination } from '../components/TableControls';
import { DeleteButton, EditButton } from '../components/ActionButtons';
import apiClient from '../api/axios';
import { usePermission } from '../hooks/usePermission';
import { useTableControls } from '../hooks/useTableControls';
import type { Estimate } from '../types';

function formatMoney(value: string | number | undefined): string {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : '$0.00';
}

export default function Orders() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const [orders, setOrders] = useState<Estimate[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const table = useTableControls(orders, {
    order: (order) => order.order_number,
    estimate: (order) => order.number,
    customer: (order) => order.customer?.name,
    vehicle: (order) => order.vehicle?.name,
    workflow: (order) => order.workflow_label,
    total: (order) => Number(order.totals?.grand_total ?? 0),
  });

  const loadOrders = async (query = search) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get<{ estimates: Estimate[] }>('/api/estimates', {
        params: { workflow: 'in_progress', ...(query ? { search: query } : {}) },
      });
      setOrders(response.data.estimates);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Unable to load orders.');
      } else {
        setError('Unable to load orders.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders(search);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const handleDelete = async (order: Estimate) => {
    if (!window.confirm(`Delete order ${order.order_number ?? order.display_number}?`)) {
      return;
    }

    try {
      await apiClient.delete(`/api/estimates/${order.id}`);
      await loadOrders();
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Unable to delete order.');
      }
    }
  };

  return (
    <ModulePage
      title="Orders"
      description="Estimates whose workflow is In Progress / Repair Order."
    >
      <div className="mb-4">
        <input
          type="search"
          className="form-input w-full max-w-md"
          placeholder="Search by order #, estimate #, customer, vehicle..."
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
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Orders</h2>
        </div>

        {loading ? (
          <p className="px-5 py-8 text-sm text-gray-500">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-500">No orders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <th className="px-5 py-3 font-semibold w-12">#</th>
                  <th className="px-5 py-3"><SortHeader label="Order" column="order" table={table} /></th>
                  <th className="px-5 py-3"><SortHeader label="Estimate" column="estimate" table={table} /></th>
                  <th className="px-5 py-3"><SortHeader label="Customer" column="customer" table={table} /></th>
                  <th className="px-5 py-3"><SortHeader label="Vehicle" column="vehicle" table={table} /></th>
                  <th className="px-5 py-3"><SortHeader label="Workflow" column="workflow" table={table} /></th>
                  <th className="px-5 py-3"><SortHeader label="Total" column="total" table={table} /></th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {table.pageRows.map((order, index) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{table.offset + index + 1}</td>
                    <td className="px-5 py-3">
                      <Link
                        to={`/orders/${order.id}`}
                        className="font-medium text-violet-600 dark:text-violet-400 hover:underline"
                      >
                        {order.order_number ?? '—'}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-200">
                      {order.display_number}
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-200">
                      {order.customer?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-200">
                      {order.vehicle?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-200">
                        {order.workflow_label ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-100">
                      {formatMoney(order.totals?.grand_total)}
                    </td>
                    <td className="px-5 py-3 text-right space-x-1">
                      {hasPermission('estimates.edit') && (
                        <EditButton
                          onClick={() => navigate(`/orders/${order.id}`)}
                        />
                      )}
                      {hasPermission('estimates.delete') && (
                        <DeleteButton
                          onClick={() => { void handleDelete(order); }}
                        />
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
