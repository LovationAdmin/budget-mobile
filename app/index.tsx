import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import { OnboardingService } from '@/services/onboarding.service';

export default function Index() {
  const { isAuthenticated, isLoading, isLocked } = useAuth();
  const { t } = useTranslation();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    OnboardingService.isCompleted()
      .then(setOnboarded)
      .catch(() => setOnboarded(true));
  }, []);

  if (isLoading || onboarded === null) return <LoadingScreen message={t('common.loading')} />;
  if (isLocked) return <Redirect href="/(auth)/biometric-unlock" />;
  if (isAuthenticated) return <Redirect href="/(app)" />;
  if (!onboarded) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(auth)/login" />;
}
