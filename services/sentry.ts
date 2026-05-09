import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// No-op when EXPO_PUBLIC_SENTRY_DSN is not set (dev / unconfigured installs).
export function initSentry(): void {
  const dsn =
    process.env.EXPO_PUBLIC_SENTRY_DSN ??
    (Constants.expoConfig?.extra?.sentryDsn as string | undefined);
  if (!dsn) return;

  Sentry.init({
    dsn,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.1,
    environment: __DEV__ ? 'development' : 'production',
    enableNative: true,
  });
}

export const reportError = (error: unknown, ctx?: Record<string, unknown>) => {
  if (__DEV__) console.error('[error]', error, ctx);
  Sentry.captureException(error, ctx ? { extra: ctx } : undefined);
};
