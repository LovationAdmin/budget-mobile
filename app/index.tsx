import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';

import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

const ONBOARDED_KEY = 'bf_onboarding_done';

export default function Index() {
  const { isAuthenticated, isLoading, isLocked } = useAuth();
  const { t } = useTranslation();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(ONBOARDED_KEY)
      .then((v) => setOnboarded(v === 'true'))
      .catch(() => setOnboarded(true));
  }, []);

  if (isLoading || onboarded === null) return <LoadingScreen message={t('common.loading')} />;
  if (isLocked) return <Redirect href="/(auth)/biometric-unlock" />;
  if (isAuthenticated) return <Redirect href="/(app)" />;
  if (!onboarded) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(auth)/login" />;
}

// Helper exposed for the onboarding screen's "got it" button.
export async function markOnboarded() {
  await SecureStore.setItemAsync(ONBOARDED_KEY, 'true');
}
