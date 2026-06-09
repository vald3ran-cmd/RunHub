/**
 * fileImporter.ts — wrapper per la selezione e l'upload di file di attività
 * (.fit / .gpx / .tcx) al backend.
 *
 * Endpoint: POST /api/imports/file (multipart)
 * Response: workout_session normalizzata + import_quota aggiornata.
 */
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { api } from './api';

export type ImportQuota = {
  tier: 'free' | 'starter' | 'performance' | 'elite';
  monthly_limit: number;
  used_this_month: number;
  remaining: number | null;
  is_unlimited: boolean;
};

export type ImportResult = {
  session_id: string;
  title: string;
  distance_km: number;
  duration_seconds: number;
  activity_type: string;
  import_source: 'fit' | 'gpx' | 'tcx';
  import_filename: string;
  import_quota: ImportQuota;
};

const ACCEPTED_EXTENSIONS = ['fit', 'gpx', 'tcx'];
const ACCEPTED_MIME = [
  'application/octet-stream',
  'application/gpx+xml',
  'application/vnd.garmin.tcx+xml',
  'application/xml',
  'text/xml',
  '*/*',
];

export async function getImportQuota(): Promise<ImportQuota> {
  const res = await api.get('/imports/quota');
  return res.data;
}

/**
 * Apre il document picker, valida l'estensione e fa l'upload via multipart al backend.
 * Ritorna `null` se l'utente annulla la selezione.
 */
export async function pickAndImportFile(): Promise<ImportResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ACCEPTED_MIME,
    multiple: false,
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  const name = (asset.name || '').toLowerCase();
  const ext = name.split('.').pop();
  if (!ext || !ACCEPTED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Formato non supportato. Accettati: .${ACCEPTED_EXTENSIONS.join(', .')}`,
    );
  }

  // Costruisco FormData
  const formData = new FormData();
  const fileObj: any = Platform.OS === 'web'
    ? (asset.file as any)
    : {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
      };
  formData.append('file', fileObj);

  const res = await api.post('/imports/file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    // Timeout più lungo: il parsing può essere lento per file FIT di lunga durata
    timeout: 60000,
  });
  return res.data as ImportResult;
}
