import { create } from 'zustand';

interface AppShellState {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;
}

export const useAppShellStore = create<AppShellState>((set) => ({
  isSidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({
      isSidebarCollapsed: !state.isSidebarCollapsed,
    })),
  setSidebarCollapsed: (value) => set({ isSidebarCollapsed: value }),
}));
