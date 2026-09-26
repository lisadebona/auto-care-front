import { useState, type ChangeEvent, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import apiClient from '../api/axios';
import type { RegisterFormData, User, ValidationErrors } from '../types';

type RegisterProps = {
  onSuccess?: (user: User) => void;
};

export default function Register({ onSuccess }: RegisterProps) {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      await apiClient.get('/sanctum/csrf-cookie');
      const response = await apiClient.post<{ user: User }>('/api/register', formData);
      onSuccess?.(response.data.user);
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 422) {
        setErrors((error.response.data as { errors?: ValidationErrors }).errors ?? {});
      } else {
        console.error('Registration failed:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '1rem' }}>
      <h2>Create an Account</h2>
      <form onSubmit={(e) => { void handleSubmit(e); }}>
        <div>
          <label>Name</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required />
          {errors.name && <p style={{ color: 'red' }}>{errors.name[0]}</p>}
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label>Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required />
          {errors.email && <p style={{ color: 'red' }}>{errors.email[0]}</p>}
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label>Password</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required />
          {errors.password && <p style={{ color: 'red' }}>{errors.password[0]}</p>}
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label>Confirm Password</label>
          <input
            type="password"
            name="password_confirmation"
            value={formData.password_confirmation}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" disabled={loading} style={{ marginTop: '1.5rem' }}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
}
