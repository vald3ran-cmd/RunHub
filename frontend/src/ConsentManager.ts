// ─────────────────────────────────────────────────────────────
// UMP Consent Manager — GDPR / IAB TCF v2.2
// ─────────────────────────────────────────────────────────────
// Gestisce il flusso di consenso (UMP) PRIMA di inizializzare AdMob.
// Senza questo, in EU la match rate AdMob crolla al ~7%.
// Riferimento: https://docs.page/invertase/react-native-google-mobile-ads/european-user-consent

import { Platform } from 'react-native';
import { isAdMobAvailable } from './adMobConfig';

// State module-level
let _adsSdkInitialized = false;
let _lastCanRequestAds = false;
let _privacyOptionsRequired = false;

export type ConsentSnapshot = {
  status: string;
  canRequestAds: boolean;
  gdprApplies: boolean;
  hasPurposeOneConsent: boolean;
  privacyOptionsRequired: boolean;
};

// Lazy load del modulo native — non disponibile in Expo Go / web
function loadAdsConsentModule(): any | null {
  if (!isAdMobAvailable) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-google-mobile-ads');
    return mod;
  } catch (e) {
    console.warn('[UMP] Module not available:', e);
    return null;
  }
}

/**
 * Chiamato all'avvio app. Aggiorna info consenso e mostra form se richiesto.
 * Dopo questo, controlla canRequestAds prima di inizializzare il Mobile Ads SDK.
 *
 * @param options.debugAsEea  Se true, simula utente EEA (solo dev/test)
 * @param options.testDeviceIds Lista hashed device id per test
 */
export async function initConsentFlow(options?: {
  debugAsEea?: boolean;
  testDeviceIds?: string[];
}): Promise<ConsentSnapshot> {
  const emptySnapshot: ConsentSnapshot = {
    status: 'NOT_REQUIRED',
    canRequestAds: false,
    gdprApplies: false,
    hasPurposeOneConsent: false,
    privacyOptionsRequired: false,
  };

  if (!isAdMobAvailable) return emptySnapshot;

  const mod = loadAdsConsentModule();
  if (!mod || !mod.AdsConsent) {
    console.warn('[UMP] AdsConsent not found in module');
    return emptySnapshot;
  }

  const { AdsConsent, AdsConsentStatus, AdsConsentDebugGeography } = mod;

  // Build debug options (solo in dev)
  const infoOptions =
    options?.debugAsEea && AdsConsentDebugGeography
      ? {
          debugGeography: AdsConsentDebugGeography.EEA,
          testDeviceIdentifiers: options.testDeviceIds ?? [],
        }
      : undefined;

  try {
    // 1) Aggiorna info consenso
    await AdsConsent.requestInfoUpdate(infoOptions);

    // 2) Se status è REQUIRED, mostra form (versioni recenti)
    try {
      if (typeof AdsConsent.gatherConsent === 'function') {
        // API più recente: gatherConsent fa requestInfoUpdate + loadAndShowConsentFormIfRequired
        await AdsConsent.gatherConsent();
      } else if (typeof AdsConsent.loadAndShowConsentFormIfRequired === 'function') {
        await AdsConsent.loadAndShowConsentFormIfRequired();
      }
    } catch (formErr: any) {
      console.warn('[UMP] gatherConsent/loadForm error:', formErr?.message);
    }

    // 3) Leggi snapshot finale
    let canRequestAds = false;
    let status = 'UNKNOWN';
    let privacyOptionsRequired = false;
    try {
      const info = await AdsConsent.getConsentInfo();
      canRequestAds = !!info?.canRequestAds;
      status = info?.status || 'UNKNOWN';
      // Diverse versioni espongono questo campo diversamente
      privacyOptionsRequired =
        info?.privacyOptionsRequirementStatus === 'REQUIRED' ||
        info?.isPrivacyOptionsRequired === true;
    } catch {}

    // Fallback: se canRequestAds non disponibile, usa status
    if (!canRequestAds && (status === 'OBTAINED' || status === 'NOT_REQUIRED')) {
      canRequestAds = true;
    }

    // 4) Leggi se GDPR si applica + purpose1
    let gdprApplies = false;
    let hasPurposeOneConsent = false;
    try {
      if (typeof AdsConsent.getGdprApplies === 'function') {
        gdprApplies = await AdsConsent.getGdprApplies();
      }
      if (typeof AdsConsent.getPurposeConsents === 'function') {
        const purposeConsents: string = await AdsConsent.getPurposeConsents();
        hasPurposeOneConsent = !!purposeConsents && purposeConsents.startsWith('1');
      }
    } catch {}

    _lastCanRequestAds = canRequestAds;
    _privacyOptionsRequired = privacyOptionsRequired;

    console.log('[UMP] snapshot:', {
      status,
      canRequestAds,
      gdprApplies,
      hasPurposeOneConsent,
      privacyOptionsRequired,
    });

    return {
      status,
      canRequestAds,
      gdprApplies,
      hasPurposeOneConsent,
      privacyOptionsRequired,
    };
  } catch (error: any) {
    console.warn('[UMP] initConsentFlow error:', error?.message);
    // Fallback: permetti ads se errore (evita di bloccare monetizzazione)
    _lastCanRequestAds = true;
    return {
      ...emptySnapshot,
      status: 'UNKNOWN',
      canRequestAds: true,
    };
  }
}

