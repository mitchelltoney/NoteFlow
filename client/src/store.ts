import { create } from 'zustand';

interface AppState {
  darkMode: boolean;
  sidebarOpen: boolean;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
}

const getInitialDarkMode = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('darkMode') === 'true';
  }
  return false;
};

export const useAppStore = create<AppState>((set) => ({
  darkMode: getInitialDarkMode(),
  sidebarOpen: true,
  toggleDarkMode: () => set((state) => {
    const next = !state.darkMode;
    localStorage.setItem('darkMode', String(next));
    return { darkMode: next };
  }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

export const useDarkMode = () => useAppStore((s) => s.darkMode);
export const useSidebarOpen = () => useAppStore((s) => s.sidebarOpen);
