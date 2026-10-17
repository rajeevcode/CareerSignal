'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';
type Ctx = { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void };

const ThemeContext = createContext<Ctx | null>(null);
import { THEME_STORAGE_KEY } from '@/lib/theme-script';
const THEME_CHANGE_EVENT = 'careersignal:theme-change';

function getInitial(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* storage unavailable — fall back to the operating-system preference */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getServerTheme(): Theme {
  return 'light';
}

function subscribeToTheme(onStoreChange: () => void): () => void {
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const onMediaChange = () => {
    try {
      if (!window.localStorage.getItem(THEME_STORAGE_KEY)) onStoreChange();
    } catch {
      onStoreChange();
    }
  };
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  media?.addEventListener('change', onMediaChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
    media?.removeEventListener('change', onMediaChange);
  };
}

function syncDocumentTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  document.body?.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  root.dataset.theme = theme;
}

function applyTheme(theme: Theme): void {
  syncDocumentTheme(theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* storage unavailable — the in-page theme still updates */
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The server snapshot keeps hydration stable; the head script applies the
  // browser preference before paint, and this store synchronizes React after hydration.
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getInitial,
    getServerTheme,
  );
  useEffect(() => syncDocumentTheme(getInitial()), [theme]);
  const setTheme = useCallback((nextTheme: Theme) => applyTheme(nextTheme), []);
  const toggle = useCallback(
    () => applyTheme(theme === 'dark' ? 'light' : 'dark'),
    [theme],
  );
  const contextValue = useMemo(
    () => ({ theme, toggle, setTheme }),
    [setTheme, theme, toggle],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx)
    return { theme: 'light' as Theme, toggle: () => {}, setTheme: () => {} };
  return ctx;
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      className={`inline-grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${className}`}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
