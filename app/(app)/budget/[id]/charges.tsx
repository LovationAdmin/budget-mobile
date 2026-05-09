import React from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useBudgetData } from '@/hooks/useBudget';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/ErrorScreen';
import { Card } from '@/components/ui/Card';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/constants/colors';
import type { Charge } from '@/types';

function formatEur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

const RECURRENCE_LABELS: Record<string, string> = {
  monthly:  'Mensuel',
  yearly:   'Annuel',
  'one-time': 'Unique',
};

function ChargeRow({ charge }: { charge: Charge }) {
  const color = CATEGORY_COLORS[charge.category] ?? '#94a3b8';
  const savings = charge.market_suggestion?.savings_potential;

  return (
    <Card className="mb-2" padding="sm">
      <View className="flex-row items-start">
        <View
          className="mr-3 mt-0.5 h-3 w-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <View className="flex-1">
          <Text className="font-semibold text-slate-900">{charge.label}</Text>
          <View className="mt-0.5 flex-row items-center gap-2">
            <Text className="text-xs text-slate-400">
              {CATEGORY_LABELS[charge.category] ?? charge.category}
            </Text>
            <Text className="text-xs text-slate-300">·</Text>
            <Text className="text-xs text-slate-400">
              {RECURRENCE_LABELS[charge.recurrence] ?? charge.recurrence}
            </Text>
          </View>
          {savings != null && savings > 0 && (
            <View className="mt-1 flex-row items-center gap-1 rounded-lg bg-green-50 px-2 py-1 self-start">
              <Text className="text-xs text-green-600">
                💡 Économisez jusqu'à {formatEur(savings)}/mois
              </Text>
            </View>
          )}
        </View>
        <Text className="ml-2 font-bold text-slate-900">{formatEur(charge.amount)}</Text>
      </View>
    </Card>
  );
}

export default function ChargesTab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch, isRefetching } = useBudgetData(id!);

  if (isLoading) return <LoadingScreen />;
  if (isError || !data) return <ErrorScreen onRetry={refetch} />;

  const totalSavings = data.charges.reduce(
    (acc, c) => acc + (c.market_suggestion?.savings_potential ?? 0),
    0,
  );

  return (
    <FlatList
      data={data.charges}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      renderItem={({ item }) => <ChargeRow charge={item} />}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />}
      ListHeaderComponent={
        <View className="mb-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-slate-800">
              {data.charges.length} charge{data.charges.length > 1 ? 's' : ''}
            </Text>
            <Text className="font-bold text-danger">
              {formatEur(data.total_expenses)} / mois
            </Text>
          </View>
          {totalSavings > 0 && (
            <Card className="mt-3 bg-green-50" padding="sm">
              <Text className="text-sm font-semibold text-green-700">
                💡 Potentiel d'économies détecté : {formatEur(totalSavings)}/mois
              </Text>
            </Card>
          )}
        </View>
      }
      ListEmptyComponent={
        <Card className="items-center py-10">
          <Text className="text-3xl">💳</Text>
          <Text className="mt-3 text-sm text-slate-400">Aucune charge enregistrée</Text>
        </Card>
      }
    />
  );
}
