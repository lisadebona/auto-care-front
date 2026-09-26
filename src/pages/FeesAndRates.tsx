import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { isAxiosError } from 'axios';
import ModulePage from '../components/ModulePage';
import apiClient from '../api/axios';
import { usePermission } from '../hooks/usePermission';
import type { FeeSettings, FeeType, ShopSuppliesCap, ValidationErrors } from '../types';

const cardClass = 'space-y-5 rounded-lg bg-gray-50 dark:bg-gray-900/40 p-5';
const headingClass = 'text-sm font-semibold text-gray-800 dark:text-gray-100';

type FeeSettingsForm = Omit<FeeSettings, 'shop_supplies_cap_amount'> & {
  shop_supplies_cap_amount: string;
};

type BooleanField = {
  [K in keyof FeeSettingsForm]: FeeSettingsForm[K] extends boolean ? K : never;
}[keyof FeeSettingsForm];

const emptyForm: FeeSettingsForm = {
  shop_supplies_cap: 'none',
  shop_supplies_cap_amount: '',
  shop_supplies_fee: '0.000',
  shop_supplies_fee_type: 'percent',
  shop_supplies_on_parts: false,
  shop_supplies_on_labor: false,
  epa_rate: '0.000',
  epa_on_parts: false,
  epa_on_labor: false,
  tax_rate: '0.000',
  tax_on_parts: false,
  tax_on_labor: false,
  tax_on_epa: false,
  tax_on_shop_supplies: false,
  tax_on_subcontract: false,
};

const toForm = (settings: FeeSettings): FeeSettingsForm => ({
  ...settings,
  shop_supplies_cap_amount: settings.shop_supplies_cap_amount ?? '',
});

type SegmentedControlProps<T extends string> = {
  options: Array<{ value: T; label: string }>;
  value: T;
  disabled?: boolean;
  onChange: (value: T) => void;
};

function SegmentedControl<T extends string>({ options, value, disabled = false, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`rounded px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${
            value === option.value
              ? 'bg-violet-500/15 font-medium text-violet-600 dark:text-violet-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

type AmountInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  step?: string;
  disabled?: boolean;
};

function AmountInput({ id, value, onChange, prefix, suffix, step = '0.01', disabled = false }: AmountInputProps) {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-500">{prefix}</span>
      )}
      <input
        id={id}
        type="number"
        min="0"
        step={step}
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`form-input w-full disabled:opacity-60 ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-8' : ''}`}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">{suffix}</span>
      )}
    </div>
  );
}

type IncludeOptionsProps = {
  title: string;
  options: Array<{ field: BooleanField; label: string }>;
  data: FeeSettingsForm;
  disabled?: boolean;
  setData: Dispatch<SetStateAction<FeeSettingsForm>>;
};

