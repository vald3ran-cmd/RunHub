// Web stub — UMP Consent non disponibile su web.
export type ConsentSnapshot = {
  status: string;
  canRequestAds: boolean;
  gdprApplies: boolean;
  hasPurposeOneConsent: boolean;
  privacyOptionsRequired: boolean;
};

const EMPTY: ConsentSnapshot = {
  status: 'NOT_REQUIRED',
  canRequestAds: false,
  gdprApplies: false,
  hasPurposeOneConsent: false,
  privacyOptionsRequired: false,
};

export async function initConsentFlow(): Promise<ConsentSnapshot> { return EMPTY; }
export async function showPrivacyOptionsForm(): Promise<ConsentSnapshot> { return EMPTY; }
export async function getConsentSnapshot(): Promise<ConsentSnapshot> { return EMPTY; }
export async function resetConsentForTesting(): Promise<void> {}
export function canShowAdsSync(): boolean { return false; }
export function markAdsSdkInitialized() {}
export function isAdsSdkInitialized(): boolean { return false; }
