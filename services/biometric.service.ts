import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { SECURE_STORE_KEYS } from '@/constants/api';

// Thin wrapper over expo-local-authentication. Stores user opt-in flag in
// SecureStore and exposes a single prompt() call that returns true on success.

export const BiometricService = {
  async isAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  },

  async describe(): Promise<'face' | 'fingerprint' | 'iris' | 'biometric' | 'none'> {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris';
    return types.length > 0 ? 'biometric' : 'none';
  },

  async isEnabled(): Promise<boolean> {
    const v = await SecureStore.getItemAsync(SECURE_STORE_KEYS.BIOMETRIC_OPT);
    return v === 'true';
  },

  async setEnabled(on: boolean): Promise<void> {
    if (on) await SecureStore.setItemAsync(SECURE_STORE_KEYS.BIOMETRIC_OPT, 'true');
    else await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.BIOMETRIC_OPT);
  },

  async prompt(reason: string): Promise<boolean> {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Annuler',
      disableDeviceFallback: false,
      fallbackLabel: Platform.OS === 'ios' ? 'Saisir le code' : '',
    });
    return res.success;
  },
};