function IncludeOptions({ title, options, data, disabled = false, setData }: IncludeOptionsProps) {
  return (
    <fieldset>
      <legend className={`${headingClass} mb-3`}>{title}</legend>
      <div className="space-y-3">
        {options.map(({ field, label }) => (
          <label key={field} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-violet-500 focus:ring-violet-500"
              checked={data[field]}
              disabled={disabled}
              onChange={(e) => setData((current) => ({ ...current, [field]: e.target.checked }))}
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function FeesAndRates() {
  const { hasPermission } = usePermission();
  const canEdit = hasPermission('fees-and-rates.edit');
  const [data, setData] = useState<FeeSettingsForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await apiClient.get<{ settings: FeeSettings }>('/api/settings/fees-and-rates');
        setData(toForm(response.data.settings));
      } catch (err: unknown) {
        if (isAxiosError(err)) {
          const apiMessage = err.response?.data?.message;
          setError(typeof apiMessage === 'string' ? apiMessage : 'Unable to load fees and rates.');
        } else {
          setError('Unable to load fees and rates.');
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    setMessage('');
    setSubmitting(true);

    try {
      const response = await apiClient.put<{ settings: FeeSettings; message?: string }>('/api/settings/fees-and-rates', {
        ...data,
        shop_supplies_cap_amount: data.shop_supplies_cap === 'order' ? data.shop_supplies_cap_amount : '',
      });
      setData(toForm(response.data.settings));
      setMessage(response.data.message ?? 'Fees & rates saved.');
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        setFieldErrors((err.response.data as { errors?: ValidationErrors }).errors ?? {});
      } else if (isAxiosError(err)) {
        const apiMessage = err.response?.data?.message;
        setError(typeof apiMessage === 'string' ? apiMessage : 'Unable to save fees and rates.');
      } else {
        setError('Unable to save fees and rates.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModulePage title="Fees & Rates" description="Configure shop supplies, EPA, and tax rates.">
      {loading && <div className="py-8 text-sm text-center text-gray-500">Loading fees and rates…</div>}
      {!loading && error && <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{error}</div>}
      {!loading && (
        <form onSubmit={(e) => { void handleSubmit(e); }} className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-hidden">
          {message && <div className="mx-6 mt-6 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-sm px-3 py-2">{message}</div>}
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
            <section className={cardClass}>
              <div>
                <h2 className={`${headingClass} mb-2`}>Shop Supplies</h2>
                <p className="mb-2 text-xs text-gray-500">No Cap charges the full fee. Order Cap limits the fee to a maximum amount per order.</p>
                <SegmentedControl<ShopSuppliesCap>
                  value={data.shop_supplies_cap}
                  disabled={!canEdit}
                  onChange={(value) => setData((current) => ({ ...current, shop_supplies_cap: value }))}
                  options={[
                    { value: 'none', label: 'No Cap' },
                    { value: 'order', label: 'Order Cap' },
                  ]}
                />
                {fieldErrors.shop_supplies_cap && <p className="mt-1 text-xs text-red-500">{fieldErrors.shop_supplies_cap[0]}</p>}
              </div>

              {data.shop_supplies_cap === 'order' && (
                <div>
                  <label htmlFor="shop_supplies_cap_amount" className={`${headingClass} mb-2 block`}>Cap Amount</label>
                  <AmountInput
                    id="shop_supplies_cap_amount"
                    value={data.shop_supplies_cap_amount}
                    prefix="$"
                    disabled={!canEdit}
                    onChange={(value) => setData((current) => ({ ...current, shop_supplies_cap_amount: value }))}
                  />
                  {fieldErrors.shop_supplies_cap_amount && <p className="mt-1 text-xs text-red-500">{fieldErrors.shop_supplies_cap_amount[0]}</p>}
                </div>
              )}

              <div>
                <label htmlFor="shop_supplies_fee" className={`${headingClass} mb-2 block`}>Shop Supplies Fee</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <AmountInput
                      id="shop_supplies_fee"
                      value={data.shop_supplies_fee}
                      step={data.shop_supplies_fee_type === 'percent' ? '0.001' : '0.01'}
                      prefix={data.shop_supplies_fee_type === 'fixed' ? '$' : undefined}
                      suffix={data.shop_supplies_fee_type === 'percent' ? '%' : undefined}
                      disabled={!canEdit}
                      onChange={(value) => setData((current) => ({ ...current, shop_supplies_fee: value }))}
                    />
                  </div>
                  <SegmentedControl<FeeType>
                    value={data.shop_supplies_fee_type}
                    disabled={!canEdit}
                    onChange={(value) => setData((current) => ({ ...current, shop_supplies_fee_type: value }))}
                    options={[
                      { value: 'percent', label: '%' },
                      { value: 'fixed', label: '$' },
                    ]}
                  />
                </div>
                {fieldErrors.shop_supplies_fee && <p className="mt-1 text-xs text-red-500">{fieldErrors.shop_supplies_fee[0]}</p>}
              </div>

              <IncludeOptions
                title="Include Shop Supplies on:"
                data={data}
                disabled={!canEdit}
                setData={setData}
                options={[
                  { field: 'shop_supplies_on_parts', label: 'Parts' },
                  { field: 'shop_supplies_on_labor', label: 'Labor' },
                ]}
              />
            </section>

            <section className={cardClass}>
              <div>
                <label htmlFor="epa_rate" className={`${headingClass} mb-2 block`}>EPA</label>
                <AmountInput
                  id="epa_rate"
                  value={data.epa_rate}
                  step="0.001"
                  suffix="%"
                  disabled={!canEdit}
                  onChange={(value) => setData((current) => ({ ...current, epa_rate: value }))}
                />
                {fieldErrors.epa_rate && <p className="mt-1 text-xs text-red-500">{fieldErrors.epa_rate[0]}</p>}
              </div>
              <IncludeOptions
                title="Include EPA on:"
                data={data}
                disabled={!canEdit}
                setData={setData}
                options={[
                  { field: 'epa_on_parts', label: 'Parts' },
                  { field: 'epa_on_labor', label: 'Labor' },
                ]}
              />
            </section>

            <section className={cardClass}>
              <div>
                <label htmlFor="tax_rate" className={`${headingClass} mb-2 block`}>Tax</label>
                <AmountInput
                  id="tax_rate"
                  value={data.tax_rate}
                  step="0.001"
                  suffix="%"
                  disabled={!canEdit}
                  onChange={(value) => setData((current) => ({ ...current, tax_rate: value }))}
                />
                {fieldErrors.tax_rate && <p className="mt-1 text-xs text-red-500">{fieldErrors.tax_rate[0]}</p>}
              </div>
              <IncludeOptions
                title="Include Tax on:"
                data={data}
                disabled={!canEdit}
                setData={setData}
                options={[
                  { field: 'tax_on_parts', label: 'Parts' },
                  { field: 'tax_on_labor', label: 'Labor' },
                  { field: 'tax_on_epa', label: 'EPA' },
                  { field: 'tax_on_shop_supplies', label: 'Shop Supplies' },
                  { field: 'tax_on_subcontract', label: 'Subcontract' },
                ]}
              />
            </section>
          </div>

          {canEdit && (
            <div className="flex justify-end border-t border-gray-100 dark:border-gray-700/60 px-6 py-4">
              <button
                type="submit"
                disabled={submitting}
                className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:opacity-60"
              >
                {submitting ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      )}
    </ModulePage>
  );
}
