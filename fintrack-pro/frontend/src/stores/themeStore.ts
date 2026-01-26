import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem('theme') as Theme) || 'system';
};

const getResolvedTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') return getSystemTheme();
  return theme;
};

const applyTheme = (theme: 'light' | 'dark') => {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
};

export const useThemeStore = create<ThemeState>((set, get) => {
  // Initialize theme on load
  const initialTheme = getInitialTheme();
  const resolvedTheme = getResolvedTheme(initialTheme);
  
  // Apply initial theme
  if (typeof window !== 'undefined') {
    applyTheme(resolvedTheme);
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      const currentTheme = get().theme;
      if (currentTheme === 'system') {
        const newResolvedTheme = e.matches ? 'dark' : 'light';
        applyTheme(newResolvedTheme);
        set({ resolvedTheme: newResolvedTheme });
      }
    });
  }

  return {
    theme: initialTheme,
    resolvedTheme,

    setTheme: (theme: Theme) => {
      const resolved = getResolvedTheme(theme);
      applyTheme(resolved);
      localStorage.setItem('theme', theme);
      set({ theme, resolvedTheme: resolved });
    },

    toggleTheme: () => {
      const currentTheme = get().theme;
      const currentResolved = get().resolvedTheme;
      
      // If system, switch to the opposite of current
      // If light/dark, toggle between them
      let newTheme: Theme;
      if (currentTheme === 'system') {
        newTheme = currentResolved === 'dark' ? 'light' : 'dark';
      } else {
        newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      }

      const resolved = getResolvedTheme(newTheme);
      applyTheme(resolved);
      localStorage.setItem('theme', newTheme);
      set({ theme: newTheme, resolvedTheme: resolved });
    },
  };
});
