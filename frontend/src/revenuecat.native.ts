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

// 🔍 DIAGNOSTICA — RIMUOVERE DOPO IL FIX
console.log('🔑 [RC ENV] IOS_KEY length:', IOS_API_KEY.length, 'prefix:', IOS_API_KEY.substring(0, 8) || 'EMPTY');
console.log('🔑 [RC ENV] ANDROID_KEY length:', ANDROID_API_KEY.length, 'prefix:', ANDROID_API_KEY.substring(0, 8) || 'EMPTY');
console.log('🔑 [RC ENV] Platform:', Platform.OS);

let _initialized = false;

export const isRevenueCatConfigured = () => {
  return Boolean(Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY);
};

/**
 * Inizializza RevenueCat SDK. Da chiamare al boot dell'app (prima del login).
 * Passa userId opzionale per identificare l'utente (fatto dopo il login).
 */
export const initRevenueCat = async (userId?: string): Promise<void> => {
  // 🔍 DIAGNOSTICA — RIMUOVERE DOPO IL FIX
  console.log('🚀 [RC INIT] Chiamata, platform:', Platform.OS, 'userId:', userId, 'already_initialized:', _initialized);

  if (_initialized) {
    console.log('⏭️ [RC INIT] Già inizializzato, skip');
    return;
  }

  const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;

  // 🔍 DIAGNOSTICA — RIMUOVERE DOPO IL FIX
  console.log('🔑 [RC INIT] apiKey length:', apiKey.length, 'prefix:', apiKey.substring(0, 8) || 'EMPTY');

  if (!apiKey) {
    console.warn('❌ [RC INIT] API key mancante per', Platform.OS, '- skip init');
    return;
  }

  try {
    // 🔍 DIAGNOSTICA — Forziamo VERBOSE anche in production temporaneamente
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    console.log('⚙️ [RC INIT] Sto per chiamare Purchases.configure...');
    await Purchases.configure({ apiKey, appUserID: userId || null });
    _initialized = true;
    console.log('✅ [RC INIT] Successo, key prefix:', apiKey.substring(0, 8), 'userId:', userId);
  } catch (err) {
    console.error('❌ [RC INIT] Errore:', err);
    try {
      console.error('❌ [RC INIT] Errore stringified:', JSON.stringify(err));
    } catch {}
  }
};

/**
 * Associa l'account RevenueCat al tuo user id dopo login / register.
 */
export const identifyRevenueCatUser = async (userId: string): Promise<void> => {
  console.log('👤 [RC IDENTIFY] Chiamata con userId:', userId);
  if (!isRevenueCatConfigured()) {
    console.warn('❌ [RC IDENTIFY] RevenueCat non configurato, skip');
    return;
  }
  try {
    if (!_initialized) {
      console.log('🔄 [RC IDENTIFY] Non ancora inizializzato, chiamo initRevenueCat');
      await initRevenueCat(userId);
      return;
    }
    console.log('🔄 [RC IDENTIFY] Chiamo Purchases.logIn');
    await Purchases.logIn(userId);
    console.log('✅ [RC IDENTIFY] logIn completato');
  } catch (err) {
    console.error('❌ [RC IDENTIFY] logIn error:', err);
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
  console.log('📦 [RC OFFERINGS] Chiamata, configured:', isRevenueCatConfigured(), 'initialized:', _initialized);
  if (!isRevenueCatConfigured()) {
    console.warn('❌ [RC OFFERINGS] RevenueCat non configurato');
    return null;
  }
  try {
    const offerings = await Purchases.getOfferings();
    console.log('📦 [RC OFFERINGS] Risposta ricevuta:');
    console.log('📦 [RC OFFERINGS] - all keys:', Object.keys(offerings.all || {}));
    console.log('📦 [RC OFFERINGS] - current identifier:', offerings.current?.identifier || 'NESSUNA CURRENT');
    console.log('📦 [RC OFFERINGS] - current packages:', offerings.current?.availablePackages?.length || 0);
    if (offerings.current?.availablePackages) {
      offerings.current.availablePackages.forEach((p) => {
        console.log('📦 [RC OFFERINGS]   - package:', p.identifier, 'product:', p.product?.identifier);
      });
    }
    return offerings.current;
  } catch (err) {
    console.error('❌ [RC OFFERINGS] fetchOfferings error:', err);
    try {
      console.error('❌ [RC OFFERINGS] Errore stringified:', JSON.stringify(err));
    } catch {}
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
