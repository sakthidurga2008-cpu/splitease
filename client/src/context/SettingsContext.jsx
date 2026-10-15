import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Settings live in the browser (localStorage). The database schema has no
// settings table, and these are choices about this device anyway.
const STORAGE_KEY = 'splitease.settings';
const DEFAULTS = { theme: 'system', hideAmounts: false };

function readSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return DEFAULTS;
  }
}

const systemPrefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(readSettings);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Follow the device when the theme is set to "Match device".
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme = settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  const update = useCallback((changes) => {
    setSettings((current) => {
      const next = { ...current, ...changes };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Private browsing can block storage; the setting still applies for this visit.
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      settings,
      resolvedTheme,
      update,
      toggleTheme: () => update({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' }),
    }),
    [settings, resolvedTheme, update],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
