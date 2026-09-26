import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import ModulePage from '../components/ModulePage';
import apiClient, { postForm } from '../api/axios';
import { usePermission } from '../hooks/usePermission';
import type { GeneralSettings as GeneralSettingsData, ValidationErrors } from '../types';

const labelClass = 'block text-sm font-medium mb-1';
const inputClass = 'form-input w-full disabled:opacity-60';

type GeneralSettingsForm = {
  company_name: string;
  website: string;
  email: string;
  phone: string;
  timezone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
};

const emptyForm: GeneralSettingsForm = {
  company_name: '',
  website: '',
  email: '',
  phone: '',
  timezone: 'UTC',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  country: 'United States',
};

const toForm = (settings: GeneralSettingsData): GeneralSettingsForm => ({
  company_name: settings.company_name ?? '',
  website: settings.website ?? '',
  email: settings.email ?? '',
  phone: settings.phone ?? '',
  timezone: settings.timezone,
  address: settings.address ?? '',
  city: settings.city ?? '',
  state: settings.state ?? '',
  zip_code: settings.zip_code ?? '',
  country: settings.country ?? 'United States',
});

export default function GeneralSettings() {
  const { hasPermission } = usePermission();
  const canEdit = hasPermission('general-settings.edit');
  const logoInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<GeneralSettingsForm>(emptyForm);
  const [timezones, setTimezones] = useState<string[]>(['UTC']);
  const [countries, setCountries] = useState<string[]>(['United States']);
  const [logo, setLogo] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    if (!logo) {
      return;
    }

    const url = URL.createObjectURL(logo);
    setLogoPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [logo]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await apiClient.get<{ settings: GeneralSettingsData; timezones: string[]; countries: string[] }>('/api/settings/general');
        setForm(toForm(response.data.settings));
        setTimezones(response.data.timezones);
        setCountries(response.data.countries);
        setLogoPreview(response.data.settings.logo_url);
      } catch (err: unknown) {
        if (isAxiosError(err)) {
          const apiMessage = err.response?.data?.message;
          setError(typeof apiMessage === 'string' ? apiMessage : 'Unable to load general settings.');
        } else {
          setError('Unable to load general settings.');
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const setField = (field: keyof GeneralSettingsForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [field]: e.target.value }));
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setLogo(file);
      setRemoveLogo(false);
    }
    e.target.value = '';
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    setRemoveLogo(true);
    setLogoPreview(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    setMessage('');
    setSubmitting(true);

    const body = new FormData();
    (Object.keys(form) as Array<keyof GeneralSettingsForm>).forEach((field) => {
      body.append(field, form[field]);
    });
    body.append('remove_logo', removeLogo ? '1' : '0');
    if (logo) {
      body.append('logo', logo);
    }

    try {
      const response = await postForm('/api/settings/general', body);
      const saved = response.data as { settings: GeneralSettingsData; message?: string };
      setForm(toForm(saved.settings));
      setLogo(null);
      setRemoveLogo(false);
      setLogoPreview(saved.settings.logo_url);
      setMessage(saved.message ?? 'General settings saved.');
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        setFieldErrors((err.response.data as { errors?: ValidationErrors }).errors ?? {});
      } else if (isAxiosError(err)) {
        const apiMessage = err.response?.data?.message;
        setError(typeof apiMessage === 'string' ? apiMessage : 'Unable to save general settings.');
      } else {
        setError('Unable to save general settings.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModulePage title="General Settings" description="Your company's information.">
      {loading && <div className="py-8 text-sm text-center text-gray-500">Loading settings…</div>}
      {!loading && error && <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{error}</div>}
      {!loading && (
        <form onSubmit={(e) => { void handleSubmit(e); }} className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-6 space-y-6 max-w-4xl">
          {message && <div className="rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-sm px-3 py-2">{message}</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="company_name">Company Name</label>
                <input id="company_name" className={inputClass} value={form.company_name} disabled={!canEdit} onChange={setField('company_name')} required />
                {fieldErrors.company_name && <p className="mt-1 text-xs text-red-500">{fieldErrors.company_name[0]}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="website">Website</label>
                <input id="website" className={inputClass} value={form.website} disabled={!canEdit} onChange={setField('website')} />
                {fieldErrors.website && <p className="mt-1 text-xs text-red-500">{fieldErrors.website[0]}</p>}
              </div>
              <div>
                <label className={labelClass} htmlFor="email">Email</label>
                <input id="email" className={inputClass} type="email" value={form.email} disabled={!canEdit} onChange={setField('email')} />
                {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email[0]}</p>}
              </div>
              <div>
                <label className={labelClass} htmlFor="phone">Phone</label>
                <input id="phone" className={inputClass} type="tel" value={form.phone} disabled={!canEdit} onChange={setField('phone')} />
                {fieldErrors.phone && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone[0]}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="timezone">Timezone</label>
                <select id="timezone" className="form-select w-full disabled:opacity-60" value={form.timezone} disabled={!canEdit} onChange={setField('timezone')}>
                  {timezones.map((timezone) => (
                    <option key={timezone} value={timezone}>{timezone.replaceAll('_', ' ')}</option>
                  ))}
                </select>
                {fieldErrors.timezone && <p className="mt-1 text-xs text-red-500">{fieldErrors.timezone[0]}</p>}
              </div>
            </div>

            <div>
              <span className={labelClass}>Company Logo</span>
              <div className="mt-1 flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40">
                {logoPreview ? (
                  <img src={logoPreview} alt="Company logo" className="h-full w-full object-contain p-2" />
                ) : (
                  <span className="text-sm text-gray-400">No logo</span>
                )}
              </div>
              <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} className="hidden" />
              {canEdit && (
                <div className="mt-2 flex gap-3">
                  <button type="button" onClick={() => logoInput.current?.click()} className="text-xs font-medium text-violet-500 hover:text-violet-600">
                    {logoPreview ? 'Change' : 'Upload'}
                  </button>
                  {logoPreview && (
                    <button type="button" onClick={handleRemoveLogo} className="text-xs font-medium text-red-500 hover:text-red-600">
                      Remove
                    </button>
                  )}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">PNG, JPEG or WebP, up to 2 MB.</p>
              {fieldErrors.logo && <p className="mt-1 text-xs text-red-500">{fieldErrors.logo[0]}</p>}
            </div>
          </div>

          <div className="space-y-4 border-t border-gray-100 dark:border-gray-700/60 pt-6">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Company Address</h2>
            <div>
              <label className={labelClass} htmlFor="address">Address</label>
              <input id="address" className={inputClass} value={form.address} disabled={!canEdit} onChange={setField('address')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass} htmlFor="city">City</label>
                <input id="city" className={inputClass} value={form.city} disabled={!canEdit} onChange={setField('city')} />
              </div>
              <div>
                <label className={labelClass} htmlFor="state">State</label>
                <input id="state" className={inputClass} value={form.state} disabled={!canEdit} onChange={setField('state')} />
              </div>
              <div>
                <label className={labelClass} htmlFor="zip_code">Zip Code</label>
                <input id="zip_code" className={inputClass} value={form.zip_code} disabled={!canEdit} onChange={setField('zip_code')} />
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="country">Country</label>
              <select
                id="country"
                className="form-select w-full disabled:opacity-60"
                value={form.country}
                disabled={!canEdit}
                onChange={setField('country')}
              >
                <option value="">Select country</option>
                {countries.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
              {fieldErrors.country && <p className="mt-1 text-xs text-red-500">{fieldErrors.country[0]}</p>}
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end border-t border-gray-100 dark:border-gray-700/60 pt-4">
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
