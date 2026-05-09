import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';

import { BudgetService } from '@/services/budget.service';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/LoadingScreen';
import { QUERY_KEYS } from '@/constants/api';
import { palette } from '@/constants/colors';

// Deep link target: budgetfamille://invitation/<token>
//                  https://budgetfamille.com/m/invitation/<token>
// The user is already authenticated by this point (Expo Router enforces the
// (app)/* group). If not, the (app)/_layout will redirect to login first.

export default function AcceptInvitation() {
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    (async () => {
      if (!token) { setStatus('error'); setMessage(t('errors.validation')); return; }
      try {
        await BudgetService.acceptInvitation(token);
        await qc.invalidateQueries({ queryKey: QUERY_KEYS.BUDGETS });
        setStatus('ok');
      } catch (e: unknown) {
        const apiErr = (e as { response?: { data?: { error?: string } } }).response?.data;
        setMessage(apiErr?.error ?? t('errors.session_expired'));
        setStatus('error');
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
        {message ? (
          <Text className="mb-8 text-center text-base text-muted-fg font-sans">{message}</Text>
        ) : null}
        <Button onPress={() => router.replace('/(app)')} size="lg" className="w-full">
          {t('dashboard.yourBudgets')}
        </Button>
      </View>
    </SafeAreaView>
  );
}
