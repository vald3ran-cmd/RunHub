import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { isAdMobAvailable, getAdUnitId } from './adMobConfig';
import { colors } from './theme';

/**
 * LAZY imports: react-native-google-mobile-ads CANNOT be statically imported
 * because it's a native module NOT bundled in Expo Go.
 * We resolve it at runtime only when the environment supports it.
 */
type RealAdMob = {
  BannerAd: React.ComponentType<any>;
  BannerAdSize: any;
  InterstitialAd: any;
  AdEventType: any;
  TestIds: any;
  default: any;
};

let _realAdMob: RealAdMob | null = null;
let _adMobInitialized = false;
let _adMobInitPromise: Promise<boolean> | null = null;

function loadRealAdMob(): RealAdMob | null {
  if (!isAdMobAvailable) return null;
  if (_realAdMob) return _realAdMob;
  try {
    // Dynamic require so Metro doesn't fail-bundle it on web / Expo Go
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-google-mobile-ads');
    _realAdMob = {
      BannerAd: mod.BannerAd,
      BannerAdSize: mod.BannerAdSize,
      InterstitialAd: mod.InterstitialAd,
      AdEventType: mod.AdEventType,
      TestIds: mod.TestIds,
      default: mod.default,
    };
    return _realAdMob;
  } catch (e) {
    console.warn('[AdMob] Native module not available:', e);
    return null;
  }
}

/**
 * Initialize Google Mobile Ads SDK once. Safe to call multiple times.
 * Also handles iOS ATT permission request.
 */
export async function initializeAdMob(): Promise<boolean> {
  if (!isAdMobAvailable) return false;
  if (_adMobInitialized) return true;
  if (_adMobInitPromise) return _adMobInitPromise;

  _adMobInitPromise = (async () => {
    try {
      // iOS ATT permission
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Platform } = require('react-native');
        if (Platform.OS === 'ios') {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const tt = require('expo-tracking-transparency');
          if (typeof tt.requestTrackingPermissionsAsync === 'function') {
            await tt.requestTrackingPermissionsAsync();
          }
        }
      } catch (e) {
        console.warn('[AdMob] ATT request skipped:', e);
      }

      const mod = loadRealAdMob();
      if (!mod) return false;

      // Configure content rating
      try {
        await mod.default().setRequestConfiguration({
          maxAdContentRating: 'G',
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
        });
      } catch {}

      await mod.default().initialize();
      _adMobInitialized = true;
      console.log('[AdMob] Initialized');
      return true;
    } catch (e) {
      console.warn('[AdMob] Initialization failed:', e);
      return false;
    }
  })();

  return _adMobInitPromise;
}

/**
 * Real BannerAd component. Renders null if native module not available.
 * Parent component should decide fallback UI.
 */
export function RealBannerAd() {
  const mod = loadRealAdMob();
  if (!mod) return null;
  const { BannerAd, BannerAdSize } = mod;
  return (
    <View style={styles.bannerContainer}>
      <BannerAd
        unitId={getAdUnitId('banner')}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
          keywords: ['running', 'fitness', 'workout', 'sport'],
        }}
        onAdFailedToLoad={(err: any) => console.warn('[AdMob] banner load failed', err?.message)}
      />
    </View>
  );
}

/**
 * Interstitial manager using singleton pattern.
 * Preloads an ad on init; call showInterstitial() to display.
 */
class InterstitialManager {
  private instance: any = null;
  private loaded = false;
  private loading = false;

  private async ensureLoaded() {
    if (!isAdMobAvailable) return false;
    const mod = loadRealAdMob();
    if (!mod) return false;
    if (this.loaded && this.instance) return true;
    if (this.loading) return false;
    this.loading = true;
    try {
      const { InterstitialAd, AdEventType } = mod;
      this.instance = InterstitialAd.createForAdRequest(getAdUnitId('interstitial'), {
        requestNonPersonalizedAdsOnly: false,
        keywords: ['running', 'fitness', 'workout'],
      });
      return await new Promise<boolean>((resolve) => {
        const unsubL = this.instance.addAdEventListener(AdEventType.LOADED, () => {
          this.loaded = true;
          this.loading = false;
          unsubL();
          resolve(true);
        });
        const unsubE = this.instance.addAdEventListener(AdEventType.ERROR, (err: any) => {
          console.warn('[AdMob] interstitial error', err?.message);
          this.loaded = false;
          this.loading = false;
          unsubE();
          resolve(false);
        });
        this.instance.addAdEventListener(AdEventType.CLOSED, () => {
          this.loaded = false;
          this.instance = null;
          // Preload next
          setTimeout(() => this.ensureLoaded(), 300);
        });
        this.instance.load();
      });
    } catch (e) {
      console.warn('[AdMob] interstitial prepare failed', e);
      this.loading = false;
      return false;
    }
  }

  async preload() {
    return this.ensureLoaded();
  }

  async show(): Promise<boolean> {
    const ok = await this.ensureLoaded();
    if (!ok || !this.instance) return false;
    try {
      await this.instance.show();
      return true;
    } catch (e) {
      console.warn('[AdMob] interstitial show failed', e);
      return false;
    }
  }
}

export const interstitialManager = new InterstitialManager();

const styles = StyleSheet.create({
  bannerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
