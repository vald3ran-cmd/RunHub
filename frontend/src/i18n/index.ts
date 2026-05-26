// i18n setup using i18n-js + expo-localization
// Auto-detect device language with fallback to Italian. User can override via
// the Profile > Settings selector (persisted in AsyncStorage).

import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback } from 'react';

import it from './it.json';
import en from './en.json';
import es from './es.json';

export type SupportedLocale = 'it' | 'en' | 'es';
export const SUPPORTED_LOCALES: { code: SupportedLocale; label: string; flag: string }[] = [
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

const LOCALE_STORAGE_KEY = 'runhub.locale.v1';

export const i18n = new I18n({ it, en, es });
i18n.enableFallback = true;
i18n.defaultLocale = 'it';

function detectDeviceLocale(): SupportedLocale {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const code = (locales[0].languageCode || '').toLowerCase();
      if (code === 'it' || code === 'en' || code === 'es') return code;
    }
  } catch {}
  return 'it';
}

// Sync setter (for initial sync render)
export function setLocale(loc: SupportedLocale) {
  i18n.locale = loc;
}

// Async loader: tries stored override, falls back to device locale
export async function loadStoredLocale(): Promise<SupportedLocale> {
  try {
    const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'it' || stored === 'en' || stored === 'es') {
      i18n.locale = stored;
      // Best-effort sync to backend (silent if not authenticated yet).
      syncLocaleToBackend(stored).catch(() => {});
      return stored;
    }
  } catch {}
  const detected = detectDeviceLocale();
  i18n.locale = detected;
  // Best-effort sync to backend (silent if not authenticated yet).
  syncLocaleToBackend(detected).catch(() => {});
  return detected;
}

export async function persistLocale(loc: SupportedLocale): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, loc);
  } catch {}
  i18n.locale = loc;
  // Best-effort sync to backend so push notifications use this locale.
  // Failure is silent — locale is still set client-side and AI Coach will
  // also pass the locale explicitly in the request body.
  syncLocaleToBackend(loc).catch(() => {});
}

async function syncLocaleToBackend(loc: SupportedLocale): Promise<void> {
  try {
    // Lazy import to avoid circular dep (api → auth → i18n in some setups).
    const mod = await import('../api');
    if (!mod?.api) return;
    await mod.api.put('/users/me/locale', { locale: loc }, { timeout: 6000 });
  } catch {
    // No auth yet or network error — ignore silently.
  }
}

// Hook: returns current locale + a setter that persists.
// `version` ticks every time we change locale, useful as dep to force re-render.
let listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => { try { fn(); } catch {} }); }

export function useLocale(): {
  locale: SupportedLocale;
  setLocale: (loc: SupportedLocale) => Promise<void>;
  ready: boolean;
} {
  const [locale, setLocaleState] = useState<SupportedLocale>((i18n.locale as SupportedLocale) || 'it');
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const loc = await loadStoredLocale();
      if (mounted) { setLocaleState(loc); setReady(true); }
    })();
    const cb = () => setLocaleState((i18n.locale as SupportedLocale) || 'it');
    listeners.push(cb);
    return () => {
      mounted = false;
      listeners = listeners.filter(fn => fn !== cb);
    };
  }, []);

  const change = useCallback(async (loc: SupportedLocale) => {
    await persistLocale(loc);
    setLocaleState(loc);
    notify();
  }, []);

  return { locale, setLocale: change, ready };
}

// Translation helper. Usage: t('referral.title') or t('greeting', { name: 'Marco' })
export function t(key: string, options?: Record<string, any>): string {
  return i18n.t(key, options);
}

// React hook that exposes t() + current locale (re-renders when locale changes)
export function useT() {
  const { locale, setLocale, ready } = useLocale();
  const _t = useCallback((key: string, options?: Record<string, any>) => i18n.t(key, options), [locale]);
  return { t: _t, locale, setLocale, ready };
}
