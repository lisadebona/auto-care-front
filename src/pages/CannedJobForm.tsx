import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import {
  ItemTypeIcon,
  ServiceLineGroups,
  lineItemGroupMeta,
  lineItemGroupOrder,
  lineItemSubtotal,
  type ServiceLineItem,
} from '../components/ServiceLineGroups';
import apiClient from '../api/axios';
import { usePermission } from '../hooks/usePermission';
import type { CannedJob, EstimateItemType, ValidationErrors } from '../types';

type FormState = {
  name: string;
  line_items: ServiceLineItem[];
};

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function amount(value: string | number): string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
}

function emptyLineItem(type: EstimateItemType = 'part'): ServiceLineItem {
  return {
    key: uid(),
    type,
    description: '',
    price: '0.00',
    quantity: '1.00',
    discount: '',
    remarks: [],
  };
}

function emptyForm(): FormState {
  return {
    name: '',
    line_items: [emptyLineItem('part')],
  };
}

export default function CannedJobForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const canEdit = isNew ? hasPermission('canned-jobs.create') : hasPermission('canned-jobs.edit');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(!isNew);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    if (isNew) {
      return;
    }

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await apiClient.get<{ canned_job: CannedJob }>(`/api/canned-jobs/${id}`);
        const job = response.data.canned_job;
        setForm({
          name: job.name,
          line_items: (job.line_items.length ? job.line_items : [emptyLineItem('part')]).map((item) => ({
            key: uid(),
            type: item.type,
            description: item.description ?? '',
            price: amount(item.price ?? 0),
            quantity: amount(item.quantity ?? 1),
            discount: '',
            remarks: [],
          })),
        });
      } catch (err: unknown) {
        if (isAxiosError(err)) {
          const message = err.response?.data?.message;
          setError(typeof message === 'string' ? message : 'Unable to load canned job.');
        } else {
          setError('Unable to load canned job.');
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, isNew]);

  const updateLineItem = (key: string, changes: Partial<ServiceLineItem>) => {
    setForm((current) => ({
      ...current,
      line_items: current.line_items.map((item) => (
        item.key === key ? { ...item, ...changes } : item
      )),
    }));
  };

  const addLineItem = (type: EstimateItemType) => {
    setCollapsed(false);
    setForm((current) => ({
      ...current,
      line_items: [...current.line_items, emptyLineItem(type)],
    }));
  };

  const removeLineItem = (key: string) => {
    setForm((current) => ({
      ...current,
      line_items: current.line_items.filter((item) => item.key !== key),
    }));
  };

  const total = form.line_items.reduce((sum, item) => sum + lineItemSubtotal(item), 0);

  const save = async (closeAfter = false) => {
    if (!canEdit) {
      return;
    }

    setFieldErrors({});
    setError('');
    setSubmitting(true);

    const payload = {
      name: form.name,
      line_items: form.line_items.map((item) => ({
        type: item.type,
        description: item.description || null,
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 0),
        discount: null,
        remarks: [],
      })),
    };

    try {
      if (isNew) {
        const response = await apiClient.post<{ canned_job: CannedJob }>('/api/canned-jobs', payload);
        if (closeAfter) {
          navigate('/canned-jobs');
        } else {
          navigate(`/canned-jobs/${response.data.canned_job.id}`, { replace: true });
        }
      } else {
        await apiClient.put(`/api/canned-jobs/${id}`, payload);
        if (closeAfter) {
          navigate('/canned-jobs');
        }
      }
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        setFieldErrors((err.response.data as { errors?: ValidationErrors }).errors ?? {});
      } else if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Unable to save canned job.');
      } else {
        setError('Unable to save canned job.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await save(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <p className="text-sm text-gray-500">Loading canned job...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <form onSubmit={(event) => { void handleSubmit(event); }}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <Link to="/canned-jobs" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                Canned Jobs
              </Link>
              <span className="text-gray-300">/</span>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {isNew ? 'New Canned Job' : (form.name || 'Canned Job')}
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Name the service, then add the parts, labor, tires, subcontract, and fees it needs.
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => { void save(true); }}
              className="btn bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Save & Close'}
            </button>
          )}
        </div>

        {(error || fieldErrors.name) && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error || fieldErrors.name?.[0]}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-700/60 dark:bg-gray-800">
          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700/60">
            <input
              className="form-input w-full"
              placeholder="Enter name for this service..."
              value={form.name}
              disabled={!canEdit}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </div>

          <ServiceLineGroups
            items={form.line_items}
            canEdit={canEdit}
            showTagsAndDiscount={false}
            onAdd={addLineItem}
            onUpdate={updateLineItem}
            onRemove={removeLineItem}
          />

          {canEdit && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 px-4 py-3 text-sm dark:border-gray-700/60">
              <span className="text-gray-500">Add</span>
              {lineItemGroupOrder.map((type) => (
                <button
                  key={type}
                  type="button"
                  className="inline-flex items-center gap-1.5 font-medium text-violet-600 hover:underline dark:text-violet-400"
                  onClick={() => addLineItem(type)}
                >
                  <ItemTypeIcon type={type} />
                  {lineItemGroupMeta[type].shortLabel}
                </button>
              ))}
              <span className="ml-auto font-semibold text-gray-800 dark:text-gray-100">{money(total)}</span>
            </div>
          )}

          {!canEdit && (
            <div className="border-t border-gray-100 px-4 py-3 text-right text-sm font-semibold text-gray-800 dark:border-gray-700/60 dark:text-gray-100">
              {money(total)}
            </div>
          )}
        </div>
      </form>
    </DashboardLayout>
  );
}
