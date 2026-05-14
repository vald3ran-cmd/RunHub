import { Platform, Alert } from 'react-native';
import { api } from './api';
import { isSocialAuthAvailable, GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from './socialAuthConfig';

// Lazy-loaded modules
type GoogleSignInMod = any;
type AppleAuthMod = any;

let _googleSignIn: GoogleSignInMod | null = null;
let _appleAuth: AppleAuthMod | null = null;
let _googleConfigured = false;

function loadGoogle(): GoogleSignInMod | null {
  if (!isSocialAuthAvailable) return null;
  if (_googleSignIn) return _googleSignIn;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _googleSignIn = require('@react-native-google-signin/google-signin');
    return _googleSignIn;
  } catch (e) {
    console.warn('[SocialAuth] Google native module not available:', e);
    return null;
  }
}

function loadApple(): AppleAuthMod | null {
  if (!isSocialAuthAvailable) return null;
  if (Platform.OS !== 'ios') return null;
  if (_appleAuth) return _appleAuth;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _appleAuth = require('expo-apple-authentication');
    return _appleAuth;
  } catch (e) {
    console.warn('[SocialAuth] Apple module not available:', e);
    return null;
  }
}

export function configureGoogleSignIn() {
  if (_googleConfigured) return;
  const mod = loadGoogle();
  if (!mod) return;
  try {
    mod.GoogleSignin.configure({
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
      scopes: ['profile', 'email'],
    });
    _googleConfigured = true;
    console.log('[SocialAuth] GoogleSignin configured');
  } catch (e) {
    console.warn('[SocialAuth] configure failed:', e);
  }
}

