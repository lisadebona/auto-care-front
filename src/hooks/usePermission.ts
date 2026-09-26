import { useAuth } from '../context/AuthContext';

export function usePermission() {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];

  const hasPermission = (permission: string): boolean => permissions.includes(permission);

  return { hasPermission };
}
