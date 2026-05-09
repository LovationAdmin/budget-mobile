import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { CheckCircle2, XCircle } from 'lucide-react-native';

import { API_BASE_URL, ENDPOINTS } from '@/constants/api';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Button } from '@/components/ui/Button';
import { palette } from '@/constants/colors';

export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    (async () => {
      if (!token) { setStatus('error'); setMessage(t('errors.validation')); return; }
      try {
        const { data } = await axios.get(
          `${API_BASE_URL}${ENDPOINTS.VERIFY_EMAIL}?token=${encodeURIComponent(token)}`,
        );
        setStatus('ok');
        setMessage((data?.message as string) ?? '');
      } catch (e: unknown) {
        setStatus('error');
        const apiErr = (e as { response?: { data?: { error?: string } } }).response?.data;
        setMessage(apiErr?.error ?? t('errors.session_expired'));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (status === 'pending') return <LoadingScreen message={t('common.loading')} />;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <View className={`mb-4 h-20 w-20 items-center justify-center rounded-full ${
          status === 'ok' ? 'bg-success/10' : 'bg-danger/10'
        }`}>
          {status === 'ok'
            ? <CheckCircle2 size={48} color={palette.success} />
            : <XCircle    size={48} color={palette.danger}  />}
        </View>
        <Text className="mb-2 text-2xl text-foreground font-display-bold">
          {status === 'ok' ? t('common.confirm') : t('common.error')}
        </Text>
        <Text className="mb-8 text-center text-base text-muted-fg font-sans">{message}</Text>
        <Button onPress={() => router.replace('/(auth)/login')} size="lg" className="w-full">
          {t('auth.signin')}
        </Button>
      </View>
    </SafeAreaView>
  );
}