export async function isAppleAuthAvailable(): Promise<boolean> {
  const mod = loadApple();
  if (!mod) return false;
  try {
    return await mod.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Trigger native Google Sign In, obtain idToken, send to backend for verification.
 * Returns the RunHub JWT + user payload (identical shape to /auth/login).
 */
export async function signInWithGoogle(): Promise<{ token: string; user: any } | null> {
  const mod = loadGoogle();
  if (!mod) {
    Alert.alert('Non disponibile', 'Il login con Google funziona solo nella build nativa (non in Expo Go).');
    return null;
  }
  configureGoogleSignIn();
  try {
    await mod.GoogleSignin.hasPlayServices?.({ showPlayServicesUpdateDialog: true });
    const userInfo = await mod.GoogleSignin.signIn();
    // v16+ returns { type: 'success', data: {...} }; older returns data directly
    const data = userInfo?.data || userInfo;
    const idToken = data?.idToken || data?.user?.idToken;
    if (!idToken) throw new Error('ID token mancante dalla risposta Google');
    const { data: resp } = await api.post('/auth/google', { id_token: idToken });
    return resp;
  } catch (e: any) {
    const code = e?.code;
    // User cancelled — silent
    if (code === mod.statusCodes?.SIGN_IN_CANCELLED || code === '-5') return null;
    console.error('[SocialAuth] Google sign in error', e);
    Alert.alert('Accesso Google fallito', e?.message || 'Riprova piu\' tardi');
    return null;
  }
}

/**
 * Trigger native Apple Sign In, obtain identity token, send to backend.
 */
export async function signInWithApple(): Promise<{ token: string; user: any } | null> {
  // 🔍 DIAGNOSTICA on-screen — necessaria perché in TestFlight i console.log sono strippati
  // e Apple Reviewer mostra "error message" senza darci dettagli.
  let step = 'start';
  let diag = '';
  const addDiag = (s: string) => { diag += s + '\n'; };

  const mod = loadApple();
  if (!mod) {
    Alert.alert('Non disponibile', 'Il login con Apple funziona solo su iOS in build nativa.');
    return null;
  }
  // Pre-flight: verify the entitlement is actually present at runtime.
  step = 'isAvailableAsync';
  try {
    const available = await mod.isAvailableAsync();
    addDiag(`isAvailable=${available}`);
    if (!available) {
      Alert.alert(
        'Apple Sign-In non disponibile',
        'Il dispositivo o la build corrente non supporta Sign In with Apple. Aggiorna l\'app all\'ultima versione.'
      );
      return null;
    }
  } catch (e: any) {
    addDiag(`isAvailable threw: ${e?.message || e}`);
    console.warn('[SocialAuth] Apple isAvailableAsync threw:', e);
  }

  // Pre-warm backend (Render free tier sleeps after 15min → cold start ~30s)
  // This runs in parallel with Apple sheet so doesn't add user-visible latency.
  step = 'prewarm';
  api.get('/health', { timeout: 5000 }).catch(() => {
    addDiag('prewarm: failed (will retry inside auth call)');
  });

  try {
    step = 'signInAsync';
    const credential = await mod.signInAsync({
      requestedScopes: [
        mod.AppleAuthenticationScope.FULL_NAME,
        mod.AppleAuthenticationScope.EMAIL,
      ],
    });
    addDiag(`credential.user=${credential?.user ? 'SET' : 'NULL'}`);
    addDiag(`identityToken=${credential?.identityToken ? `len=${credential.identityToken.length}` : 'NULL'}`);
    addDiag(`email=${credential?.email || 'NULL'}`);
    addDiag(`fullName=${credential?.fullName ? 'SET' : 'NULL'}`);

    if (!credential?.identityToken) {
      throw new Error('Apple non ha restituito un identity token. Riprova.');
    }
    const fullName = credential.fullName;
    const name = [fullName?.givenName, fullName?.familyName].filter(Boolean).join(' ') || undefined;

    // Backend call with extended timeout + 1 retry to handle Render cold start
    step = 'POST /auth/apple';
    let lastErr: any = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        addDiag(`api attempt ${attempt}/2 (timeout=90s)`);
        const { data: resp } = await api.post('/auth/apple', {
          identity_token: credential.identityToken,
          user_id: credential.user,
          email: credential.email,
          name,
        }, { timeout: 90000 });
        addDiag(`api success on attempt ${attempt}`);
        return resp;
      } catch (apiErr: any) {
        lastErr = apiErr;
        const status = apiErr?.response?.status;
        const isTimeout = apiErr?.code === 'ECONNABORTED' || /timeout/i.test(apiErr?.message || '');
        const is5xx = status >= 500 && status < 600;
        addDiag(`attempt ${attempt} failed: status=${status || 'n/a'} timeout=${isTimeout} msg=${String(apiErr?.message || apiErr).substring(0, 80)}`);
        // Retry only on timeout or 5xx (cold start scenarios)
        if (attempt === 1 && (isTimeout || is5xx)) {
          // Try to wake up backend before retry
          try { await api.get('/health', { timeout: 15000 }); } catch {}
          continue;
        }
        break;
      }
    }
    // Final failure — surface a diagnostic alert
    const detail = lastErr?.response?.data?.detail;
    const status = lastErr?.response?.status;
    console.error('[SocialAuth] Apple backend rejected token', { status, detail });
    Alert.alert(
      'Accesso Apple fallito',
      (typeof detail === 'string' ? detail : 'Server non raggiungibile. Riprova tra 30 secondi.') +
        `\n\n— DEBUG —\nStep: ${step}\nStatus: ${status || 'n/a'}\n` + diag
    );
    return null;
  } catch (e: any) {
    // User cancelled — silent
    if (e?.code === 'ERR_REQUEST_CANCELED' || e?.code === 'ERR_CANCELED') return null;
    console.error('[SocialAuth] Apple sign in error', { code: e?.code, message: e?.message });
    const code = e?.code || '';
    let message = e?.message || 'Riprova piu\' tardi';
    if (code === 'ERR_REQUEST_UNKNOWN') {
      message = 'Configurazione Apple Sign-In mancante in questa build. Riprova dopo l\'aggiornamento.';
    } else if (code === 'ERR_REQUEST_NOT_HANDLED' || code === 'ERR_REQUEST_FAILED') {
      message = 'Apple Sign-In non ha completato la richiesta. Verifica la connessione e riprova.';
    } else if (code === 'ERR_REQUEST_NOT_INTERACTIVE') {
      message = 'Apple Sign-In richiede interazione utente. Apri l\'app e riprova.';
    } else if (code === 'ERR_REQUEST_INVALID_RESPONSE') {
      message = 'Risposta Apple non valida. Riprova tra poco.';
    }
    Alert.alert(
      'Accesso Apple fallito',
      message + `\n\n— DEBUG —\nStep: ${step}\nCode: ${code || 'n/a'}\n` + diag
    );
    return null;
  }
}
