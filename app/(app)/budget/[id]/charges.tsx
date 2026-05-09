import React from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CreditCard, Sparkles } from 'lucide-react-native';

import { useBudget, useBudgetData } from '@/hooks/useBudget';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/ErrorScreen';
import { Card } from '@/components/ui/Card';
import { CATEGORY_COLORS, palette } from '@/constants/colors';
import type { Charge } from '@/types';

function formatMoney(n: number, currency = 'EUR') {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n); }
  catch { return `${n.toFixed(2)} ${currency}`; }
}

function ChargeRow({ charge, currency }: { charge: Charge; currency: string }) {
  const { t } = useTranslation();
  const color = CATEGORY_COLORS[String(charge.category)] ?? palette.light.mutedFg;
  const savings = charge.market_suggestion?.savings_potential;
  return (
    <Card className="mb-2" padding="sm">
      <View className="flex-row items-start">
        <View className="mr-3 mt-0.5 h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <View className="flex-1">
          <Text className="text-foreground font-display-semibold">{charge.label}</Text>
          <View className="mt-0.5 flex-row items-center gap-2">
            <Text className="text-xs text-muted-fg font-sans">
              {t(`categories.${charge.category}`, { defaultValue: String(charge.category) })}
            </Text>
            {charge.recurrence ? (
              <>
                <Text className="text-xs text-muted-fg/40">·</Text>
                <Text className="text-xs text-muted-fg font-sans">{charge.recurrence}</Text>
              </>
            ) : null}
          </View>
          {savings != null && savings > 0 ? (
            <View className="mt-1 flex-row items-center gap-1 rounded-lg bg-success/10 px-2 py-1 self-start">
              <Sparkles size={12} color={palette.success} />
              <Text className="text-xs text-success font-medium">
                -{formatMoney(savings, currency)}/mois
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="ml-2 text-foreground font-display-bold">
          {formatMoney(charge.amount, currency)}
        </Text>
      </View>
    </Card>
  );
}

export default function ChargesTab() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const budget = useBudget(id!);
  const env = useBudgetData(id!);

  if (env.isLoading) return <LoadingScreen />;
  if (env.isError || !env.data) return <ErrorScreen onRetry={env.refetch} />;

  const data = env.data.data ?? {};
  const currency = budget.data?.currency ?? 'EUR';
  const charges = (data.charges ?? []) as Charge[];
  const totalExpenses = data.total_expenses ?? charges.reduce((s, c) => s + (c.amount ?? 0), 0);
  const totalSavings  = charges.reduce((s, c) => s + (c.market_suggestion?.savings_potential ?? 0), 0);

  return (
    <FlatList
      data={charges}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      renderItem={({ item }) => <ChargeRow charge={item} currency={currency} />}
      refreshControl={
        <RefreshControl refreshing={env.isRefetching} onRefresh={env.refetch} tintColor={palette.primary} />
      }
      ListHeaderComponent={
        <View className="mb-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base text-foreground font-display-semibold">
              {charges.length} {t('budget.charges.title').toLowerCase()}
            </Text>
            <Text className="text-danger font-display-bold">
              {formatMoney(totalExpenses, currency)}
            </Text>
          </View>
          {totalSavings > 0 ? (
            <Card className="mt-3 bg-success/10" padding="sm">
              <View className="flex-row items-center gap-2">
                <Sparkles size={16} color={palette.success} />
                <Text className="text-sm text-success font-display-semibold">
                  -{formatMoney(totalSavings, currency)} / mois
                </Text>
              </View>
            </Card>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <Card className="items-center py-10">
          <CreditCard size={32} color={palette.light.mutedFg} />
          <Text className="mt-3 text-sm text-muted-fg font-sans">{t('common.empty')}</Text>
        </Card>
      }
    />
  );
}
