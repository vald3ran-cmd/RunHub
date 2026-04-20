/**
 * RevenueCat integration (iOS + Android native).
 * Gestisce IAP tramite RevenueCat SDK.
 * Su web si usa il modulo .web.ts che ritorna stub (Stripe rimane il primario web).
 */
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  PurchasesError,
} from 'react-native-purchases';

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '';
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '';

let _initialized = false;

export const isRevenueCatConfigured = () => {
  return Boolean(Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY);
};

/**
 * Inizializza RevenueCat SDK. Da chiamare al boot dell'app (prima del login).
 * Passa userId opzionale per identificare l'utente (fatto dopo il login).
 */
export const initRevenueCat = async (userId?: string): Promise<void> => {
  if (_initialized) return;

  const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;
  if (!apiKey) {
    console.warn('[RevenueCat] API key non configurato per', Platform.OS, '- skip init');
    return;
  }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    } else {
      Purchases.setLogLevel(LOG_LEVEL.WARN);
    }

    await Purchases.configure({ apiKey, appUserID: userId || null });
    _initialized = true;
    console.log('[RevenueCat] Inizializzato con successo', { platform: Platform.OS, userId });
  } catch (err) {
    console.error('[RevenueCat] Errore init:', err);
  }
};

/**
 * Associa l'account RevenueCat al tuo user id dopo login / register.
 */
export const identifyRevenueCatUser = async (userId: string): Promise<void> => {
  if (!isRevenueCatConfigured()) return;
  try {
    if (!_initialized) {
      await initRevenueCat(userId);
      return;
    }
    await Purchases.logIn(userId);
  } catch (err) {
    console.error('[RevenueCat] logIn error:', err);
  }
};

/**
 * Disassocia al logout. L'utente diventa anonimo.
 */
export const logoutRevenueCat = async (): Promise<void> => {
  if (!isRevenueCatConfigured() || !_initialized) return;
  try {
    await Purchases.logOut();
  } catch (err) {
    console.error('[RevenueCat] logOut error:', err);
  }
};

/**
 * Recupera le offerte correnti configurate nella dashboard RevenueCat.
 */
export const fetchOfferings = async (): Promise<PurchasesOffering | null> => {
  if (!isRevenueCatConfigured()) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (err) {
    console.error('[RevenueCat] fetchOfferings error:', err);
    return null;
  }
};

/**
 * Acquista un package. Torna true se OK, false se annullato/errore.
 */
export const purchasePackage = async (
  pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> => {
  if (!isRevenueCatConfigured()) {
    return { success: false, error: 'RevenueCat non configurato' };
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: true, customerInfo };
  } catch (err) {
    const e = err as PurchasesError;
    if (e.userCancelled) {
      return { success: false, error: 'cancelled' };
    }
    return { success: false, error: e.message || 'Errore acquisto' };
  }
};

/**
 * Ripristina gli acquisti esistenti (utile se cambia device / reinstalla app).
 */
export const restorePurchases = async (): Promise<CustomerInfo | null> => {
  if (!isRevenueCatConfigured()) return null;
  try {
    const info = await Purchases.restorePurchases();
    return info;
  } catch (err) {
    console.error('[RevenueCat] restore error:', err);
    return null;
  }
};

/**
 * Recupera CustomerInfo corrente (entitlements, expiry, ecc).
 */
export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  if (!isRevenueCatConfigured()) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    console.error('[RevenueCat] getCustomerInfo error:', err);
    return null;
  }
};

/**
 * Controlla se l'utente ha un entitlement attivo.
 * Entitlements configurati nella dashboard RC: 'starter_tier', 'performance_tier', 'elite_tier'
 */
export const hasActiveEntitlement = (
  info: CustomerInfo | null,
  entitlementId: string
): boolean => {
  if (!info) return false;
  const ent = info.entitlements.active[entitlementId];
  return Boolean(ent && ent.isActive);
};

/**
 * Ritorna il tier piu' alto attivo dell'utente ('elite' > 'performance' > 'starter' > 'free').
 */
export const getActiveTier = (info: CustomerInfo | null): 'free' | 'starter' | 'performance' | 'elite' => {
  if (!info) return 'free';
  if (hasActiveEntitlement(info, 'elite_tier')) return 'elite';
  if (hasActiveEntitlement(info, 'performance_tier')) return 'performance';
  if (hasActiveEntitlement(info, 'starter_tier')) return 'starter';
  return 'free';
};

/**
 * Aggiunge listener per cambi di CustomerInfo (es: rinnovo automatico).
 * Ritorna una funzione di cleanup.
 */
export const addCustomerInfoListener = (cb: (info: CustomerInfo) => void): (() => void) => {
  if (!isRevenueCatConfigured()) return () => {};
  Purchases.addCustomerInfoUpdateListener(cb);
  return () => Purchases.removeCustomerInfoUpdateListener(cb);
};
