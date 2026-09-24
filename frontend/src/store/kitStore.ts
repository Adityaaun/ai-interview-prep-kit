import { create } from 'zustand';
import { api } from '../lib/api';

interface KitState {
  kits: any[];
  currentKit: any | null;
  loading: boolean;
  fetchKits: () => Promise<void>;
  fetchKit: (id: string) => Promise<void>;
  updateKitSection: (id: string, section: string, data: any) => Promise<void>;
  regenerateSection: (id: string, section: string) => Promise<void>;
  setCurrentKitOptimistic: (updater: (kit: any) => any) => void;
}

export const useKitStore = create<KitState>((set, get) => ({
  kits: [],
  currentKit: null,
  loading: false,
  fetchKits: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/kits');
      set({ kits: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  fetchKit: async (id: string) => {
    set({ loading: true });
    try {
      const res = await api.get(`/kits/${id}`);
      set({ currentKit: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  setCurrentKitOptimistic: (updater) => {
    const current = get().currentKit;
    if (current) {
      set({ currentKit: updater({ ...current }) });
    }
  },
  updateKitSection: async (id, section, data) => {
    // Optimistic UI updates should be handled in components via setCurrentKitOptimistic
    // This just syncs with backend
    try {
      await api.patch(`/kits/${id}`, { section, data });
    } catch (error) {
      console.error("Failed to sync kit section:", error);
      // Ideally, revert optimistic update here
      get().fetchKit(id); 
    }
  },
  regenerateSection: async (id, section) => {
    try {
      // Typically you'd set a local loading state for that specific section
      const res = await api.post(`/kits/${id}/regenerate`, { section });
      set({ currentKit: res.data });
    } catch (error) {
      console.error("Failed to regenerate:", error);
    }
  }
}));
