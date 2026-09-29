import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import apiClient from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { formatUsPhone } from '../utils/format';
import type {
  Estimate,
  EstimateItemType,
  EstimateOptions,
  EstimateOrderStatus,
  EstimateService,
  EstimateWorkflow,
  ValidationErrors,
  Vehicle,
  VehicleOptions,
} from '../types';

type FormLineItem = {
  key: string;
  type: EstimateItemType;
  description: string;
  price: string;
  quantity: string;
  discount: string;
  status: string;
};

type FormService = {
  key: string;
  name: string;
  notes: string;
  authorized: boolean;
  discount_percent: string;
  epa_percent: string;
  shop_supplies_percent: string;
  tax_percent: string;
  line_items: FormLineItem[];
};

type EstimateFormState = {
  customer_id: string;
  vehicle_id: string;
  service_writer_id: string;
  due_date: string;
  customer_comments: string;
  recommendations: string;
  po_number: string;
  completed_at: string;
  payment_terms: string;
  order_status: EstimateOrderStatus;
  workflow: EstimateWorkflow;
  authorized: boolean;
  services: FormService[];
};

type TabId = 'summary' | 'services' | 'messages';

const NEW_CUSTOMER_VALUE = '__new_customer__';
const NEW_VEHICLE_VALUE = '__new_vehicle__';

type QuickVehicleForm = {
  year: string;
  make: string;
  model: string;
  sub_model: string;
  transmission: string;
  engine_size: string;
  drivetrain: string;
  type: string;
  mileage: string;
  vin: string;
};

const emptyVehicleForm = (): QuickVehicleForm => ({
  year: '',
  make: '',
  model: '',
  sub_model: '',
  transmission: '',
  engine_size: '',
  drivetrain: '',
  type: '',
  mileage: '',
  vin: '',
});

const emptyVehicleOptions = (): VehicleOptions => ({
  transmissions: [],
  drivetrains: [],
  types: [],
});

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function lineSubtotal(item: FormLineItem): number {
  const gross = Number(item.price || 0) * Number(item.quantity || 0);
  const discount = Number(item.discount || 0);
  return Math.max(gross - discount, 0);
}

function serviceSubtotal(service: FormService): number {
  const itemsTotal = service.line_items.reduce((sum, item) => sum + lineSubtotal(item), 0);
  const afterDiscount = itemsTotal * (1 - Number(service.discount_percent || 0) / 100);
  const epa = afterDiscount * (Number(service.epa_percent || 0) / 100);
  const shop = afterDiscount * (Number(service.shop_supplies_percent || 0) / 100);
  const taxable = afterDiscount + epa + shop;
  const tax = taxable * (Number(service.tax_percent || 0) / 100);
  return taxable + tax;
}

function emptyLineItem(type: EstimateItemType = 'part'): FormLineItem {
  return {
    key: uid(),
    type,
    description: '',
    price: '0.00',
    quantity: '1',
    discount: '',
    status: '',
  };
}

function emptyService(feeDefaults?: EstimateOptions['fee_defaults']): FormService {
  return {
    key: uid(),
    name: '',
    notes: '',
    authorized: false,
    discount_percent: '0',
    epa_percent: feeDefaults?.epa_percent ?? '0',
    shop_supplies_percent: feeDefaults?.shop_supplies_percent ?? '0',
    tax_percent: feeDefaults?.tax_percent ?? '0',
    line_items: [emptyLineItem('part')],
  };
}

function emptyForm(feeDefaults?: EstimateOptions['fee_defaults'], writerId?: number): EstimateFormState {
  return {
    customer_id: '',
    vehicle_id: '',
    service_writer_id: writerId ? String(writerId) : '',
    due_date: '',
    customer_comments: '',
    recommendations: '',
    po_number: '',
    completed_at: '',
    payment_terms: 'On Receipt',
    order_status: 'estimate',
    workflow: 'estimates',
    authorized: false,
    services: [emptyService(feeDefaults)],
  };
}

