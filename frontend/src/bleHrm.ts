/**
 * BLE Heart Rate Monitor (HRM) Service
 * RunHub 1.6.2 — Real-time HR via Bluetooth GATT
 *
 * Spec: Heart Rate Service (UUID 0x180D), Heart Rate Measurement char (0x2A37)
 * - Byte 0: flags
 * - If flags & 0x01 → HR is uint16 (LE), else uint8 in byte 1
 * - Compatible with: Polar H10/H9, Wahoo TICKR, Garmin HRM-Pro, Suunto Smart Sensor,
 *   Apple Watch (in shared mode), CooSpo, Magene, Coros HRM, ecc.
 *
 * ⚠️ NON funziona in Expo Go o Web — richiede build nativa (EAS).
 */
import Constants from 'expo-constants';
import { Platform, PermissionsAndroid } from 'react-native';

// Lazy-load to avoid crashing Expo Go
let BleManagerSingleton: any = null;
let BleErrorCodeEnum: any = null;

const HEART_RATE_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
const HEART_RATE_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';

export interface HRMDevice {
  id: string;          // MAC / UUID
  name: string;        // Bluetooth advertised name
  rssi: number;        // signal strength
}

export interface HRMSample {
  bpm: number;
  timestamp_ms: number; // unix epoch ms
}

export type ConnectionState = 'idle' | 'scanning' | 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Verifica se BLE HRM è supportato sull'ambiente corrente.
 * Restituisce false in Expo Go / web preview.
 */
export function isBleSupported(): { supported: boolean; reason?: string } {
  if (Platform.OS === 'web') {
    return { supported: false, reason: 'BLE non supportato su web' };
  }
  // Expo Go has appOwnership='expo'; standalone/dev builds have 'standalone' or undefined
  if (Constants.appOwnership === 'expo') {
    return { supported: false, reason: 'Richiede build nativa (non funziona in Expo Go)' };
  }
  return { supported: true };
}

async function getBleManager(): Promise<any> {
  if (BleManagerSingleton) return BleManagerSingleton;
  try {
    const ble = require('react-native-ble-plx');
    BleErrorCodeEnum = ble.BleErrorCode;
    BleManagerSingleton = new ble.BleManager();
    return BleManagerSingleton;
  } catch (e) {
    console.warn('[BLE] Failed to load react-native-ble-plx:', e);
    return null;
  }
}

/**
 * Richiede permessi Bluetooth su Android 12+ (SCAN, CONNECT).
 * Su iOS i permessi sono gestiti dal sistema al primo accesso.
 */
export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const sdk = Platform.Version as number;
    const needed: any[] = [];
    if (sdk >= 31) {
      needed.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
      needed.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
    } else {
      needed.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    }
    const granted = await PermissionsAndroid.requestMultiple(needed);
    return Object.values(granted).every((s) => s === PermissionsAndroid.RESULTS.GRANTED);
  } catch (e) {
    console.warn('[BLE] permission error:', e);
    return false;
  }
}

/**
 * Avvia scan BLE filtrando per Heart Rate Service.
 * Restituisce devices via callback (ogni device unico per id).
 * @param onDevice callback per ogni device unico trovato
 * @param onError callback errore
 * @returns stopScan function
 */
export async function scanForHrmDevices(
  onDevice: (d: HRMDevice) => void,
  onError?: (err: string) => void,
): Promise<() => void> {
  const manager = await getBleManager();
  if (!manager) {
    onError?.('Modulo BLE non disponibile (build nativa richiesta)');
    return () => {};
  }
  const seen = new Set<string>();
  try {
    manager.startDeviceScan([HEART_RATE_SERVICE], { allowDuplicates: false }, (err: any, device: any) => {
      if (err) {
        console.warn('[BLE] scan error:', err);
        onError?.(err?.message ?? 'Scan error');
        return;
      }
      if (!device || !device.id || seen.has(device.id)) return;
      seen.add(device.id);
      onDevice({
        id: device.id,
        name: device.name || device.localName || 'Sensore FC',
        rssi: device.rssi ?? -100,
      });
    });
  } catch (e: any) {
    onError?.(e?.message ?? 'Scan failed');
  }
  return () => {
    try {
      manager.stopDeviceScan();
    } catch {}
  };
}

