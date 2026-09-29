import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import ModulePage from '../components/ModulePage';
import { SortHeader, TablePagination } from '../components/TableControls';
import apiClient from '../api/axios';
import { usePermission } from '../hooks/usePermission';
import { useTableControls } from '../hooks/useTableControls';
import type { Customer, ValidationErrors, Vehicle } from '../types';
import { formatUsPhone } from '../utils/format';

const DEFAULT_COUNTRY = 'United States';

type CustomerTab = 'info' | 'vehicles' | 'notes';

type CustomerForm = {
  first_name: string;
  last_name: string;
  home_address: string;
  home_city: string;
  home_state: string;
  home_zip_code: string;
  home_country: string;
  office_address: string;
  office_city: string;
  office_state: string;
  office_zip_code: string;
  office_country: string;
  phone: string;
  phone_2: string;
  email: string;
  notes: string;
};

const emptyForm = (): CustomerForm => ({
  first_name: '',
  last_name: '',
  home_address: '',
  home_city: '',
  home_state: '',
  home_zip_code: '',
  home_country: DEFAULT_COUNTRY,
  office_address: '',
  office_city: '',
  office_state: '',
  office_zip_code: '',
  office_country: DEFAULT_COUNTRY,
  phone: '',
  phone_2: '',
  email: '',
  notes: '',
});

function formatAddress(parts: Array<string | null | undefined>): string {
  const line = parts.map((part) => part?.trim()).filter(Boolean).join(', ');
  return line || '—';
}

type AddressFieldsProps = {
  prefix: 'home' | 'office';
  title: string;
  form: CustomerForm;
  countries: string[];
  fieldErrors: ValidationErrors;
  onChange: (field: keyof CustomerForm, value: string) => void;
};

