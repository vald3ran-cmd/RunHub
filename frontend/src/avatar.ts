// Avatar utilities: pick / take / process image and upload as base64
import { Platform, Alert, ActionSheetIOS } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { api } from './api';

const AVATAR_SIZE = 512; // px (square)
const AVATAR_QUALITY = 0.78;

async function pickFromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      'Permesso negato',
      'Per scegliere una foto profilo abilita l\'accesso alla galleria nelle Impostazioni.',
    );
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (res.canceled || !res.assets?.[0]?.uri) return null;
  return res.assets[0].uri;
}

async function takeFromCamera(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      'Permesso fotocamera negato',
      'Per scattare una foto profilo abilita l\'accesso alla fotocamera nelle Impostazioni.',
    );
    return null;
  }
  const res = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (res.canceled || !res.assets?.[0]?.uri) return null;
  return res.assets[0].uri;
}

// Resize + compress to 512×512 JPEG and return base64 data URI
async function processImage(uri: string): Promise<string> {
  const out = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: AVATAR_SIZE, height: AVATAR_SIZE } }],
    { compress: AVATAR_QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  if (!out.base64) throw new Error('Manipulator non ha restituito base64');
  return `data:image/jpeg;base64,${out.base64}`;
}

export async function uploadAvatar(uri: string): Promise<string> {
  const dataUri = await processImage(uri);
  const { data } = await api.put('/users/me/avatar', { image_base64: dataUri });
  return data.avatar_base64 as string;
}

export async function deleteAvatar(): Promise<void> {
  await api.delete('/users/me/avatar');
}

/**
 * Show platform-appropriate action sheet (iOS) or alert (Android) to pick avatar source.
 * Returns the uploaded avatar base64 string, or null if cancelled.
 */
export function chooseAndUploadAvatar(opts: {
  hasExisting: boolean;
  onProgress?: (state: 'idle' | 'picking' | 'uploading' | 'done' | 'error') => void;
  onDone: (avatarBase64: string | null) => void;
}) {
  const { hasExisting, onProgress, onDone } = opts;
  const handlePick = async (action: 'camera' | 'library' | 'remove') => {
    try {
      if (action === 'remove') {
        onProgress?.('uploading');
        await deleteAvatar();
        onProgress?.('done');
        onDone(null);
        return;
      }
      onProgress?.('picking');
      const uri = action === 'camera' ? await takeFromCamera() : await pickFromLibrary();
      if (!uri) { onProgress?.('idle'); return; }
      onProgress?.('uploading');
      const b64 = await uploadAvatar(uri);
      onProgress?.('done');
      onDone(b64);
    } catch (e: any) {
      onProgress?.('error');
      Alert.alert('Errore', e?.response?.data?.detail || e?.message || 'Operazione non riuscita');
    }
  };

  if (Platform.OS === 'ios') {
    const options = hasExisting
      ? ['Scatta una foto', 'Scegli dalla galleria', 'Rimuovi foto attuale', 'Annulla']
      : ['Scatta una foto', 'Scegli dalla galleria', 'Annulla'];
    const cancelButtonIndex = options.length - 1;
    const destructiveButtonIndex = hasExisting ? 2 : undefined;
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex, destructiveButtonIndex },
      (idx) => {
        if (idx === 0) handlePick('camera');
        else if (idx === 1) handlePick('library');
        else if (idx === 2 && hasExisting) handlePick('remove');
      },
    );
  } else {
    // Android / Web fallback: simple alert with buttons
    const buttons: any[] = [
      { text: 'Scatta', onPress: () => handlePick('camera') },
      { text: 'Galleria', onPress: () => handlePick('library') },
    ];
    if (hasExisting) {
      buttons.push({ text: 'Rimuovi', style: 'destructive' as const, onPress: () => handlePick('remove') });
    }
    buttons.push({ text: 'Annulla', style: 'cancel' as const });
    Alert.alert('Foto profilo', 'Scegli una sorgente', buttons);
  }
}
