import { useEffect, useState } from 'react';

/**
 * Light or dark, chosen per person in Settings. Light is the default. The choice
 * is a convenience for this browser only, so it lives in localStorage; index.html
 * applies it before the first paint so a dark-theme reload doesn't flash light.
 */
export type Theme = 'light' | 'dark' | 'system';

export const THEME_KEY = 'dopple:theme';
const darkQuery = '(prefers-color-scheme: dark)';

export function storedTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_KEY);
    if (value === 'dark' || value === 'system') return value;
  } catch {
    // Storage blocked: fall back to the default.
  }
  return 'light';
}

function paint(theme: Theme) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia(darkQuery).matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private mode: the theme still applies until the tab closes.
  }
  paint(theme);
  window.dispatchEvent(new Event('dopple:theme'));
}

/** Follows the device while "system" is chosen, and other tabs' choices. Call once at start-up. */
export function watchTheme() {
  const sync = () => {
    paint(storedTheme());
    window.dispatchEvent(new Event('dopple:theme'));
  };
  window.matchMedia(darkQuery).addEventListener('change', sync);
  window.addEventListener('storage', (event) => {
    if (event.key === THEME_KEY) sync();
  });
  paint(storedTheme());
}

/** The current choice and a setter, for the picker in Settings. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setState] = useState(storedTheme);
  useEffect(() => {
    const sync = () => setState(storedTheme());
    window.addEventListener('dopple:theme', sync);
    return () => window.removeEventListener('dopple:theme', sync);
  }, []);
  return [theme, setTheme];
}