function fromEstimate(estimate: Estimate): EstimateFormState {
  return {
    customer_id: String(estimate.customer_id),
    vehicle_id: estimate.vehicle_id ? String(estimate.vehicle_id) : '',
    service_writer_id: estimate.service_writer_id ? String(estimate.service_writer_id) : '',
    due_date: estimate.due_date ? estimate.due_date.slice(0, 10) : '',
    customer_comments: estimate.customer_comments ?? '',
    recommendations: estimate.recommendations ?? '',
    po_number: estimate.po_number ?? '',
    completed_at: estimate.completed_at ? estimate.completed_at.slice(0, 10) : '',
    payment_terms: estimate.payment_terms || 'On Receipt',
    order_status: estimate.order_status,
    workflow: estimate.workflow,
    authorized: estimate.is_authorized,
    services: (estimate.services?.length ? estimate.services : [{
      name: '',
      notes: '',
      authorized: false,
      discount_percent: 0,
      epa_percent: 0,
      shop_supplies_percent: 0,
      tax_percent: 0,
      line_items: [],
    }]).map((service: EstimateService) => ({
      key: uid(),
      name: service.name ?? '',
      notes: service.notes ?? '',
      authorized: Boolean(service.authorized),
      discount_percent: String(service.discount_percent ?? 0),
      epa_percent: String(service.epa_percent ?? 0),
      shop_supplies_percent: String(service.shop_supplies_percent ?? 0),
      tax_percent: String(service.tax_percent ?? 0),
      line_items: (service.line_items?.length ? service.line_items : [{
        type: 'part' as const,
        description: '',
        price: 0,
        quantity: 1,
      }]).map((item) => ({
        key: uid(),
        type: item.type,
        description: item.description ?? '',
        price: String(item.price ?? '0.00'),
        quantity: String(item.quantity ?? '1'),
        discount: item.discount == null || item.discount === '' ? '' : String(item.discount),
        status: item.status ?? '',
      })),
    })),
  };
}

const emptyOptions: EstimateOptions = {
  payment_terms: ['On Receipt'],
  order_statuses: ['estimate', 'invoice'],
  workflows: [{ value: 'estimates', label: 'Estimates' }],
  item_types: [
    { value: 'part', label: 'Part' },
    { value: 'labor', label: 'Labor' },
    { value: 'tire', label: 'Tire' },
    { value: 'subcontract', label: 'Subcontract' },
    { value: 'fee', label: 'Fee' },
  ],
  fee_defaults: { epa_percent: '0', shop_supplies_percent: '0', tax_percent: '0' },
  service_writers: [],
  customers: [],
  vehicles: [],
};

