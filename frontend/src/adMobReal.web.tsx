// Web stub — AdMob native module is not available on web.
// Metro resolves this file when bundling for web, avoiding native-only imports.
import React from 'react';

export async function initializeAdMob(): Promise<boolean> {
  return false;
}

export function RealBannerAd(): React.ReactElement | null {
  return null;
}

export const interstitialManager = {
  preload: async () => false,
  show: async () => false,
};