/**
 * Connette al device, sottoscrive al Heart Rate Measurement char,
 * e invoca onSample ad ogni notifica HR.
 *
 * @returns disconnect function
 */
export async function connectAndSubscribe(
  deviceId: string,
  onSample: (sample: HRMSample) => void,
  onStateChange: (state: ConnectionState, info?: string) => void,
): Promise<() => Promise<void>> {
  const manager = await getBleManager();
  if (!manager) {
    onStateChange('error', 'Modulo BLE non disponibile');
    return async () => {};
  }
  try {
    onStateChange('connecting');
    const device = await manager.connectToDevice(deviceId, { autoConnect: false });
    onStateChange('connecting', 'Discovery servizi...');
    await device.discoverAllServicesAndCharacteristics();

    // Subscribe to HR Measurement
    const sub = device.monitorCharacteristicForService(
      HEART_RATE_SERVICE,
      HEART_RATE_MEASUREMENT,
      (err: any, char: any) => {
        if (err) {
          console.warn('[BLE] notify error:', err);
          if (err?.errorCode === BleErrorCodeEnum?.DeviceDisconnected) {
            onStateChange('disconnected');
          }
          return;
        }
        if (!char?.value) return;
        const bpm = parseHeartRateMeasurement(char.value);
        if (bpm > 0 && bpm < 250) {
          onSample({ bpm, timestamp_ms: Date.now() });
        }
      },
    );

    // Listen for disconnects
    const discSub = device.onDisconnected((err: any) => {
      onStateChange('disconnected', err?.message);
    });

    onStateChange('connected', device.name || 'Sensore FC');

    return async () => {
      try { sub?.remove?.(); } catch {}
      try { discSub?.remove?.(); } catch {}
      try { await manager.cancelDeviceConnection(deviceId); } catch {}
    };
  } catch (e: any) {
    console.warn('[BLE] connect error:', e);
    onStateChange('error', e?.message ?? 'Connect failed');
    return async () => {};
  }
}

/**
 * Parse Heart Rate Measurement characteristic (base64 string in BLE-PLX).
 * Spec: org.bluetooth.characteristic.heart_rate_measurement
 *   - Byte 0: flags (bit 0 = HR Value Format, 0=uint8, 1=uint16)
 *   - Byte 1 (or 1-2 LE): HR value
 */
function parseHeartRateMeasurement(base64: string): number {
  try {
    // Decode base64 → bytes
    const bytes = base64ToBytes(base64);
    if (bytes.length < 2) return 0;
    const flags = bytes[0];
    const is16 = (flags & 0x01) === 0x01;
    if (is16 && bytes.length >= 3) {
      return bytes[1] | (bytes[2] << 8);
    }
    return bytes[1];
  } catch {
    return 0;
  }
}

function base64ToBytes(b64: string): number[] {
  // RN-friendly base64 decode
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes: number[] = [];
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  let i = 0;
  while (i < clean.length) {
    const c1 = chars.indexOf(clean.charAt(i++));
    const c2 = chars.indexOf(clean.charAt(i++));
    const c3 = chars.indexOf(clean.charAt(i++));
    const c4 = chars.indexOf(clean.charAt(i++));
    const b1 = (c1 << 2) | (c2 >> 4);
    const b2 = ((c2 & 0xf) << 4) | (c3 >> 2);
    const b3 = ((c3 & 0x3) << 6) | c4;
    bytes.push(b1);
    if (c3 !== 64) bytes.push(b2);
    if (c4 !== 64) bytes.push(b3);
  }
  return bytes;
}

/**
 * Spegne il manager BLE (call on app unmount per liberare risorse).
 */
export function shutdownBle() {
  try {
    if (BleManagerSingleton) {
      BleManagerSingleton.destroy();
      BleManagerSingleton = null;
    }
  } catch {}
}
