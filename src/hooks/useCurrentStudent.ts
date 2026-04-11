import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearStoredUser,
  getStoredToken,
  getStoredUser,
  setAuthSession,
} from '../lib/auth';

export function useCurrentStudent() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();
  const token = getStoredToken();

  const currentUserQuery = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const response = await fetch('/api/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as {
        message?: string;
        data?: typeof storedUser;
      };

      if (!response.ok || !data.data) {
        throw new Error(data.message || 'Failed to load authenticated user');
      }

      return data.data;
    },
    enabled: Boolean(token && storedUser),
    retry: false,
    initialData: storedUser ?? undefined,
  });

  useEffect(() => {
    if (!currentUserQuery.isError) {
      return;
    }

    clearStoredUser();
    navigate('/login', { replace: true });
  }, [currentUserQuery.isError, navigate]);

  useEffect(() => {
    if (!token || !storedUser || !currentUserQuery.data || currentUserQuery.data === storedUser) {
      return;
    }

    setAuthSession({
      token,
      user: currentUserQuery.data,
    });
  }, [currentUserQuery.data, storedUser, token]);

  return {
    storedUser,
    activeUser: currentUserQuery.data ?? storedUser,
    isError: currentUserQuery.isError,
  };
}
