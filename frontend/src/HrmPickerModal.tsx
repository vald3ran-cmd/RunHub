/**
 * HrmPickerModal — Bottom sheet per scegliere e collegare un cardio Bluetooth.
 * Scientific Light UI · RunHub 1.6.2
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Linking, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens as dsTokens } from './design-system';
import { spacing, radius, fonts } from './theme';
import {
  HRMDevice, isBleSupported, requestBlePermissions,
  scanForHrmDevices, connectAndSubscribe, ConnectionState, HRMSample,
} from './bleHrm';

export interface HrmPickerProps {
  visible: boolean;
  onClose: () => void;
  /** Invocato con la disconnect fn quando la connessione è attiva */
  onConnected: (
    deviceName: string,
    onSample: (cb: (s: HRMSample) => void) => void,
    disconnect: () => Promise<void>,
  ) => void;
}

export function HrmPickerModal({ visible, onClose, onConnected }: HrmPickerProps) {
  const [supportInfo, setSupportInfo] = useState(() => isBleSupported());
  const [devices, setDevices] = useState<HRMDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connState, setConnState] = useState<ConnectionState>('idle');
  const stopScanRef = useRef<(() => void) | null>(null);
  const sampleListenersRef = useRef<((s: HRMSample) => void)[]>([]);

  // Auto-start scan on open (mobile native only)
  useEffect(() => {
    if (!visible) {
      // cleanup on close
      try { stopScanRef.current?.(); } catch {}
      stopScanRef.current = null;
      setDevices([]);
      setScanning(false);
      setError(null);
      return;
    }
    const info = isBleSupported();
    setSupportInfo(info);
    if (!info.supported) return;
    (async () => {
      const ok = await requestBlePermissions();
      if (!ok) {
        setError('Permessi Bluetooth negati. Aprili nelle Impostazioni.');
        return;
      }
      setScanning(true);
      setError(null);
      const stop = await scanForHrmDevices(
        (d) => setDevices((prev) => {
          if (prev.find((p) => p.id === d.id)) return prev;
          return [...prev, d].sort((a, b) => b.rssi - a.rssi);
        }),
        (err) => { setError(err); setScanning(false); },
      );
      stopScanRef.current = stop;
      // Stop scanning after 20s to save battery
      setTimeout(() => {
        try { stop(); } catch {}
        setScanning(false);
      }, 20000);
    })();
    return () => {
      try { stopScanRef.current?.(); } catch {}
    };
  }, [visible]);

  async function handleConnect(device: HRMDevice) {
    setConnectingId(device.id);
    setError(null);
    try { stopScanRef.current?.(); } catch {}
    setScanning(false);

    sampleListenersRef.current = [];
    const disconnect = await connectAndSubscribe(
      device.id,
      (sample) => {
        sampleListenersRef.current.forEach((cb) => cb(sample));
      },
      (state, info) => {
        setConnState(state);
        if (state === 'error') setError(info || 'Connessione fallita');
        if (state === 'connected') {
          // Pass the streaming controls up
          onConnected(
            device.name,
            (cb) => { sampleListenersRef.current.push(cb); },
            disconnect,
          );
          // Close modal after a small delay so user sees "Connesso"
          setTimeout(() => onClose(), 600);
        }
        if (state === 'disconnected') setConnectingId(null);
      },
    );
  }

  // --- Render: unsupported environment (Expo Go / Web)
  if (visible && !supportInfo.supported) {
    return (
      <Modal visible animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>CARDIO BLUETOOTH</Text>
            <View style={styles.unsupportedBox}>
              <Ionicons name="hardware-chip-outline" size={40} color={dsTokens.brand.primary} />
              <Text style={styles.unsupportedTitle}>Build nativa richiesta</Text>
              <Text style={styles.unsupportedDesc}>
                {supportInfo.reason || 'Il BLE non funziona nel preview.'}
              </Text>
              <Text style={styles.unsupportedHint}>
                Pubblica l&apos;app e installa la build TestFlight/Play Store per usare questa funzione.
              </Text>
            </View>
            <TouchableOpacity style={styles.btnGhost} onPress={onClose}>
              <Text style={styles.btnGhostText}>CHIUDI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>CARDIO BLUETOOTH</Text>
            {scanning ? <ActivityIndicator size="small" color={dsTokens.brand.primary} /> : null}
          </View>
          <Text style={styles.subtitle}>
            Indossa la fascia e attendi che compaia. Polar, Wahoo, Garmin, CooSpo, ecc.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={dsTokens.semantic.danger} />
              <Text style={styles.errorText}>{error}</Text>
              {error.includes('Impostazioni') ? (
                <TouchableOpacity onPress={() => Linking.openSettings()}>
                  <Text style={styles.settingsLink}>APRI</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <FlatList
            data={devices}
            keyExtractor={(d) => d.id}
            style={{ maxHeight: 340 }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons
                  name="bluetooth-outline"
                  size={32}
                  color={dsTokens.text.muted}
                />
                <Text style={styles.emptyText}>
                  {scanning ? 'Scansione in corso…' : 'Nessun cardio trovato'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isConnecting = connectingId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.deviceRow, isConnecting && styles.deviceRowActive]}
                  onPress={() => handleConnect(item)}
                  disabled={!!connectingId}
                >
                  <View style={styles.deviceIconBox}>
                    <Ionicons name="heart" size={20} color={dsTokens.brand.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deviceName}>{item.name}</Text>
                    <Text style={styles.deviceMeta}>
                      {signalLabel(item.rssi)} · {item.id.slice(-8).toUpperCase()}
                    </Text>
                  </View>
                  {isConnecting ? (
                    <Text style={styles.connStateText}>
                      {connState === 'connected' ? 'CONNESSO ✓' : 'Collego…'}
                    </Text>
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={dsTokens.text.muted} />
                  )}
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.actions}>
            {!scanning ? (
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => {
                  setDevices([]);
                  setError(null);
                  setSupportInfo(isBleSupported()); // re-trigger useEffect on next open
                  // Manual re-scan
                  (async () => {
                    const ok = await requestBlePermissions();
                    if (!ok) { setError('Permessi negati'); return; }
                    setScanning(true);
                    const stop = await scanForHrmDevices(
                      (d) => setDevices((prev) => prev.find((p) => p.id === d.id) ? prev : [...prev, d]),
                      (err) => { setError(err); setScanning(false); },
                    );
                    stopScanRef.current = stop;
                    setTimeout(() => { try { stop(); } catch {} ; setScanning(false); }, 20000);
                  })();
                }}
              >
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={styles.btnPrimaryText}>SCANSIONA</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.btnGhost}
                onPress={() => { try { stopScanRef.current?.(); } catch {} ; setScanning(false); }}
              >
                <Text style={styles.btnGhostText}>STOP</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.btnGhost} onPress={onClose}>
              <Text style={styles.btnGhostText}>CHIUDI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function signalLabel(rssi: number): string {
  if (rssi >= -55) return 'Segnale forte';
  if (rssi >= -75) return 'Segnale medio';
  return 'Segnale debole';
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: dsTokens.neutral.background,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg, paddingTop: 8, paddingBottom: spacing.xl,
    borderTopWidth: 1, borderColor: dsTokens.neutral.border,
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: dsTokens.neutral.border, marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    color: dsTokens.text.primary, fontSize: 12, letterSpacing: 1.5,
    fontFamily: fonts.headingBold,
  },
  subtitle: {
    color: dsTokens.text.secondary, fontSize: 12, marginBottom: spacing.md,
    fontFamily: fonts.medium,
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
  },
  errorText: {
    color: dsTokens.semantic.danger, fontSize: 12, flex: 1,
    fontFamily: fonts.medium,
  },
  settingsLink: {
    color: dsTokens.semantic.danger, fontSize: 11, letterSpacing: 1,
    fontFamily: fonts.headingBold,
  },
  emptyBox: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, gap: 8,
  },
  emptyText: { color: dsTokens.text.muted, fontSize: 13, fontFamily: fonts.medium },
  deviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    borderRadius: radius.lg, marginBottom: 6,
    backgroundColor: dsTokens.neutral.card,
    borderWidth: 1, borderColor: dsTokens.neutral.border,
  },
  deviceRowActive: {
    borderColor: dsTokens.brand.primary,
    backgroundColor: 'rgba(255,107,26,0.04)',
  },
  deviceIconBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: dsTokens.neutral.surfaceSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  deviceName: {
    color: dsTokens.text.primary, fontSize: 14,
    fontFamily: fonts.bold,
  },
  deviceMeta: {
    color: dsTokens.text.muted, fontSize: 11, marginTop: 2,
    fontFamily: fonts.medium,
  },
  connStateText: {
    color: dsTokens.brand.primary, fontSize: 10, letterSpacing: 1.2,
    fontFamily: fonts.headingBold,
  },
  actions: {
    flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md,
  },
  btnPrimary: {
    flex: 1, height: 48,
    backgroundColor: dsTokens.brand.primary,
    borderRadius: radius.pill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnPrimaryText: {
    color: '#fff', fontSize: 12, letterSpacing: 1.4,
    fontFamily: fonts.headingBold,
  },
  btnGhost: {
    flex: 1, height: 48,
    backgroundColor: dsTokens.neutral.card,
    borderRadius: radius.pill,
    borderWidth: 1, borderColor: dsTokens.neutral.border,
    alignItems: 'center', justifyContent: 'center',
  },
  btnGhostText: {
    color: dsTokens.text.primary, fontSize: 12, letterSpacing: 1.4,
    fontFamily: fonts.headingBold,
  },
  unsupportedBox: {
    alignItems: 'center', gap: 8, paddingVertical: spacing.xl,
  },
  unsupportedTitle: {
    color: dsTokens.text.primary, fontSize: 16,
    fontFamily: fonts.bold, marginTop: 4,
  },
  unsupportedDesc: {
    color: dsTokens.text.secondary, fontSize: 13, textAlign: 'center',
    fontFamily: fonts.medium, paddingHorizontal: spacing.lg,
  },
  unsupportedHint: {
    color: dsTokens.text.muted, fontSize: 11, textAlign: 'center',
    fontFamily: fonts.medium, marginTop: 8, paddingHorizontal: spacing.lg,
  },
});
