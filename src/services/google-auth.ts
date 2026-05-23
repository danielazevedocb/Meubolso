import { Platform } from 'react-native';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { supabase } from '@/lib/supabase';
import { mapAuthError } from '@/services/supabase-errors';

export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ['email', 'profile'],
  });
}

/** Returns null on success, error string on failure, null if user cancelled. */
export async function signInWithGoogle(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const response = await GoogleSignin.signIn();

    if (response.type !== 'success') return null;

    const idToken = response.data.idToken;
    if (!idToken) return 'Não foi possível obter o token do Google.';

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) return mapAuthError(error);
    return null;
  } catch (err: unknown) {
    if (isErrorWithCode(err)) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) return null;
      if (err.code === statusCodes.IN_PROGRESS) return null;
      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE)
        return 'Google Play Services não disponível neste dispositivo.';
    }
    return 'Não foi possível entrar com o Google. Tente novamente.';
  }
}
