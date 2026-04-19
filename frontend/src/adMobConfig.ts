import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Detect whether we're running in Expo Go (native AdMob module NOT available).
// In Expo Go, Constants.appOwnership === 'expo'. In EAS dev/prod builds it's 'standalone' or undefined.
export const isExpoGo = Constants.appOwnership === 'expo';

// AdMob native module is available when NOT in Expo Go AND on a native platform.
export const isAdMobAvailable = !isExpoGo && Platform.OS !== 'web';

// ------------ Production Ad Unit IDs (RunHub) ------------
const PROD = {
  banner: {
    ios: 'ca-app-pub-8711276203998030/2143901506',
    android: 'ca-app-pub-8711276203998030/9061723134',
  },
  interstitial: {
    ios: 'ca-app-pub-8711276203998030/8309854604',
    android: 'ca-app-pub-8711276203998030/2638725524',
  },
};

// Google provided Test Unit IDs (always safe to use in development).
// Reference: https://developers.google.com/admob/android/test-ads
const TEST = {
  banner: {
    ios: 'ca-app-pub-3940256099942544/2934735716',
    android: 'ca-app-pub-3940256099942544/6300978111',
  },
  interstitial: {
    ios: 'ca-app-pub-3940256099942544/4411468910',
    android: 'ca-app-pub-3940256099942544/1033173712',
  },
};

export function getAdUnitId(format: 'banner' | 'interstitial'): string {
  const pool = __DEV__ ? TEST : PROD;
  const platformKey: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
  return pool[format][platformKey];
}