/**
 * Apre il form "modifica preferenze privacy" su azione utente
 * (da chiamare dal tasto in Profilo/Impostazioni).
 */
export async function showPrivacyOptionsForm(): Promise<ConsentSnapshot> {
  if (!isAdMobAvailable) {
    throw new Error('Privacy options not available on this platform');
  }
  const mod = loadAdsConsentModule();
  if (!mod || !mod.AdsConsent) {
    throw new Error('UMP module not available');
  }

  const { AdsConsent } = mod;

  if (typeof AdsConsent.showPrivacyOptionsForm === 'function') {
    await AdsConsent.showPrivacyOptionsForm();
  } else {
    // Fallback per versioni più vecchie: mostra il form standard
    await AdsConsent.showForm();
  }

  // Re-leggi snapshot dopo modifica
  return getConsentSnapshot();
}

/**
 * Restituisce snapshot corrente (senza chiamate di rete).
 */
export async function getConsentSnapshot(): Promise<ConsentSnapshot> {
  const emptySnapshot: ConsentSnapshot = {
    status: 'NOT_REQUIRED',
    canRequestAds: _lastCanRequestAds,
    gdprApplies: false,
    hasPurposeOneConsent: false,
    privacyOptionsRequired: _privacyOptionsRequired,
  };

  if (!isAdMobAvailable) return emptySnapshot;

  const mod = loadAdsConsentModule();
  if (!mod || !mod.AdsConsent) return emptySnapshot;

  const { AdsConsent } = mod;

  try {
    const info = await AdsConsent.getConsentInfo();
    let gdprApplies = false;
    let hasPurposeOneConsent = false;
    try {
      if (typeof AdsConsent.getGdprApplies === 'function') {
        gdprApplies = await AdsConsent.getGdprApplies();
      }
      if (typeof AdsConsent.getPurposeConsents === 'function') {
        const pc: string = await AdsConsent.getPurposeConsents();
        hasPurposeOneConsent = !!pc && pc.startsWith('1');
      }
    } catch {}

    const canRequestAds =
      !!info?.canRequestAds ||
      info?.status === 'OBTAINED' ||
      info?.status === 'NOT_REQUIRED';

    return {
      status: info?.status || 'UNKNOWN',
      canRequestAds,
      gdprApplies,
      hasPurposeOneConsent,
      privacyOptionsRequired:
        info?.privacyOptionsRequirementStatus === 'REQUIRED' ||
        info?.isPrivacyOptionsRequired === true,
    };
  } catch {
    return emptySnapshot;
  }
}

/**
 * Reset stato consenso (solo per test / debug).
 */
export async function resetConsentForTesting(): Promise<void> {
  if (!isAdMobAvailable) return;
  const mod = loadAdsConsentModule();
  if (!mod || !mod.AdsConsent) return;
  try {
    await mod.AdsConsent.reset();
    _adsSdkInitialized = false;
    _lastCanRequestAds = false;
  } catch {}
}

/**
 * Quick check sincrono per UI (usa l'ultimo snapshot in memoria).
 */
export function canShowAdsSync(): boolean {
  return _lastCanRequestAds;
}

export function markAdsSdkInitialized() {
  _adsSdkInitialized = true;
}

export function isAdsSdkInitialized(): boolean {
  return _adsSdkInitialized;
}
