/**
 * RevenueCat stub web.
 * Su web NON si usa RevenueCat (Stripe gestisce i pagamenti browser).
 * Tutte le funzioni ritornano no-op / null per non rompere l'app.
 */

export const isRevenueCatConfigured = () => false;

export const initRevenueCat = async (_userId?: string): Promise<void> => {
  // no-op su web
};

export const identifyRevenueCatUser = async (_userId: string): Promise<void> => {
  // no-op su web
};

export const logoutRevenueCat = async (): Promise<void> => {
  // no-op su web
};

export const fetchOfferings = async () => null;

export const purchasePackage = async (_pkg: any) => ({
  success: false,
  error: 'RevenueCat non disponibile su web. Usa Stripe Checkout.',
});

export const restorePurchases = async () => null;

export const getCustomerInfo = async () => null;

export const hasActiveEntitlement = (_info: any, _entitlementId: string) => false;

export const getActiveTier = (_info: any): 'free' | 'starter' | 'performance' | 'elite' => 'free';

export const addCustomerInfoListener = (_cb: (info: any) => void): (() => void) => {
  return () => {};
};
