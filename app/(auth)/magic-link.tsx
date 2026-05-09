import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Button } from '@/components/ui/Button';

// Reached via deep link: budgetfamille://magic-link?token=...
// or https://budgetfamille.com/m/magic-link?token=...
export default function MagicLinkVerify() {
  const { t } = useTranslation();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { verifyMagicLink } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    (async () => {
      if (!token) { setError(t('errors.validation')); setVerifying(false); return; }
      try {
        await verifyMagicLink(token);
        router.replace('/(app)');
      } catch {
        setError(t('errors.session_expired'));
        setVerifying(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (verifying) return <LoadingScreen message={t('auth.verifyMagicLink')} />;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="mb-3 text-xl text-foreground font-display-bold">{t('common.error')}</Text>
        <Text className="mb-8 text-center text-base text-muted-fg font-sans">{error}</Text>
        <Button onPress={() => router.replace('/(auth)/login')} size="lg" className="w-full">
          {t('auth.signin')}
        </Button>
      </View>
    </SafeAreaView>
  );
}
