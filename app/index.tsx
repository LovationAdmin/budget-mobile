import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function Index() {
  const { isAuthenticated, isLoading, isLocked } = useAuth();
  const { t } = useTranslation();

  if (isLoading) return <LoadingScreen message={t('common.loading')} />;
  if (isLocked) return <Redirect href="/(auth)/biometric-unlock" />;
  return <Redirect href={isAuthenticated ? '/(app)' : '/(auth)/login'} />;
}
