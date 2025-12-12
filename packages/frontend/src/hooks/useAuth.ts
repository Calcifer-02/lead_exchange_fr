import { useState, useEffect } from 'react';
import { userAPI } from '../api';
import type { User } from '../types/user';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setState({ user: null, loading: false, error: null });
          return;
        }

        const user = await userAPI.getProfile();
        setState({ user, loading: false, error: null });
      } catch (err) {
        console.error('Failed to load user profile:', err);
        setState({ user: null, loading: false, error: 'Failed to load user' });
      }
    };

    loadUser();
  }, []);

  return state;
};

