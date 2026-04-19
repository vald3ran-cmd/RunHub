import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import { api } from './api';

export const isExpoGo = Constants.appOwnership === 'expo';
// In Expo Go su SDK 53+ expo-notifications funziona parzialmente (local),
// ma remote push richiede build nativa. Gestiamo entrambi i casi.

let _notifs: any = null;
let _device: any = null;

function loadModules() {
  if (_notifs && _device) return { Notifications: _notifs, Device: _device };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _notifs = require('expo-notifications');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _device = require('expo-device');
    return { Notifications: _notifs, Device: _device };
  } catch (e) {
    console.warn('[Notifications] modules not available', e);
    return null;
  }
}

export async function initNotifications() {
  const mods = loadModules();
  if (!mods) return;
  const { Notifications } = mods;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notifiche RunHub',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF3B30',
      });
      await Notifications.setNotificationChannelAsync('workout', {
        name: 'Promemoria allenamento',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 400, 250, 400],
        lightColor: '#FF3B30',
      });
    }
  } catch (e) {
    console.warn('[Notifications] init failed', e);
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  const mods = loadModules();
  if (!mods) return null;
  const { Notifications, Device } = mods;

  if (!Device.isDevice) {
    console.log('[Notifications] Skipping on simulator/emulator');
    return null;
  }
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission denied');
      return null;
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId
      || (Constants as any)?.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData?.data;
    if (token) {
      try {
        await api.post('/notifications/register', { token, platform: Platform.OS });
      } catch (e) {
        console.warn('[Notifications] backend register failed', e);
      }
    }
    return token || null;
  } catch (e) {
    console.warn('[Notifications] registration failed', e);
    return null;
  }
}

export async function scheduleLocalWorkoutReminder(hour: number, minute: number) {
  const mods = loadModules();
  if (!mods) return null;
  const { Notifications } = mods;
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'E\' ora di correre! 🏃',
        body: 'Hai un allenamento in programma oggi. Non perderlo!',
        sound: 'default',
        priority: 'high',
      },
      trigger: {
        hour,
        minute,
        repeats: true,
        channelId: 'workout',
      },
    });
    return id;
  } catch (e) {
    console.warn('[Notifications] schedule failed', e);
    return null;
  }
}

export async function cancelAllScheduled() {
  const mods = loadModules();
  if (!mods) return;
  try {
    await mods.Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}

export async function getScheduledCount(): Promise<number> {
  const mods = loadModules();
  if (!mods) return 0;
  try {
    const list = await mods.Notifications.getAllScheduledNotificationsAsync();
    return list?.length || 0;
  } catch {
    return 0;
  }
}
