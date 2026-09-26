import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { setupInterceptors } from '../api/axios';
import type { RegisterFormData, User } from '../types';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (formData: RegisterFormData) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setupInterceptors(() => {
      setUser(null);
      if (!['/', '/login', '/register'].includes(window.location.pathname)) {
        navigate('/', { replace: true });
      }
    });

    const checkAuth = async () => {
      try {
        const response = await apiClient.get<User | null>('/api/user');
        setUser(response.data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void checkAuth();
  }, [navigate]);

  const login = async (email: string, password: string) => {
    await apiClient.get('/sanctum/csrf-cookie');
    await apiClient.post('/api/login', { email, password });
    const response = await apiClient.get<User>('/api/user');
    setUser(response.data);
  };

  const register = async (formData: RegisterFormData) => {
    await apiClient.get('/sanctum/csrf-cookie');
    await apiClient.post('/api/register', formData);
    const response = await apiClient.get<User>('/api/user');
    setUser(response.data);
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/logout');
    } finally {
      setUser(null);
      navigate('/', { replace: true });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
