import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import api from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { palette } from '@/constants/colors';
import { LoadingScreen } from '@/components/LoadingScreen';

// Banking onboarding via Enable Banking PSD2.
// 1. Mobile calls POST /banking/enablebanking/connect with the chosen bank
//    -> server returns { auth_url } (an Enable Banking OAuth-like consent URL).
// 2. We open that URL in a WebView.
// 3. When the WebView navigates back to https://budgetfamille.com/beta2/callback?...,
//    the server has already processed the callback (see budget-api/handlers/
//    enable_banking_handler.go::HandleCallback). We close the WebView and
//    refresh the connections list.

interface ConnectStartResponse {
  auth_url: string;
  connection_id?: string;
}

export default function BankingConnect() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: budgetId, institutionId } = useLocalSearchParams<{
    id?: string; institutionId?: string;
  }>();

  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closedRef = useRef(false);

  useEffect(() => {
    (async () => {
      if (!institutionId) { setError('institutionId required'); return; }
      try {
        const { data } = await api.post<ConnectStartResponse>(
          ENDPOINTS.BANK_CONNECT,
          { institution_id: institutionId, budget_id: budgetId },
        );
        setAuthUrl(data.auth_url);
      } catch {
        setError(t('errors.network'));
      }
    })();
  }, [institutionId, budgetId, t]);

  const onNavChange = (nav: WebViewNavigation) => {
    if (closedRef.current) return;
    if (nav.url.includes('/beta2/callback') || nav.url.includes('/banking/enablebanking/callback')) {
      closedRef.current = true;
      Alert.alert(t('common.confirm'), t('common.save'), [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-base text-danger font-sans text-center">{error}</Text>
        <TouchableOpacity className="mt-4" onPress={() => router.back()}>
          <Text className="text-primary font-display-semibold">{t('common.back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!authUrl) return <LoadingScreen message={t('common.loading')} />;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center border-b border-border bg-card px-5 py-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ChevronLeft size={24} color={palette.light.foreground} />
        </TouchableOpacity>
        <Text className="text-lg text-foreground font-display-bold">
          {t('budget.reality.connectBank')}
        </Text>
      </View>
      <WebView
        source={{ uri: authUrl }}
        startInLoadingState
        renderLoading={() => (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        )}
        onNavigationStateChange={onNavChange}
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
      />
    </SafeAreaView>
  );
}
