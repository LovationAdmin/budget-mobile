import React from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Link2 } from 'lucide-react-native';

import { useBudget, useBudgetData } from '@/hooks/useBudget';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/ErrorScreen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { palette } from '@/constants/colors';
import type { RealityData } from '@/types';

function formatMoney(n: number, currency = 'EUR') {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n); }
  catch { return `${n.toFixed(2)} ${currency}`; }
}

function CompareBar({
  label, planned, actual, currency,
}: {
  label: string; planned: number; actual: number; currency: string;
}) {
  const max = Math.max(planned, actual, 1);
  const overBudget = actual > planned;
  const diff = actual - planned;
  return (
    <View className="mb-4">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-sm text-foreground font-medium">{label}</Text>
        <Text
          className="text-xs font-display-semibold"
          style={{ color: overBudget ? palette.danger : palette.success }}
        >
          {overBudget ? '+' : ''}{formatMoney(diff, currency)}
        </Text>
      </View>
      <View className="mb-1 flex-row items-center gap-2">
        <Text className="w-14 text-right text-xs text-muted-fg">Prévu</Text>
        <View className="flex-1 h-3 rounded-full bg-muted">
          <View className="h-full rounded-full bg-primary" style={{ width: `${(planned / max) * 100}%` }} />
        </View>
        <Text className="w-20 text-xs text-muted-fg">{formatMoney(planned, currency)}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Text className="w-14 text-right text-xs text-muted-fg">Réel</Text>
        <View className="flex-1 h-3 rounded-full bg-muted">
          <View
            className="h-full rounded-full"
            style={{
              width: `${(actual / max) * 100}%`,
              backgroundColor: overBudget ? palette.danger : palette.success,
            }}
          />
        </View>
        <Text className="w-20 text-xs text-muted-fg">{formatMoney(actual, currency)}</Text>
      </View>
    </View>
  );
}

export default function RealityTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const budget = useBudget(id!);
  const env    = useBudgetData(id!);

  if (env.isLoading) return <LoadingScreen />;
  if (env.isError || !env.data) return <ErrorScreen onRetry={env.refetch} />;

  const reality = env.data.data?.reality as RealityData | undefined;
  const currency = budget.data?.currency ?? 'EUR';

  const goConnect = () =>
    router.push({ pathname: '/(app)/banking-connect', params: { id, institutionId: '' } });

  if (!reality) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-warm-50">
          <Link2 size={32} color={palette.warm} />
        </View>
        <Text className="text-center text-base text-foreground font-display-semibold">
          {t('budget.reality.noConnection')}
        </Text>
        <Text className="mt-2 text-center text-sm text-muted-fg font-sans">
          {t('budget.reality.title')}
        </Text>
        <Button variant="warm" className="mt-6" onPress={goConnect}>
          {t('budget.reality.connectBank')}
        </Button>
      </View>
    );
  }

  const totalDiff = reality.actual_total - reality.planned_total;
  const overBudget = totalDiff > 0;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      refreshControl={
        <RefreshControl refreshing={env.isRefetching} onRefresh={env.refetch} tintColor={palette.primary} />
      }
    >
      <Card className="mb-4">
        <View className="flex-row gap-3">
          <View className="flex-1 items-center rounded-xl bg-primary/5 py-3">
            <Text className="text-xs text-muted-fg font-sans">Prévu</Text>
            <Text className="mt-0.5 text-lg text-primary font-display-bold">
              {formatMoney(reality.planned_total, currency)}
            </Text>
          </View>
          <View className="flex-1 items-center rounded-xl bg-muted py-3">
            <Text className="text-xs text-muted-fg font-sans">{t('budget.reality.totalReal')}</Text>
            <Text
              className="mt-0.5 text-lg font-display-bold"
              style={{ color: overBudget ? palette.danger : palette.success }}
            >
              {formatMoney(reality.actual_total, currency)}
            </Text>
          </View>
        </View>
        <View className={`mt-3 rounded-xl px-4 py-2 ${overBudget ? 'bg-danger/10' : 'bg-success/10'}`}>
          <Text
            className="text-center text-sm font-display-semibold"
            style={{ color: overBudget ? palette.danger : palette.success }}
          >
            {overBudget ? '+' : '-'}{formatMoney(Math.abs(totalDiff), currency)}
          </Text>
        </View>
      </Card>

      <Card>
        <Text className="mb-4 text-sm text-foreground font-display-semibold">
          {t('budget.tabs.charges')}
        </Text>
        {reality.by_category.map((item) => (
          <CompareBar
            key={String(item.category)}
            label={t(`categories.${item.category}`, { defaultValue: String(item.category) })}
            planned={item.planned}
            actual={item.actual}
            currency={currency}
          />
        ))}
      </Card>

      {!reality.banking_connected ? (
        <TouchableOpacity onPress={goConnect}>
          <Button variant="warm" className="mt-4" onPress={goConnect}>
            {t('budget.reality.connectBank')}
          </Button>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}