function AddressFields({ prefix, title, form, countries, fieldErrors, onChange }: AddressFieldsProps) {
  const addressKey = `${prefix}_address` as const;
  const cityKey = `${prefix}_city` as const;
  const stateKey = `${prefix}_state` as const;
  const zipKey = `${prefix}_zip_code` as const;
  const countryKey = `${prefix}_country` as const;

  return (
    <div className="space-y-4 border-t border-gray-100 dark:border-gray-700/60 pt-4">
      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h4>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor={`customer-${prefix}-address`}>Address</label>
        <input
          id={`customer-${prefix}-address`}
          className="form-input w-full"
          type="text"
          value={form[addressKey]}
          onChange={(e) => onChange(addressKey, e.target.value)}
        />
        {fieldErrors[addressKey] && <p className="mt-1 text-xs text-red-500">{fieldErrors[addressKey][0]}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor={`customer-${prefix}-city`}>City</label>
          <input
            id={`customer-${prefix}-city`}
            className="form-input w-full"
            type="text"
            value={form[cityKey]}
            onChange={(e) => onChange(cityKey, e.target.value)}
          />
          {fieldErrors[cityKey] && <p className="mt-1 text-xs text-red-500">{fieldErrors[cityKey][0]}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor={`customer-${prefix}-state`}>State</label>
          <input
            id={`customer-${prefix}-state`}
            className="form-input w-full"
            type="text"
            value={form[stateKey]}
            onChange={(e) => onChange(stateKey, e.target.value)}
          />
          {fieldErrors[stateKey] && <p className="mt-1 text-xs text-red-500">{fieldErrors[stateKey][0]}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor={`customer-${prefix}-zip`}>Zip Code</label>
          <input
            id={`customer-${prefix}-zip`}
            className="form-input w-full"
            type="text"
            value={form[zipKey]}
            onChange={(e) => onChange(zipKey, e.target.value)}
          />
          {fieldErrors[zipKey] && <p className="mt-1 text-xs text-red-500">{fieldErrors[zipKey][0]}</p>}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor={`customer-${prefix}-country`}>Country</label>
        <select
          id={`customer-${prefix}-country`}
          className="form-select w-full"
          value={form[countryKey]}
          onChange={(e) => onChange(countryKey, e.target.value)}
        >
          <option value="">Select country</option>
          {countries.map((country) => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>
        {fieldErrors[countryKey] && <p className="mt-1 text-xs text-red-500">{fieldErrors[countryKey][0]}</p>}
      </div>
    </div>
  );
}

const tabs: Array<{ id: CustomerTab; label: string }> = [
  { id: 'info', label: 'Customer Info' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'notes', label: 'Notes' },
];

export default function Customers() {
  const { hasPermission } = usePermission();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [countries, setCountries] = useState<string[]>([DEFAULT_COUNTRY]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<CustomerForm>(emptyForm());
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<CustomerTab>('info');
  const [customerVehicles, setCustomerVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState('');
  const table = useTableControls(customers, {
    name: (customer) => customer.name,
    phone: (customer) => customer.phone,
    email: (customer) => customer.email,
    address: (customer) => [
      customer.home_address,
      customer.home_city,
      customer.home_state,
      customer.home_zip_code,
      customer.home_country,
    ].filter(Boolean).join(', '),
  });
  const vehiclesTable = useTableControls(customerVehicles, {
    vehicle: (vehicle) => vehicle.name,
    vin: (vehicle) => vehicle.vin,
    mileage: (vehicle) => vehicle.mileage,
    type: (vehicle) => vehicle.type,
  });

  const loadCustomers = async (query = search) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get<{ customers: Customer[]; countries: string[] }>('/api/customers', {
        params: query ? { search: query } : {},
      });
      setCustomers(response.data.customers);
      setCountries(response.data.countries);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Unable to load customers.');
      } else {
        setError('Unable to load customers.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCustomers(search);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!editingCustomer || activeTab !== 'vehicles') {
      return;
    }

    const loadVehicles = async () => {
      setVehiclesLoading(true);
      setVehiclesError('');
      try {
        const response = await apiClient.get<{ vehicles: Vehicle[] }>('/api/vehicles', {
          params: { customer_id: editingCustomer.id },
        });
        setCustomerVehicles(response.data.vehicles);
      } catch (err: unknown) {
        if (isAxiosError(err)) {
          const message = err.response?.data?.message;
          setVehiclesError(typeof message === 'string' ? message : 'Unable to load vehicles.');
        } else {
          setVehiclesError('Unable to load vehicles.');
        }
      } finally {
        setVehiclesLoading(false);
      }
    };

    void loadVehicles();
  }, [editingCustomer, activeTab]);

  const closeModal = () => {
    setIsCreating(false);
    setEditingCustomer(null);
    setForm(emptyForm());
    setFieldErrors({});
    setActiveTab('info');
    setCustomerVehicles([]);
    setVehiclesError('');
  };

  const openCreate = () => {
    setFieldErrors({});
    setForm(emptyForm());
    setEditingCustomer(null);
    setActiveTab('info');
    setCustomerVehicles([]);
    setIsCreating(true);
  };

  const openEdit = (customer: Customer) => {
    setFieldErrors({});
    setIsCreating(false);
    setEditingCustomer(customer);
    setActiveTab('info');
    setForm({
      first_name: customer.first_name,
      last_name: customer.last_name,
      home_address: customer.home_address ?? '',
      home_city: customer.home_city ?? '',
      home_state: customer.home_state ?? '',
      home_zip_code: customer.home_zip_code ?? '',
      home_country: customer.home_country ?? DEFAULT_COUNTRY,
      office_address: customer.office_address ?? '',
      office_city: customer.office_city ?? '',
      office_state: customer.office_state ?? '',
      office_zip_code: customer.office_zip_code ?? '',
      office_country: customer.office_country ?? DEFAULT_COUNTRY,
      phone: formatUsPhone(customer.phone ?? ''),
      phone_2: formatUsPhone(customer.phone_2 ?? ''),
      email: customer.email ?? '',
      notes: customer.notes ?? '',
    });
  };

  const setFormField = (field: keyof CustomerForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    setSubmitting(true);

    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      home_address: form.home_address || null,
      home_city: form.home_city || null,
      home_state: form.home_state || null,
      home_zip_code: form.home_zip_code || null,
      home_country: form.home_country || DEFAULT_COUNTRY,
      office_address: form.office_address || null,
      office_city: form.office_city || null,
      office_state: form.office_state || null,
      office_zip_code: form.office_zip_code || null,
      office_country: form.office_country || DEFAULT_COUNTRY,
      phone: form.phone,
      phone_2: form.phone_2 || null,
      email: form.email || null,
      notes: form.notes || null,
    };

    try {
      if (editingCustomer) {
        await apiClient.put(`/api/customers/${editingCustomer.id}`, payload);
      } else {
        await apiClient.post('/api/customers', payload);
      }
      closeModal();
      await loadCustomers();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        const errors = (err.response.data as { errors?: ValidationErrors }).errors ?? {};
        setFieldErrors(errors);
        if (errors.notes) {
          setActiveTab('notes');
        } else if (errors.first_name || errors.last_name || errors.phone || errors.phone_2 || errors.email
          || errors.home_address || errors.office_address
          || errors.home_country || errors.office_country) {
          setActiveTab('info');
        }
      } else if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setFieldErrors({ form: [typeof message === 'string' ? message : 'Unable to save customer.'] });
      } else {
        setFieldErrors({ form: ['Unable to save customer.'] });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!window.confirm(`Are you sure you want to delete "${customer.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/api/customers/${customer.id}`);
      await loadCustomers();
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Unable to delete customer.');
      }
    }
  };

  const modalOpen = isCreating || editingCustomer !== null;

  return (
    <ModulePage
      title="Customers"
      description="Manage shop customers and their contact details."
      action={hasPermission('customers.create') ? (
        <button
          type="button"
          onClick={openCreate}
          className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
        >
          Add New Customer
        </button>
      ) : undefined}
    >
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            table.setPage(1);
          }}
          className="form-input w-full max-w-xs"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl">
        <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Customers</h2>
        </header>

        <div className="p-3">
          {loading && (
            <div className="px-2 py-8 text-sm text-center text-gray-500 dark:text-gray-400">Loading customers…</div>
          )}

          {!loading && error && (
            <div className="mx-2 mb-2 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{error}</div>
          )}

          {!loading && !error && customers.length === 0 && (
            <div className="px-2 py-8 text-sm text-center text-gray-500 dark:text-gray-400">No customers found.</div>
          )}

          {!loading && !error && customers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table-auto w-full">
                <thead className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="p-2 w-12 whitespace-nowrap"><div className="font-semibold text-left">#</div></th>
                    <th className="p-2 whitespace-nowrap text-left"><SortHeader label="Name" column="name" table={table} /></th>
                    <th className="p-2 whitespace-nowrap text-left"><SortHeader label="Phone" column="phone" table={table} /></th>
                    <th className="p-2 whitespace-nowrap text-left"><SortHeader label="Email" column="email" table={table} /></th>
                    <th className="p-2 whitespace-nowrap text-left"><SortHeader label="Home Address" column="address" table={table} /></th>
                    <th className="p-2 whitespace-nowrap"><div className="font-semibold text-right">Actions</div></th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-700/60">
                  {table.pageRows.map((customer, index) => (
                    <tr key={customer.id}>
                      <td className="p-2 whitespace-nowrap text-gray-500 dark:text-gray-400">{table.offset + index + 1}</td>
                      <td className="p-2 whitespace-nowrap">
                        <div className="font-medium text-gray-800 dark:text-gray-100">{customer.name}</div>
                      </td>
                      <td className="p-2 whitespace-nowrap text-gray-600 dark:text-gray-300">{customer.phone}</td>
                      <td className="p-2 whitespace-nowrap text-gray-600 dark:text-gray-300">{customer.email || '—'}</td>
                      <td className="p-2 text-gray-600 dark:text-gray-300">
                        {formatAddress([
                          customer.home_address,
                          customer.home_city,
                          customer.home_state,
                          customer.home_zip_code,
                          customer.home_country,
                        ])}
                      </td>
                      <td className="p-2 whitespace-nowrap text-right space-x-3">
                        {hasPermission('customers.edit') && (
                          <button
                            type="button"
                            onClick={() => openEdit(customer)}
                            className="text-sm font-medium text-violet-500 hover:text-violet-600"
                          >
                            Edit
                          </button>
                        )}
                        {hasPermission('customers.delete') && (
                          <button
                            type="button"
                            onClick={() => { void handleDelete(customer); }}
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
          {!loading && !error && <TablePagination table={table} className="-mx-3 -mb-3 mt-3" />}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-lg">
            <div className="shrink-0 px-6 pt-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {editingCustomer ? 'Edit Customer' : 'Create New Customer'}
              </h3>

              {fieldErrors.form && (
                <div className="mt-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{fieldErrors.form[0]}</div>
              )}

              <div className="mt-4 flex gap-1 border-b border-gray-200 dark:border-gray-700">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                      activeTab === tab.id
                        ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={(e) => { void handleSubmit(e); }} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                {activeTab === 'info' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" htmlFor="customer-first-name">First Name</label>
                        <input
                          id="customer-first-name"
                          className="form-input w-full"
                          type="text"
                          value={form.first_name}
                          onChange={(e) => setFormField('first_name', e.target.value)}
                          required
                        />
                        {fieldErrors.first_name && <p className="mt-1 text-xs text-red-500">{fieldErrors.first_name[0]}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1" htmlFor="customer-last-name">Last Name</label>
                        <input
                          id="customer-last-name"
                          className="form-input w-full"
                          type="text"
                          value={form.last_name}
                          onChange={(e) => setFormField('last_name', e.target.value)}
                          required
                        />
                        {fieldErrors.last_name && <p className="mt-1 text-xs text-red-500">{fieldErrors.last_name[0]}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1" htmlFor="customer-phone">Phone 1 (Main)</label>
                      <input
                        id="customer-phone"
                        className="form-input w-full"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        placeholder="(555) 123-4567"
                        value={form.phone}
                        onChange={(e) => setFormField('phone', formatUsPhone(e.target.value))}
                        required
                      />
                      {fieldErrors.phone && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone[0]}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1" htmlFor="customer-phone-2">
                        Phone 2 <span className="font-normal text-gray-400">(optional)</span>
                      </label>
                      <input
                        id="customer-phone-2"
                        className="form-input w-full"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        placeholder="(555) 123-4567"
                        value={form.phone_2}
                        onChange={(e) => setFormField('phone_2', formatUsPhone(e.target.value))}
                      />
                      {fieldErrors.phone_2 && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone_2[0]}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1" htmlFor="customer-email">
                        Email Address <span className="font-normal text-gray-400">(optional)</span>
                      </label>
                      <input
                        id="customer-email"
                        className="form-input w-full"
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={(e) => setFormField('email', e.target.value)}
                      />
                      {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email[0]}</p>}
                    </div>

                    <AddressFields
                      prefix="home"
                      title="Home Address"
                      form={form}
                      countries={countries}
                      fieldErrors={fieldErrors}
                      onChange={setFormField}
                    />

                    <AddressFields
                      prefix="office"
                      title="Office Address"
                      form={form}
                      countries={countries}
                      fieldErrors={fieldErrors}
                      onChange={setFormField}
                    />
                  </>
                )}

                {activeTab === 'vehicles' && (
                  <div className="space-y-4">
                    {!editingCustomer && (
                      <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Save the customer first to manage their vehicles.
                      </div>
                    )}

                    {editingCustomer && (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Vehicles belonging to {editingCustomer.name}.
                          </p>
                          {hasPermission('vehicles.create') && (
                            <Link
                              to={`/vehicles?customer_id=${editingCustomer.id}`}
                              className="text-sm font-medium text-violet-500 hover:text-violet-600"
                              onClick={closeModal}
                            >
                              Add Vehicle
                            </Link>
                          )}
                        </div>

                        {vehiclesLoading && (
                          <div className="py-8 text-sm text-center text-gray-500 dark:text-gray-400">Loading vehicles…</div>
                        )}

                        {!vehiclesLoading && vehiclesError && (
                          <div className="rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{vehiclesError}</div>
                        )}

                        {!vehiclesLoading && !vehiclesError && customerVehicles.length === 0 && (
                          <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                            No vehicles for this customer yet.
                          </div>
                        )}

                        {!vehiclesLoading && !vehiclesError && customerVehicles.length > 0 && (
                          <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700/60">
                            <table className="table-auto w-full">
                              <thead className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                  <th className="p-2 w-12 whitespace-nowrap"><div className="font-semibold text-left">#</div></th>
                                  <th className="p-2 whitespace-nowrap text-left"><SortHeader label="Vehicle" column="vehicle" table={vehiclesTable} /></th>
                                  <th className="p-2 whitespace-nowrap text-left"><SortHeader label="VIN" column="vin" table={vehiclesTable} /></th>
                                  <th className="p-2 whitespace-nowrap text-left"><SortHeader label="Mileage" column="mileage" table={vehiclesTable} /></th>
                                  <th className="p-2 whitespace-nowrap text-left"><SortHeader label="Type" column="type" table={vehiclesTable} /></th>
                                </tr>
                              </thead>
                              <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-700/60">
                                {vehiclesTable.pageRows.map((vehicle, index) => (
                                  <tr key={vehicle.id}>
                                    <td className="p-2 whitespace-nowrap text-gray-500 dark:text-gray-400">{vehiclesTable.offset + index + 1}</td>
                                    <td className="p-2">
                                      <div className="font-medium text-gray-800 dark:text-gray-100">{vehicle.name}</div>
                                      {vehicle.engine_size && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{vehicle.engine_size}</div>
                                      )}
                                    </td>
                                    <td className="p-2 whitespace-nowrap text-gray-600 dark:text-gray-300">{vehicle.vin || '—'}</td>
                                    <td className="p-2 whitespace-nowrap text-gray-600 dark:text-gray-300">
                                      {vehicle.mileage != null ? vehicle.mileage.toLocaleString() : '—'}
                                    </td>
                                    <td className="p-2 whitespace-nowrap text-gray-600 dark:text-gray-300">{vehicle.type}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <TablePagination table={vehiclesTable} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="customer-notes">
                      Notes <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      id="customer-notes"
                      className="form-textarea w-full"
                      rows={8}
                      value={form.notes}
                      onChange={(e) => setFormField('notes', e.target.value)}
                    />
                    {fieldErrors.notes && <p className="mt-1 text-xs text-red-500">{fieldErrors.notes[0]}</p>}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800 px-6 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 text-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:opacity-60"
                >
                  {submitting ? 'Saving…' : editingCustomer ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ModulePage>
  );
}
