import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import ModulePage from '../components/ModulePage';
import { SortHeader, TablePagination } from '../components/TableControls';
import { DeleteButton, EditButton } from '../components/ActionButtons';
import apiClient, { postForm } from '../api/axios';
import { usePermission } from '../hooks/usePermission';
import { useTableControls } from '../hooks/useTableControls';
import type { Customer, ValidationErrors, Vehicle, VehicleOptions } from '../types';

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

type VehicleForm = {
  customer_id: string;
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

const emptyForm = (customerId = ''): VehicleForm => ({
  customer_id: customerId,
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

const emptyOptions = (): VehicleOptions => ({
  transmissions: [],
  drivetrains: [],
  types: [],
});

const labelClass = 'block text-sm font-medium mb-1';
const requiredMark = <span className="text-red-500"> *</span>;

function customerDisplayName(customer?: Vehicle['customer'] | Customer | null): string {
  if (!customer) {
    return '—';
  }

  if ('name' in customer && customer.name) {
    return customer.name;
  }

  return `${customer.first_name} ${customer.last_name}`.trim() || '—';
}

export default function Vehicles() {
  const { hasPermission } = usePermission();
  const [searchParams, setSearchParams] = useSearchParams();
  const imageInput = useRef<HTMLInputElement>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [options, setOptions] = useState<VehicleOptions>(emptyOptions());
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<VehicleForm>(emptyForm());
  const [image, setImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const table = useTableControls(vehicles, {
    vehicle: (vehicle) => vehicle.name,
    customer: (vehicle) => (vehicle.customer ? customerDisplayName(vehicle.customer) : null),
    vin: (vehicle) => vehicle.vin,
    mileage: (vehicle) => vehicle.mileage,
    type: (vehicle) => vehicle.type,
  });

  const loadVehicles = async (query = search, customerId = customerFilter) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get<{ vehicles: Vehicle[]; options: VehicleOptions }>('/api/vehicles', {
        params: {
          ...(query ? { search: query } : {}),
          ...(customerId ? { customer_id: customerId } : {}),
        },
      });
      setVehicles(response.data.vehicles);
      setOptions(response.data.options);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Unable to load vehicles.');
      } else {
        setError('Unable to load vehicles.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadVehicles(search, customerFilter);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search, customerFilter]);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const response = await apiClient.get<{ customers: Customer[] }>('/api/customers');
        setCustomers(response.data.customers);
      } catch {
        setCustomers([]);
      }
    };

    void loadCustomers();
  }, []);

  useEffect(() => {
    const customerId = searchParams.get('customer_id');
    if (!customerId) {
      return;
    }

    setFieldErrors({});
    setForm(emptyForm(customerId));
    setEditingVehicle(null);
    setImage(null);
    setRemoveImage(false);
    setImagePreview(null);
    setIsCreating(true);
    setCustomerFilter(customerId);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!image) {
      return;
    }

    const url = URL.createObjectURL(image);
    setImagePreview(url);

    return () => URL.revokeObjectURL(url);
  }, [image]);

  const closeModal = () => {
    setIsCreating(false);
    setEditingVehicle(null);
    setForm(emptyForm());
    setImage(null);
    setRemoveImage(false);
    setImagePreview(null);
    setIsDraggingImage(false);
    setFieldErrors({});
  };

  const openCreate = () => {
    setFieldErrors({});
    setForm(emptyForm(customerFilter));
    setEditingVehicle(null);
    setImage(null);
    setRemoveImage(false);
    setImagePreview(null);
    setIsCreating(true);
  };

  const openEdit = (vehicle: Vehicle) => {
    setFieldErrors({});
    setIsCreating(false);
    setEditingVehicle(vehicle);
    setForm({
      customer_id: vehicle.customer_id ? String(vehicle.customer_id) : '',
      year: String(vehicle.year),
      make: vehicle.make,
      model: vehicle.model,
      sub_model: vehicle.sub_model ?? '',
      transmission: vehicle.transmission ?? '',
      engine_size: vehicle.engine_size ?? '',
      drivetrain: vehicle.drivetrain ?? '',
      type: vehicle.type,
      mileage: vehicle.mileage != null ? String(vehicle.mileage) : '',
      vin: vehicle.vin ?? '',
    });
    setImage(null);
    setRemoveImage(false);
    setImagePreview(vehicle.image_url ?? null);
  };

  const setFormField = (field: keyof VehicleForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [field]: e.target.value }));
  };

  const applyImageFile = (file: File | null) => {
    if (!file) {
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFieldErrors((current) => ({
        ...current,
        image: ['Please choose a PNG, JPEG, or WebP image.'],
      }));
      return;
    }

    setFieldErrors((current) => {
      const { image: _ignored, ...rest } = current;
      return rest;
    });
    setImage(file);
    setRemoveImage(false);
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    applyImageFile(e.target.files?.[0] ?? null);
    e.target.value = '';
  };

  const handleImageDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(true);
  };

  const handleImageDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);
  };

  const handleImageDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);
    applyImageFile(e.dataTransfer.files?.[0] ?? null);
  };

  const handleRemoveImage = () => {
    setImage(null);
    setRemoveImage(true);
    setImagePreview(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    setSubmitting(true);

    const body = new FormData();
    body.append('customer_id', form.customer_id);
    body.append('year', form.year);
    body.append('make', form.make);
    body.append('model', form.model);
    body.append('sub_model', form.sub_model);
    body.append('transmission', form.transmission);
    body.append('engine_size', form.engine_size);
    body.append('drivetrain', form.drivetrain);
    body.append('type', form.type);
    body.append('mileage', form.mileage);
    body.append('vin', form.vin);
    body.append('remove_image', removeImage ? '1' : '0');
    if (image) {
      body.append('image', image);
    }

    try {
      if (editingVehicle) {
        await postForm(`/api/vehicles/${editingVehicle.id}`, body);
      } else {
        await postForm('/api/vehicles', body);
      }
      closeModal();
      await loadVehicles();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        setFieldErrors((err.response.data as { errors?: ValidationErrors }).errors ?? {});
      } else if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setFieldErrors({ form: [typeof message === 'string' ? message : 'Unable to save vehicle.'] });
      } else {
        setFieldErrors({ form: ['Unable to save vehicle.'] });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (vehicle: Vehicle) => {
    if (!window.confirm(`Are you sure you want to delete "${vehicle.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/api/vehicles/${vehicle.id}`);
      await loadVehicles();
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Unable to delete vehicle.');
      }
    }
  };

  const modalOpen = isCreating || editingVehicle !== null;

  return (
    <ModulePage
      title="Vehicles"
      description="Manage customer vehicles."
      action={hasPermission('vehicles.create') ? (
        <button
          type="button"
          onClick={openCreate}
          className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
        >
          Add New Vehicle
        </button>
      ) : undefined}
    >
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search vehicles..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            table.setPage(1);
          }}
          className="form-input w-full max-w-xs"
        />
        <select
          className="form-select w-full max-w-xs"
          value={customerFilter}
          onChange={(e) => {
            setCustomerFilter(e.target.value);
            table.setPage(1);
          }}
          aria-label="Filter by customer"
        >
          <option value="">All customers</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>{customer.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl">
        <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Vehicles</h2>
        </header>

        <div className="p-3">
          {loading && (
            <div className="px-2 py-8 text-sm text-center text-gray-500 dark:text-gray-400">Loading vehicles…</div>
          )}

          {!loading && error && (
            <div className="mx-2 mb-2 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{error}</div>
          )}

          {!loading && !error && vehicles.length === 0 && (
            <div className="px-2 py-8 text-sm text-center text-gray-500 dark:text-gray-400">No vehicles found.</div>
          )}

          {!loading && !error && vehicles.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table-auto w-full">
                <thead className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="p-2 w-12 whitespace-nowrap"><div className="font-semibold text-left">#</div></th>
                    <th className="p-2 whitespace-nowrap text-left"><SortHeader label="Vehicle" column="vehicle" table={table} /></th>
                    <th className="p-2 whitespace-nowrap text-left"><SortHeader label="Customer" column="customer" table={table} /></th>
                    <th className="p-2 whitespace-nowrap text-left"><SortHeader label="VIN" column="vin" table={table} /></th>
                    <th className="p-2 whitespace-nowrap text-left"><SortHeader label="Mileage" column="mileage" table={table} /></th>
                    <th className="p-2 whitespace-nowrap text-left"><SortHeader label="Type" column="type" table={table} /></th>
                    <th className="p-2 whitespace-nowrap"><div className="font-semibold text-right">Actions</div></th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-700/60">
                  {table.pageRows.map((vehicle, index) => (
                    <tr key={vehicle.id}>
                      <td className="p-2 whitespace-nowrap text-gray-500 dark:text-gray-400">{table.offset + index + 1}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-700">
                            {vehicle.image_url ? (
                              <img src={vehicle.image_url} alt={vehicle.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">N/A</div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 dark:text-gray-100">{vehicle.name}</div>
                            {vehicle.engine_size && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">{vehicle.engine_size}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 whitespace-nowrap text-gray-600 dark:text-gray-300">
                        {customerDisplayName(vehicle.customer)}
                      </td>
                      <td className="p-2 whitespace-nowrap text-gray-600 dark:text-gray-300">{vehicle.vin || '—'}</td>
                      <td className="p-2 whitespace-nowrap text-gray-600 dark:text-gray-300">
                        {vehicle.mileage != null ? vehicle.mileage.toLocaleString() : '—'}
                      </td>
                      <td className="p-2 whitespace-nowrap text-gray-600 dark:text-gray-300">{vehicle.type}</td>
                      <td className="p-2 whitespace-nowrap text-right space-x-1">
                        {hasPermission('vehicles.edit') && (
                          <EditButton
                            onClick={() => openEdit(vehicle)}
                          />
                        )}
                        {hasPermission('vehicles.delete') && (
                          <DeleteButton
                            onClick={() => { void handleDelete(vehicle); }}
                          />
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
                {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
              </h3>
              {fieldErrors.form && (
                <div className="mt-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{fieldErrors.form[0]}</div>
              )}
            </div>

            <form onSubmit={(e) => { void handleSubmit(e); }} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div>
                  <label className={labelClass} htmlFor="vehicle-customer">Customer Name{requiredMark}</label>
                  <select
                    id="vehicle-customer"
                    className="form-select w-full"
                    value={form.customer_id}
                    onChange={setFormField('customer_id')}
                    required
                  >
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                  {fieldErrors.customer_id && <p className="mt-1 text-xs text-red-500">{fieldErrors.customer_id[0]}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[11rem_1fr] gap-4">
                  <div>
                    <span className={labelClass}>Photo</span>
                    <div
                      onDragOver={handleImageDragOver}
                      onDragEnter={handleImageDragOver}
                      onDragLeave={handleImageDragLeave}
                      onDrop={handleImageDrop}
                      className={`mt-1 flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-md border border-dashed px-2 text-center transition ${
                        isDraggingImage
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40'
                      }`}
                    >
                      {imagePreview ? (
                        <img src={imagePreview} alt="Vehicle preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {isDraggingImage ? 'Drop image here' : 'Drag & drop image here'}
                          </p>
                          <p className="text-[11px] text-gray-400">or</p>
                          <button
                            type="button"
                            onClick={() => imageInput.current?.click()}
                            className="text-xs font-medium text-violet-500 hover:text-violet-600"
                          >
                            Browse files
                          </button>
                        </div>
                      )}
                    </div>
                    <input
                      ref={imageInput}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <div className="mt-2 flex flex-wrap gap-3">
                      {imagePreview && (
                        <>
                          <button
                            type="button"
                            onClick={() => imageInput.current?.click()}
                            className="text-xs font-medium text-violet-500 hover:text-violet-600"
                          >
                            Browse files
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="text-xs font-medium text-red-500 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400">PNG, JPEG or WebP, up to 2 MB.</p>
                    {fieldErrors.image && <p className="mt-1 text-xs text-red-500">{fieldErrors.image[0]}</p>}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className={labelClass} htmlFor="vehicle-year">Year{requiredMark}</label>
                      <input
                        id="vehicle-year"
                        className="form-input w-full"
                        type="number"
                        min="1900"
                        max={new Date().getFullYear() + 2}
                        value={form.year}
                        onChange={setFormField('year')}
                        required
                      />
                      {fieldErrors.year && <p className="mt-1 text-xs text-red-500">{fieldErrors.year[0]}</p>}
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="vehicle-make">Make{requiredMark}</label>
                      <input
                        id="vehicle-make"
                        className="form-input w-full"
                        type="text"
                        value={form.make}
                        onChange={setFormField('make')}
                        required
                      />
                      {fieldErrors.make && <p className="mt-1 text-xs text-red-500">{fieldErrors.make[0]}</p>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass} htmlFor="vehicle-model">Model{requiredMark}</label>
                    <input
                      id="vehicle-model"
                      className="form-input w-full"
                      type="text"
                      value={form.model}
                      onChange={setFormField('model')}
                      required
                    />
                    {fieldErrors.model && <p className="mt-1 text-xs text-red-500">{fieldErrors.model[0]}</p>}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="vehicle-sub-model">Sub Model</label>
                    <input
                      id="vehicle-sub-model"
                      className="form-input w-full"
                      type="text"
                      value={form.sub_model}
                      onChange={setFormField('sub_model')}
                    />
                    {fieldErrors.sub_model && <p className="mt-1 text-xs text-red-500">{fieldErrors.sub_model[0]}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass} htmlFor="vehicle-transmission">Transmission</label>
                    <select
                      id="vehicle-transmission"
                      className="form-select w-full"
                      value={form.transmission}
                      onChange={setFormField('transmission')}
                    >
                      <option value="">Select transmission</option>
                      {options.transmissions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {fieldErrors.transmission && <p className="mt-1 text-xs text-red-500">{fieldErrors.transmission[0]}</p>}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="vehicle-engine-size">Engine Size</label>
                    <input
                      id="vehicle-engine-size"
                      className="form-input w-full"
                      type="text"
                      value={form.engine_size}
                      onChange={setFormField('engine_size')}
                    />
                    {fieldErrors.engine_size && <p className="mt-1 text-xs text-red-500">{fieldErrors.engine_size[0]}</p>}
                  </div>
                </div>

                <div>
                  <label className={labelClass} htmlFor="vehicle-drivetrain">Drivetrain</label>
                  <select
                    id="vehicle-drivetrain"
                    className="form-select w-full"
                    value={form.drivetrain}
                    onChange={setFormField('drivetrain')}
                  >
                    <option value="">Select drivetrain</option>
                    {options.drivetrains.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {fieldErrors.drivetrain && <p className="mt-1 text-xs text-red-500">{fieldErrors.drivetrain[0]}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass} htmlFor="vehicle-type">Type{requiredMark}</label>
                    <select
                      id="vehicle-type"
                      className="form-select w-full"
                      value={form.type}
                      onChange={setFormField('type')}
                      required
                    >
                      <option value="">Select type</option>
                      {options.types.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {fieldErrors.type && <p className="mt-1 text-xs text-red-500">{fieldErrors.type[0]}</p>}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="vehicle-mileage">Mileage</label>
                    <input
                      id="vehicle-mileage"
                      className="form-input w-full"
                      type="number"
                      min="0"
                      value={form.mileage}
                      onChange={setFormField('mileage')}
                    />
                    {fieldErrors.mileage && <p className="mt-1 text-xs text-red-500">{fieldErrors.mileage[0]}</p>}
                  </div>
                </div>

                <div>
                  <label className={labelClass} htmlFor="vehicle-vin">VIN #</label>
                  <input
                    id="vehicle-vin"
                    className="form-input w-full"
                    type="text"
                    value={form.vin}
                    onChange={setFormField('vin')}
                  />
                  {fieldErrors.vin && <p className="mt-1 text-xs text-red-500">{fieldErrors.vin[0]}</p>}
                </div>
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
                  {submitting ? 'Saving…' : editingVehicle ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ModulePage>
  );
}
