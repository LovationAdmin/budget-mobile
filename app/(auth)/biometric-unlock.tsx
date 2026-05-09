import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { palette } from '@/constants/colors';

export default function BiometricUnlock() {
  const { t } = useTranslation();
  const router = useRouter();
  const { unlock, logout } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(true);

  useEffect(() => {
    (async () => {
      const ok = await unlock();
      setBusy(false);
      if (ok) router.replace('/(app)');
    })();
    // We deliberately omit `unlock` from deps — it must run exactly once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tryAgain = async () => {
    setError(null);
    setBusy(true);
    const ok = await unlock();
    setBusy(false);
    if (ok) router.replace('/(app)');
    else setError(t('errors.validation'));
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-warm-50">
          <ActivityIndicator size="large" color={palette.warm} />
        </View>
        <Text className="mb-2 text-2xl text-foreground font-display-bold">
          {t('biometric.title')}
        </Text>
        <Text className="mb-10 text-center text-base text-muted-fg font-sans">
          {t('biometric.subtitle')}
        </Text>

        {error ? (
          <Text className="mb-4 text-sm text-danger font-sans">{error}</Text>
        ) : null}

        <Button size="lg" variant="warm" onPress={tryAgain} loading={busy} className="w-full">
          {t('biometric.useBiometric')}
        </Button>

        <TouchableOpacity className="mt-4 py-3" onPress={logout}>
          <Text className="text-sm text-muted-fg font-sans">{t('biometric.useFallback')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
