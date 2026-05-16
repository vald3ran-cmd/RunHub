/**
 * Crashlytics wrapper per RunHub.
 *
 * Espone funzioni sicure per:
 * - Inizializzare Crashlytics al boot
 * - Registrare errori non-fatal (es. fallimenti API gestiti)
 * - Aggiungere breadcrumb / contesto utente
 * - Forzare crash di test (solo in development)
 *
 * In ambiente web o se i moduli nativi non sono disponibili (Expo Go),
 * tutte le chiamate sono no-op silenziose.
 */
import { Platform } from 'react-native';

type CrashlyticsModule = {
  log: (message: string) => void;
  recordError: (error: Error, jsErrorName?: string) => void;
  setUserId: (userId: string) => Promise<void>;
  setAttribute: (key: string, value: string) => Promise<void>;
  setAttributes: (attributes: Record<string, string>) => Promise<void>;
  setCrashlyticsCollectionEnabled: (enabled: boolean) => Promise<void>;
  crash: () => void;
};

let _crashlytics: CrashlyticsModule | null = null;
let _initialized = false;
const _bufferedBreadcrumbs: string[] = [];

const isWeb = Platform.OS === 'web';

function loadCrashlytics(): CrashlyticsModule | null {
  if (isWeb) return null;
  if (_crashlytics) return _crashlytics;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-firebase/crashlytics').default;
    const instance = mod();
    _crashlytics = instance;
    return instance;
  } catch (e) {
    // Native module non disponibile (Expo Go o build senza Firebase plugin)
    console.warn('[Crashlytics] modulo nativo non disponibile', e);
    return null;
  }
}

/**
 * Inizializza Crashlytics. Chiamare una sola volta al boot dell'app.
 * Abilita la raccolta solo in production o se l'utente ha dato consenso.
 */
export async function initCrashReporting(opts?: { enabled?: boolean }): Promise<void> {
  if (_initialized) return;
  const cl = loadCrashlytics();
  if (!cl) return;
  try {
    const enabled = opts?.enabled !== false; // default: enabled
    await cl.setCrashlyticsCollectionEnabled(enabled);
    _initialized = true;
    // Flush eventuali breadcrumb registrati prima dell'init
    if (_bufferedBreadcrumbs.length > 0) {
      _bufferedBreadcrumbs.forEach((msg) => cl.log(msg));
      _bufferedBreadcrumbs.length = 0;
    }
    cl.log(`[INIT] Crashlytics ready · platform=${Platform.OS} · enabled=${enabled}`);
  } catch (e) {
    console.warn('[Crashlytics] init failed', e);
  }
}

/**
 * Aggiunge una "breadcrumb": una stringa di log che verrà inclusa nei report di crash.
 * Utile per ricostruire la sequenza di azioni dell'utente.
 */
export function addBreadcrumb(message: string, category?: string): void {
  const tag = category ? `[${category}] ` : '';
  const fullMsg = `${tag}${message}`;
  const cl = loadCrashlytics();
  if (!cl || !_initialized) {
    _bufferedBreadcrumbs.push(fullMsg);
    if (_bufferedBreadcrumbs.length > 100) _bufferedBreadcrumbs.shift();
    return;
  }
  try {
    cl.log(fullMsg);
  } catch {}
}

/**
 * Registra un errore "non fatal": qualcosa che la app ha gestito ma vogliamo
 * comunque tracciare (es. fallimento API, errore di parsing, exception in catch).
 */
export function reportError(error: unknown, context?: Record<string, any>): void {
  const cl = loadCrashlytics();
  if (!cl) return;
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    if (context) {
      const attrs: Record<string, string> = {};
      Object.entries(context).forEach(([k, v]) => {
        attrs[k] = typeof v === 'string' ? v : JSON.stringify(v).substring(0, 200);
      });
      cl.setAttributes(attrs).catch(() => {});
      cl.log(`[CONTEXT] ${JSON.stringify(context).substring(0, 500)}`);
    }
    cl.recordError(err, err.name);
  } catch (e) {
    // Non vogliamo che il reporting stesso causi crash
    console.warn('[Crashlytics] reportError failed', e);
  }
}

/**
 * Imposta l'ID utente per associare i crash a un utente specifico.
 * IMPORTANTE: NON passare email o dati personali per GDPR. Usa l'ID interno.
 */
export async function setUser(userId: string | null): Promise<void> {
  const cl = loadCrashlytics();
  if (!cl) return;
  try {
    await cl.setUserId(userId || '');
  } catch (e) {
    console.warn('[Crashlytics] setUser failed', e);
  }
}

/**
 * Imposta attributi custom (es. tier abbonamento, locale, ecc).
 */
export async function setAttribute(key: string, value: string | number | boolean): Promise<void> {
  const cl = loadCrashlytics();
  if (!cl) return;
  try {
    await cl.setAttribute(key, String(value));
  } catch (e) {
    console.warn('[Crashlytics] setAttribute failed', e);
  }
}

/**
 * SOLO per debugging: forza un crash nativo per testare l'integrazione.
 * Da chiamare manualmente in dev, MAI in produzione.
 */
export function forceCrashForTesting(): void {
  if (!__DEV__) {
    console.warn('[Crashlytics] forceCrashForTesting bloccato in produzione');
    return;
  }
  const cl = loadCrashlytics();
  if (!cl) {
    console.warn('[Crashlytics] modulo non disponibile, simulo throw JS');
    throw new Error('Test crash (no native module)');
  }
  cl.crash();
}
