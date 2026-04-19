import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const isExpoGo = Constants.appOwnership === 'expo';
export const isSocialAuthAvailable = !isExpoGo && Platform.OS !== 'web';

// Google OAuth Client IDs (public values, safe to ship in frontend)
export const GOOGLE_IOS_CLIENT_ID = '176221098978-0it8kqsk8hp6u4tpo233bfolaeojb93g.apps.googleusercontent.com';
export const GOOGLE_WEB_CLIENT_ID = '176221098978-28ujr8iugq6e0fbn34sngcago88dsfll.apps.googleusercontent.com';
