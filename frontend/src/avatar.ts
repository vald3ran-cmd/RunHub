// Avatar utilities: pick / take / process image and upload as base64
import { Platform, Alert, ActionSheetIOS } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { api } from './api';
import { t } from './i18n';

const AVATAR_SIZE = 512; // px (square)
const AVATAR_QUALITY = 0.78;

async function pickFromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      t('avatar_picker.permission_denied_title'),
      t('avatar_picker.permission_denied_msg'),
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
      t('avatar_picker.permission_camera_title'),
      t('avatar_picker.permission_camera_msg'),
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
  if (!out.base64) throw new Error(t('avatar_picker.manipulator_failed'));
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
      Alert.alert(t('common.error'), e?.response?.data?.detail || e?.message || t('avatar_picker.operation_failed'));
    }
  };

  if (Platform.OS === 'ios') {
    const options = hasExisting
      ? [t('avatar_picker.take_photo'), t('avatar_picker.choose_gallery'), t('avatar_picker.remove_current'), t('common.cancel')]
      : [t('avatar_picker.take_photo'), t('avatar_picker.choose_gallery'), t('common.cancel')];
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
      { text: t('avatar_picker.take'), onPress: () => handlePick('camera') },
      { text: t('avatar_picker.gallery'), onPress: () => handlePick('library') },
    ];
    if (hasExisting) {
      buttons.push({ text: t('avatar_picker.remove'), style: 'destructive' as const, onPress: () => handlePick('remove') });
    }
    buttons.push({ text: t('common.cancel'), style: 'cancel' as const });
    Alert.alert(t('avatar_picker.profile_photo'), t('avatar_picker.choose_source'), buttons);
  }
}
