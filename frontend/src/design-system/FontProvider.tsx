/**
 * Loader unificato per Inter (UI) + JetBrains Mono (numeri).
 * Avvolgi <App /> in <FontProvider> per garantire che i font siano carichi
 * prima del rendering. Mostra fallback durante il caricamento.
 */
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import {
  useFonts as useInterFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { neutral } from './tokens';

export function useLabFonts() {
  const [ready] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
  });
  return ready;
}

export function FontProvider({ children }: { children: React.ReactNode }) {
  const ready = useLabFonts();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: neutral.background }}>
        <ActivityIndicator color="#E85D04" />
      </View>
    );
  }
  return <>{children}</>;
}