export default function EstimateForm() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const canEdit = isNew ? hasPermission('estimates.create') : hasPermission('estimates.edit');

  const [form, setForm] = useState<EstimateFormState>(() => emptyForm(undefined, user?.id));
  const [options, setOptions] = useState<EstimateOptions>(emptyOptions);
  const [estimateNumber, setEstimateNumber] = useState<string>('New');
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('services');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [error, setError] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({ first_name: '', last_name: '', phone: '', email: '' });
  const [customerErrors, setCustomerErrors] = useState<ValidationErrors>({});
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleForm, setVehicleForm] = useState<QuickVehicleForm>(emptyVehicleForm);
  const [vehicleOptions, setVehicleOptions] = useState<VehicleOptions>(emptyVehicleOptions);
  const [vehicleErrors, setVehicleErrors] = useState<ValidationErrors>({});
  const [creatingVehicle, setCreatingVehicle] = useState(false);

  const customerVehicles = useMemo(
    () => options.vehicles.filter((vehicle) => !form.customer_id || String(vehicle.customer_id) === form.customer_id),
    [options.vehicles, form.customer_id],
  );

  const totals = useMemo(() => {
    const buckets = { parts: 0, labor: 0, tires: 0, subcontract: 0, fees: 0 };
    for (const service of form.services) {
      for (const item of service.line_items) {
        const subtotal = lineSubtotal(item);
        if (item.type === 'part') buckets.parts += subtotal;
        if (item.type === 'labor') buckets.labor += subtotal;
        if (item.type === 'tire') buckets.tires += subtotal;
        if (item.type === 'subcontract') buckets.subcontract += subtotal;
        if (item.type === 'fee') buckets.fees += subtotal;
      }
    }
    const grand = Object.values(buckets).reduce((sum, value) => sum + value, 0);
    return { ...buckets, grand };
  }, [form.services]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (isNew) {
          const response = await apiClient.get<{ options: EstimateOptions }>('/api/estimates');
          setOptions(response.data.options);
          setForm(emptyForm(response.data.options.fee_defaults, user?.id));
          setEstimateNumber('New');
          setCreatedAt(null);
        } else {
          const response = await apiClient.get<{ estimate: Estimate; options: EstimateOptions }>(`/api/estimates/${id}`);
          setOptions(response.data.options);
          setForm(fromEstimate(response.data.estimate));
          setEstimateNumber(response.data.estimate.display_number);
          setCreatedAt(response.data.estimate.created_at ?? null);
        }
      } catch (err: unknown) {
        if (isAxiosError(err)) {
          const message = err.response?.data?.message;
          setError(typeof message === 'string' ? message : 'Unable to load estimate.');
        } else {
          setError('Unable to load estimate.');
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, isNew, user?.id]);

  const updateService = (serviceKey: string, patch: Partial<FormService>) => {
    setForm((current) => ({
      ...current,
      services: current.services.map((service) => (
        service.key === serviceKey ? { ...service, ...patch } : service
      )),
    }));
  };

  const updateLineItem = (serviceKey: string, itemKey: string, patch: Partial<FormLineItem>) => {
    setForm((current) => ({
      ...current,
      services: current.services.map((service) => {
        if (service.key !== serviceKey) return service;
        return {
          ...service,
          line_items: service.line_items.map((item) => (
            item.key === itemKey ? { ...item, ...patch } : item
          )),
        };
      }),
    }));
  };

  const addService = () => {
    setForm((current) => ({
      ...current,
      services: [...current.services, emptyService(options.fee_defaults)],
    }));
    setActiveTab('services');
  };

  const addLineItem = (serviceKey: string, type: EstimateItemType) => {
    setForm((current) => ({
      ...current,
      services: current.services.map((service) => (
        service.key === serviceKey
          ? { ...service, line_items: [...service.line_items, emptyLineItem(type)] }
          : service
      )),
    }));
  };

  const removeLineItem = (serviceKey: string, itemKey: string) => {
    setForm((current) => ({
      ...current,
      services: current.services.map((service) => (
        service.key === serviceKey
          ? { ...service, line_items: service.line_items.filter((item) => item.key !== itemKey) }
          : service
      )),
    }));
  };

  const handleCustomerChange = (value: string) => {
    if (value === NEW_CUSTOMER_VALUE) {
      setShowCustomerModal(true);
      return;
    }
    setForm((current) => ({
      ...current,
      customer_id: value,
      vehicle_id: '',
    }));
  };

  const handleVehicleChange = (value: string) => {
    if (value === NEW_VEHICLE_VALUE) {
      void openVehicleModal();
      return;
    }
    setForm((current) => ({ ...current, vehicle_id: value }));
  };

  const openVehicleModal = async () => {
    if (!form.customer_id) {
      return;
    }

    setVehicleErrors({});
    setVehicleForm(emptyVehicleForm());
    setShowVehicleModal(true);

    try {
      const response = await apiClient.get<{ options: VehicleOptions }>('/api/vehicles', {
        params: { customer_id: form.customer_id },
      });
      setVehicleOptions(response.data.options);
    } catch {
      setVehicleOptions(emptyVehicleOptions());
    }
  };

  const handleCreateCustomer = async (e: FormEvent) => {
    e.preventDefault();
    setCustomerErrors({});
    setCreatingCustomer(true);
    try {
      const response = await apiClient.post<{ id: number; name: string }>('/api/customers', {
        first_name: customerForm.first_name,
        last_name: customerForm.last_name,
        phone: customerForm.phone,
        email: customerForm.email || null,
      });
      const created = response.data;
      setOptions((current) => ({
        ...current,
        customers: [...current.customers, { id: created.id, name: created.name }].sort((a, b) => a.name.localeCompare(b.name)),
      }));
      setForm((current) => ({ ...current, customer_id: String(created.id), vehicle_id: '' }));
      setShowCustomerModal(false);
      setCustomerForm({ first_name: '', last_name: '', phone: '', email: '' });
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        setCustomerErrors((err.response.data as { errors?: ValidationErrors }).errors ?? {});
      } else if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setCustomerErrors({ form: [typeof message === 'string' ? message : 'Unable to create customer.'] });
      } else {
        setCustomerErrors({ form: ['Unable to create customer.'] });
      }
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleCreateVehicle = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.customer_id) {
      return;
    }

    setVehicleErrors({});
    setCreatingVehicle(true);
    try {
      const response = await apiClient.post<Vehicle>('/api/vehicles', {
        customer_id: Number(form.customer_id),
        year: Number(vehicleForm.year),
        make: vehicleForm.make,
        model: vehicleForm.model,
        sub_model: vehicleForm.sub_model || null,
        transmission: vehicleForm.transmission || null,
        engine_size: vehicleForm.engine_size || null,
        drivetrain: vehicleForm.drivetrain || null,
        type: vehicleForm.type,
        mileage: vehicleForm.mileage === '' ? null : Number(vehicleForm.mileage),
        vin: vehicleForm.vin || null,
      });
      const created = response.data;
      setOptions((current) => ({
        ...current,
        vehicles: [
          ...current.vehicles,
          {
            id: created.id,
            customer_id: created.customer_id,
            name: created.name,
          },
        ],
      }));
      setForm((current) => ({ ...current, vehicle_id: String(created.id) }));
      setShowVehicleModal(false);
      setVehicleForm(emptyVehicleForm());
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        setVehicleErrors((err.response.data as { errors?: ValidationErrors }).errors ?? {});
      } else if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setVehicleErrors({ form: [typeof message === 'string' ? message : 'Unable to create vehicle.'] });
      } else {
        setVehicleErrors({ form: ['Unable to create vehicle.'] });
      }
    } finally {
      setCreatingVehicle(false);
    }
  };

  const saveEstimate = async (closeAfter = false) => {
    if (!canEdit) return;

    setFieldErrors({});
    setSubmitting(true);

    const payload = {
      customer_id: Number(form.customer_id),
      vehicle_id: form.vehicle_id ? Number(form.vehicle_id) : null,
      service_writer_id: form.service_writer_id ? Number(form.service_writer_id) : null,
      due_date: form.due_date || null,
      customer_comments: form.customer_comments || null,
      recommendations: form.recommendations || null,
      po_number: form.po_number || null,
      completed_at: form.completed_at || null,
      payment_terms: form.payment_terms,
      order_status: form.order_status,
      workflow: form.workflow,
      authorized: form.authorized,
      services: form.services.map((service) => ({
        name: service.name || null,
        notes: service.notes || null,
        authorized: service.authorized,
        discount_percent: Number(service.discount_percent || 0),
        epa_percent: Number(service.epa_percent || 0),
        shop_supplies_percent: Number(service.shop_supplies_percent || 0),
        tax_percent: Number(service.tax_percent || 0),
        line_items: service.line_items.map((item) => ({
          type: item.type,
          description: item.description || null,
          price: Number(item.price || 0),
          quantity: Number(item.quantity || 0),
          discount: item.discount === '' ? null : Number(item.discount),
          status: item.status || null,
        })),
      })),
    };

    try {
      if (isNew) {
        const response = await apiClient.post<{ estimate: Estimate }>('/api/estimates', payload);
        if (closeAfter) {
          navigate('/estimates');
        } else {
          navigate(`/estimates/${response.data.estimate.id}`, { replace: true });
        }
      } else {
        await apiClient.put(`/api/estimates/${id}`, payload);
        if (closeAfter) {
          navigate('/estimates');
        } else {
          const response = await apiClient.get<{ estimate: Estimate; options: EstimateOptions }>(`/api/estimates/${id}`);
          setOptions(response.data.options);
          setForm(fromEstimate(response.data.estimate));
        }
      }
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        setFieldErrors((err.response.data as { errors?: ValidationErrors }).errors ?? {});
      } else if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setFieldErrors({ form: [typeof message === 'string' ? message : 'Unable to save estimate.'] });
      } else {
        setFieldErrors({ form: ['Unable to save estimate.'] });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await saveEstimate(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <p className="text-sm text-gray-500">Loading estimate...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <form onSubmit={(e) => { void handleSubmit(e); }}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <Link to="/estimates" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                Estimates
              </Link>
              <span className="text-gray-300">/</span>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Estimate ({estimateNumber})
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">Labels: Add +</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200" disabled>
              Print
            </button>
            <button type="button" className="btn bg-teal-600 text-white hover:bg-teal-500" disabled>
              Send
            </button>
            {canEdit && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => { void saveEstimate(true); }}
                className="btn bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-60"
              >
                {submitting ? 'Saving...' : 'Save & Close'}
              </button>
            )}
          </div>
        </div>

        {(error || fieldErrors.form) && (
          <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">
            {error || fieldErrors.form?.[0]}
          </div>
        )}

        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="estimate-customer">Customer Name</label>
            <select
              id="estimate-customer"
              className="form-select w-full"
              value={form.customer_id}
              disabled={!canEdit}
              onChange={(e) => handleCustomerChange(e.target.value)}
              required
            >
              <option value="">Select customer</option>
              {hasPermission('customers.create') && (
                <option value={NEW_CUSTOMER_VALUE}>+ Add new customer</option>
              )}
              {options.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
            {fieldErrors.customer_id && <p className="mt-1 text-xs text-red-500">{fieldErrors.customer_id[0]}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="estimate-vehicle">Customer Vehicle</label>
            <select
              id="estimate-vehicle"
              className="form-select w-full"
              value={form.vehicle_id}
              disabled={!canEdit || !form.customer_id}
              onChange={(e) => handleVehicleChange(e.target.value)}
            >
              <option value="">Select vehicle</option>
              {hasPermission('vehicles.create') && form.customer_id && (
                <option value={NEW_VEHICLE_VALUE}>+ Add new vehicle</option>
              )}
              {customerVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>
              ))}
            </select>
            {fieldErrors.vehicle_id && <p className="mt-1 text-xs text-red-500">{fieldErrors.vehicle_id[0]}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-6">
          <div className="min-w-0">
            <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-4">
              {([
                { id: 'summary', label: 'Summary' },
                { id: 'services', label: `Services (${form.services.length})` },
                { id: 'messages', label: 'Messages' },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                    activeTab === tab.id
                      ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'summary' && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-3 text-sm">
                <p><span className="text-gray-500">Customer:</span> {options.customers.find((c) => String(c.id) === form.customer_id)?.name ?? '—'}</p>
                <p><span className="text-gray-500">Vehicle:</span> {customerVehicles.find((v) => String(v.id) === form.vehicle_id)?.name ?? '—'}</p>
                <p><span className="text-gray-500">Services:</span> {form.services.length}</p>
                <p><span className="text-gray-500">Grand Total:</span> {money(totals.grand)}</p>
                <p className="text-gray-500">{form.customer_comments || 'No customer comments yet.'}</p>
              </div>
            )}

            {activeTab === 'messages' && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-sm text-gray-500 text-center">
                Messages will appear here.
              </div>
            )}

            {activeTab === 'services' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                    <label className="block text-sm font-semibold mb-2" htmlFor="customer-comments">Customer Comments</label>
                    <textarea
                      id="customer-comments"
                      className="form-textarea w-full min-h-24"
                      placeholder="Customer comments..."
                      value={form.customer_comments}
                      disabled={!canEdit}
                      onChange={(e) => setForm((current) => ({ ...current, customer_comments: e.target.value }))}
                    />
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                    <label className="block text-sm font-semibold mb-2" htmlFor="recommendations">Recommendations</label>
                    <textarea
                      id="recommendations"
                      className="form-textarea w-full min-h-24"
                      placeholder="Recommendations..."
                      value={form.recommendations}
                      disabled={!canEdit}
                      onChange={(e) => setForm((current) => ({ ...current, recommendations: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="search"
                    className="form-input w-full"
                    placeholder="Search and Browse Services"
                    disabled
                  />
                  {canEdit && (
                    <button
                      type="button"
                      onClick={addService}
                      className="shrink-0 text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      + New Service
                    </button>
                  )}
                </div>

                {form.services.map((service) => (
                  <div key={service.key} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700/60">
                      <input
                        className="form-input flex-1 min-w-[200px]"
                        placeholder="Enter name for this service..."
                        value={service.name}
                        disabled={!canEdit}
                        onChange={(e) => updateService(service.key, { name: e.target.value })}
                      />
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        service.authorized
                          ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        {service.authorized ? 'Authorized' : 'Not Authorized'}
                      </span>
                      {canEdit && (
                        <button
                          type="button"
                          className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
                          onClick={() => updateService(service.key, { authorized: !service.authorized })}
                        >
                          {service.authorized ? 'Revoke' : 'Authorize'}
                        </button>
                      )}
                    </div>

                    <div className="px-4 py-3">
                      <textarea
                        className="form-textarea w-full"
                        placeholder="Add Note..."
                        value={service.notes}
                        disabled={!canEdit}
                        onChange={(e) => updateService(service.key, { notes: e.target.value })}
                      />
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs uppercase text-gray-500 bg-gray-50 dark:bg-gray-900/40">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold w-12">#</th>
                            <th className="px-4 py-2 text-left font-semibold">Items</th>
                            <th className="px-4 py-2 text-left font-semibold w-28">Price</th>
                            <th className="px-4 py-2 text-left font-semibold w-24">Qty / Hrs</th>
                            <th className="px-4 py-2 text-left font-semibold w-24">Disc</th>
                            <th className="px-4 py-2 text-left font-semibold w-24">Status</th>
                            <th className="px-4 py-2 text-right font-semibold w-28">Subtotal</th>
                            <th className="px-2 py-2 w-8" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                          {service.line_items.map((item, index) => (
                            <tr key={item.key}>
                              <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{index + 1}</td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    className="form-input w-full"
                                    placeholder={`Enter ${item.type} description`}
                                    value={item.description}
                                    disabled={!canEdit}
                                    onChange={(e) => updateLineItem(service.key, item.key, { description: e.target.value })}
                                  />
                                  <span className="shrink-0 text-xs capitalize text-gray-400">{item.type}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  className="form-input w-full"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.price}
                                  disabled={!canEdit}
                                  onChange={(e) => updateLineItem(service.key, item.key, { price: e.target.value })}
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  className="form-input w-full"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.quantity}
                                  disabled={!canEdit}
                                  onChange={(e) => updateLineItem(service.key, item.key, { quantity: e.target.value })}
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  className="form-input w-full"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.discount}
                                  disabled={!canEdit}
                                  onChange={(e) => updateLineItem(service.key, item.key, { discount: e.target.value })}
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  className="form-input w-full"
                                  value={item.status}
                                  disabled={!canEdit}
                                  onChange={(e) => updateLineItem(service.key, item.key, { status: e.target.value })}
                                />
                              </td>
                              <td className="px-4 py-2 text-right font-medium">{money(lineSubtotal(item))}</td>
                              <td className="px-2 py-2">
                                {canEdit && (
                                  <button
                                    type="button"
                                    className="text-gray-400 hover:text-red-500"
                                    onClick={() => removeLineItem(service.key, item.key)}
                                    aria-label="Remove item"
                                  >
                                    ×
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {canEdit && (
                      <div className="px-4 py-3 flex flex-wrap gap-3 text-sm">
                        {options.item_types.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            className="text-violet-600 dark:text-violet-400 hover:underline"
                            onClick={() => addLineItem(service.key, type.value)}
                          >
                            Add {type.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700/60 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                      <label className="flex items-center gap-1">
                        Discount
                        <input
                          className="form-input w-16 py-1"
                          type="number"
                          min="0"
                          max="100"
                          step="0.001"
                          value={service.discount_percent}
                          disabled={!canEdit}
                          onChange={(e) => updateService(service.key, { discount_percent: e.target.value })}
                        />
                        %
                      </label>
                      <label className="flex items-center gap-1">
                        EPA
                        <input
                          className="form-input w-16 py-1"
                          type="number"
                          min="0"
                          max="100"
                          step="0.001"
                          value={service.epa_percent}
                          disabled={!canEdit}
                          onChange={(e) => updateService(service.key, { epa_percent: e.target.value })}
                        />
                        %
                      </label>
                      <label className="flex items-center gap-1">
                        Shop Supplies
                        <input
                          className="form-input w-16 py-1"
                          type="number"
                          min="0"
                          max="100"
                          step="0.001"
                          value={service.shop_supplies_percent}
                          disabled={!canEdit}
                          onChange={(e) => updateService(service.key, { shop_supplies_percent: e.target.value })}
                        />
                        %
                      </label>
                      <label className="flex items-center gap-1">
                        Tax
                        <input
                          className="form-input w-16 py-1"
                          type="number"
                          min="0"
                          max="100"
                          step="0.001"
                          value={service.tax_percent}
                          disabled={!canEdit}
                          onChange={(e) => updateService(service.key, { tax_percent: e.target.value })}
                        />
                        %
                      </label>
                      <span className="ml-auto font-semibold text-gray-800 dark:text-gray-100">
                        {money(serviceSubtotal(service))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-400">Due Date</span>
                <input
                  type="date"
                  className="form-input py-1 text-sm"
                  value={form.due_date}
                  disabled={!canEdit}
                  onChange={(e) => setForm((current) => ({ ...current, due_date: e.target.value }))}
                />
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">Estimate</span>
                <span className="font-medium">{estimateNumber}</span>
              </div>
              <div>
                <label className="block text-gray-500 mb-1" htmlFor="service-writer">Service Writer</label>
                <select
                  id="service-writer"
                  className="form-select w-full"
                  value={form.service_writer_id}
                  disabled={!canEdit}
                  onChange={(e) => setForm((current) => ({ ...current, service_writer_id: e.target.value }))}
                >
                  <option value="">Select</option>
                  {options.service_writers.map((writer) => (
                    <option key={writer.id} value={writer.id}>{writer.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">Created</span>
                <span>{createdAt ? new Date(createdAt).toLocaleString() : '—'}</span>
              </div>
              <div>
                <label className="block text-gray-500 mb-1" htmlFor="po-number">PO Number</label>
                <input
                  id="po-number"
                  className="form-input w-full"
                  value={form.po_number}
                  disabled={!canEdit}
                  onChange={(e) => setForm((current) => ({ ...current, po_number: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1" htmlFor="completed-at">Completed</label>
                <input
                  id="completed-at"
                  type="date"
                  className="form-input w-full"
                  value={form.completed_at}
                  disabled={!canEdit}
                  onChange={(e) => setForm((current) => ({ ...current, completed_at: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1" htmlFor="payment-terms">Payment Terms</label>
                <select
                  id="payment-terms"
                  className="form-select w-full"
                  value={form.payment_terms}
                  disabled={!canEdit}
                  onChange={(e) => setForm((current) => ({ ...current, payment_terms: e.target.value }))}
                >
                  {options.payment_terms.map((term) => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Authorization</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {form.authorized ? 'Authorized' : 'Not yet authorized'} · {money(totals.grand)}
                </p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, authorized: !current.authorized }))}
                    className="btn w-full bg-violet-600 text-white hover:bg-violet-500"
                  >
                    {form.authorized ? 'Revoke Authorization' : 'Authorize'}
                  </button>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Order Status</p>
                <div className="inline-flex w-full rounded-md border border-gray-200 dark:border-gray-700 p-0.5">
                  {(['estimate', 'invoice'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setForm((current) => ({ ...current, order_status: status }))}
                      className={`flex-1 rounded px-3 py-1.5 text-sm uppercase ${
                        form.order_status === status
                          ? 'bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-800'
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-400 mb-2" htmlFor="workflow">Workflow</label>
                <select
                  id="workflow"
                  className="form-select w-full"
                  value={form.workflow}
                  disabled={!canEdit}
                  onChange={(e) => setForm((current) => ({ ...current, workflow: e.target.value as EstimateWorkflow }))}
                >
                  {options.workflows.map((workflow) => (
                    <option key={workflow.value} value={workflow.value}>{workflow.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Total Parts</span><span>{money(totals.parts)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total Labor</span><span>{money(totals.labor)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total Tires</span><span>{money(totals.tires)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total Subcontract</span><span>{money(totals.subcontract)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total Fees</span><span>{money(totals.fees)}</span></div>
              <div className="flex justify-between border-t border-gray-100 dark:border-gray-700 pt-2 font-semibold">
                <span>Grand Total</span>
                <span>{money(totals.grand)}</span>
              </div>
            </div>

            {canEdit && (
              <button
                type="submit"
                disabled={submitting}
                className="btn w-full bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 disabled:opacity-60"
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
            )}
          </aside>
        </div>
      </form>

      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">Add New Customer</h3>
              <button type="button" className="text-gray-400 hover:text-gray-600" onClick={() => setShowCustomerModal(false)}>×</button>
            </div>
            <form onSubmit={(e) => { void handleCreateCustomer(e); }} className="px-5 py-4 space-y-4">
              {customerErrors.form && <p className="text-sm text-red-500">{customerErrors.form[0]}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="new-customer-first">First Name</label>
                  <input
                    id="new-customer-first"
                    className="form-input w-full"
                    value={customerForm.first_name}
                    onChange={(e) => setCustomerForm((current) => ({ ...current, first_name: e.target.value }))}
                    required
                  />
                  {customerErrors.first_name && <p className="mt-1 text-xs text-red-500">{customerErrors.first_name[0]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="new-customer-last">Last Name</label>
                  <input
                    id="new-customer-last"
                    className="form-input w-full"
                    value={customerForm.last_name}
                    onChange={(e) => setCustomerForm((current) => ({ ...current, last_name: e.target.value }))}
                    required
                  />
                  {customerErrors.last_name && <p className="mt-1 text-xs text-red-500">{customerErrors.last_name[0]}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="new-customer-phone">Phone 1 (Main)</label>
                <input
                  id="new-customer-phone"
                  className="form-input w-full"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm((current) => ({ ...current, phone: formatUsPhone(e.target.value) }))}
                  required
                />
                {customerErrors.phone && <p className="mt-1 text-xs text-red-500">{customerErrors.phone[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="new-customer-email">Email (optional)</label>
                <input
                  id="new-customer-email"
                  className="form-input w-full"
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm((current) => ({ ...current, email: e.target.value }))}
                />
                {customerErrors.email && <p className="mt-1 text-xs text-red-500">{customerErrors.email[0]}</p>}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn border border-gray-200 dark:border-gray-700" onClick={() => setShowCustomerModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={creatingCustomer} className="btn bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-60">
                  {creatingCustomer ? 'Creating...' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 sticky top-0 bg-white dark:bg-gray-800">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">Add New Vehicle</h3>
              <button type="button" className="text-gray-400 hover:text-gray-600" onClick={() => setShowVehicleModal(false)}>×</button>
            </div>
            <form onSubmit={(e) => { void handleCreateVehicle(e); }} className="px-5 py-4 space-y-4">
              {vehicleErrors.form && <p className="text-sm text-red-500">{vehicleErrors.form[0]}</p>}
              <p className="text-sm text-gray-500">
                Customer: {options.customers.find((customer) => String(customer.id) === form.customer_id)?.name ?? '—'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="new-vehicle-year">Year</label>
                  <input
                    id="new-vehicle-year"
                    className="form-input w-full"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 2}
                    value={vehicleForm.year}
                    onChange={(e) => setVehicleForm((current) => ({ ...current, year: e.target.value }))}
                    required
                  />
                  {vehicleErrors.year && <p className="mt-1 text-xs text-red-500">{vehicleErrors.year[0]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="new-vehicle-make">Make</label>
                  <input
                    id="new-vehicle-make"
                    className="form-input w-full"
                    value={vehicleForm.make}
                    onChange={(e) => setVehicleForm((current) => ({ ...current, make: e.target.value }))}
                    required
                  />
                  {vehicleErrors.make && <p className="mt-1 text-xs text-red-500">{vehicleErrors.make[0]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="new-vehicle-model">Model</label>
                  <input
                    id="new-vehicle-model"
                    className="form-input w-full"
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm((current) => ({ ...current, model: e.target.value }))}
                    required
                  />
                  {vehicleErrors.model && <p className="mt-1 text-xs text-red-500">{vehicleErrors.model[0]}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="new-vehicle-sub-model">Sub Model</label>
                  <input
                    id="new-vehicle-sub-model"
                    className="form-input w-full"
                    value={vehicleForm.sub_model}
                    onChange={(e) => setVehicleForm((current) => ({ ...current, sub_model: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="new-vehicle-type">Type</label>
                  <select
                    id="new-vehicle-type"
                    className="form-select w-full"
                    value={vehicleForm.type}
                    onChange={(e) => setVehicleForm((current) => ({ ...current, type: e.target.value }))}
                    required
                  >
                    <option value="">Select type</option>
                    {vehicleOptions.types.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {vehicleErrors.type && <p className="mt-1 text-xs text-red-500">{vehicleErrors.type[0]}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="new-vehicle-transmission">Transmission</label>
                  <select
                    id="new-vehicle-transmission"
                    className="form-select w-full"
                    value={vehicleForm.transmission}
                    onChange={(e) => setVehicleForm((current) => ({ ...current, transmission: e.target.value }))}
                  >
                    <option value="">Select</option>
                    {vehicleOptions.transmissions.map((transmission) => (
                      <option key={transmission} value={transmission}>{transmission}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="new-vehicle-drivetrain">Drivetrain</label>
                  <select
                    id="new-vehicle-drivetrain"
                    className="form-select w-full"
                    value={vehicleForm.drivetrain}
                    onChange={(e) => setVehicleForm((current) => ({ ...current, drivetrain: e.target.value }))}
                  >
                    <option value="">Select</option>
                    {vehicleOptions.drivetrains.map((drivetrain) => (
                      <option key={drivetrain} value={drivetrain}>{drivetrain}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="new-vehicle-engine">Engine Size</label>
                  <input
                    id="new-vehicle-engine"
                    className="form-input w-full"
                    value={vehicleForm.engine_size}
                    onChange={(e) => setVehicleForm((current) => ({ ...current, engine_size: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="new-vehicle-mileage">Mileage</label>
                  <input
                    id="new-vehicle-mileage"
                    className="form-input w-full"
                    type="number"
                    min="0"
                    value={vehicleForm.mileage}
                    onChange={(e) => setVehicleForm((current) => ({ ...current, mileage: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="new-vehicle-vin">VIN #</label>
                  <input
                    id="new-vehicle-vin"
                    className="form-input w-full"
                    value={vehicleForm.vin}
                    onChange={(e) => setVehicleForm((current) => ({ ...current, vin: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn border border-gray-200 dark:border-gray-700" onClick={() => setShowVehicleModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={creatingVehicle} className="btn bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-60">
                  {creatingVehicle ? 'Creating...' : 'Create Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
