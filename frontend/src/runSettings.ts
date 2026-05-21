// User preferences for the active-run experience.
// Stored in AsyncStorage — no backend round-trip.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type VoiceFrequency = 'every_km' | 'every_5min' | 'start_end' | 'off';

export type RunSettings = {
  voiceFrequency: VoiceFrequency;
  weightKg: number;
  autoPauseEnabled: boolean;
};

const KEY = 'runhub.runSettings.v1';

export const DEFAULT_SETTINGS: RunSettings = {
  voiceFrequency: 'every_km',
  weightKg: 70,
  autoPauseEnabled: true,
};

export async function loadRunSettings(): Promise<RunSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      voiceFrequency: parsed.voiceFrequency || DEFAULT_SETTINGS.voiceFrequency,
      weightKg: Number(parsed.weightKg) > 0 ? Number(parsed.weightKg) : DEFAULT_SETTINGS.weightKg,
      autoPauseEnabled: typeof parsed.autoPauseEnabled === 'boolean' ? parsed.autoPauseEnabled : DEFAULT_SETTINGS.autoPauseEnabled,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveRunSettings(s: Partial<RunSettings>): Promise<RunSettings> {
  const current = await loadRunSettings();
  const next: RunSettings = { ...current, ...s };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  return next;
}
