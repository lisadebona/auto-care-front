import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import type { RegisterFormData, ValidationErrors } from '../types';

type RegisterField = keyof RegisterFormData;

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      await register(formData);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        setErrors((err.response.data as { errors?: ValidationErrors }).errors ?? {});
      } else if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setErrors({ form: [typeof message === 'string' ? message : 'Registration failed'] });
      } else {
        setErrors({ form: ['Registration failed'] });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const field = (
    name: RegisterField,
    label: string,
    type = 'text',
    autoComplete?: string,
  ): ReactNode => (
    <div>
      <label className="block text-sm font-medium mb-1" htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        className="form-input w-full"
        type={type}
        value={formData[name]}
        autoComplete={autoComplete}
        onChange={(e) => setFormData({ ...formData, [name]: e.target.value })}
        required
      />
      {errors[name] && <p className="text-sm text-red-500 mt-1">{errors[name][0]}</p>}
    </div>
  );

  return (
    <div className="min-h-dvh flex flex-col bg-gray-100 dark:bg-gray-900">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <Logo />
          <span className="text-lg font-bold text-gray-800 dark:text-gray-100">Auto Care</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-xs rounded-xl p-6 sm:p-8">
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold mb-2">Create an account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Register to manage the shop.</p>

          {errors.form && (
            <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{errors.form[0]}</div>
          )}

          <form onSubmit={(e) => { void handleSubmit(e); }}>
            <div className="space-y-4">
              {field('name', 'Name', 'text', 'name')}
              {field('email', 'Email', 'email', 'email')}
              {field('password', 'Password', 'password', 'new-password')}
              {field('password_confirmation', 'Confirm password', 'password', 'new-password')}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn w-full bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white mt-6 disabled:opacity-60"
            >
              {submitting ? 'Creating account…' : 'Register'}
            </button>
          </form>

          <div className="text-sm text-gray-500 dark:text-gray-400 mt-6">
            Already have an account?{' '}
            <Link className="font-medium text-violet-500 hover:text-violet-600" to="/">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
