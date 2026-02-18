import { create } from 'zustand';

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingCount: number;
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncTime: (time: number) => void;
  setPendingCount: (count: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  lastSyncTime: null,
  pendingCount: 0,
  setSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
  setPendingCount: (count) => set({ pendingCount: count }),
}));