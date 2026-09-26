import { create } from 'zustand';
import { api } from '../lib/api';

interface AuthState {
  user: any | null;
  loading: boolean;
  checkAuth: () => Promise<void>;
  login: (user: any) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  checkAuth: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.user, loading: false });
    } catch {
      set((state) => {
        // Prevent race condition: if user is already set (e.g. they just logged in manually),
        // don't overwrite it with null from a delayed 401 response.
        if (state.user) return { loading: false };
        return { user: null, loading: false };
      });
    }
  },
  login: (user) => set({ user, loading: false }),
  logout: async () => {
    try {
      await api.post('/auth/logout');
      set({ user: null });
      window.location.href = '/login';
    } catch (e) {
      console.error(e);
    }
  }
}));
