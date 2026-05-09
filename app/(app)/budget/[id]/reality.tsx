import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useBudgetData } from '@/hooks/useBudget';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/ErrorScreen';
import { Card } from '@/components/ui/Card';
import { CATEGORY_LABELS, COLORS } from '@/constants/colors';

function formatEur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

function CompareBar({
  label,
  planned,
  actual,
}: {
  label: string;
  planned: number;
  actual: number;
}) {
  const max = Math.max(planned, actual, 1);
  const overBudget = actual > planned;
  const diff = actual - planned;

  return (
    <View className="mb-4">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-slate-700">{label}</Text>
        <Text
          className="text-xs font-semibold"
          style={{ color: overBudget ? COLORS.danger : COLORS.success }}
        >
          {overBudget ? '+' : ''}{formatEur(diff)}
        </Text>
      </View>
      {/* Planned bar */}
      <View className="mb-1">
        <View className="flex-row items-center gap-2">
          <Text className="w-14 text-right text-xs text-slate-400">Prévu</Text>
          <View className="flex-1 h-3 rounded-full bg-slate-100">
            <View
              className="h-full rounded-full bg-primary-500"
              style={{ width: `${(planned / max) * 100}%` }}
            />
          </View>
          <Text className="w-20 text-xs text-slate-500">{formatEur(planned)}</Text>
        </View>
      </View>
      {/* Actual bar */}
      <View>
        <View className="flex-row items-center gap-2">
          <Text className="w-14 text-right text-xs text-slate-400">Réel</Text>
          <View className="flex-1 h-3 rounded-full bg-slate-100">
            <View
              className="h-full rounded-full"
              style={{
                width: `${(actual / max) * 100}%`,
                backgroundColor: overBudget ? COLORS.danger : COLORS.success,
              }}
            />
          </View>
          <Text className="w-20 text-xs text-slate-500">{formatEur(actual)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function RealityTab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch, isRefetching } = useBudgetData(id!);

  if (isLoading) return <LoadingScreen />;
  if (isError || !data) return <ErrorScreen onRetry={refetch} />;

  const reality = data.reality;

  if (!reality) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Text className="text-4xl">🔗</Text>
        <Text className="mt-4 text-center text-base font-semibold text-slate-700">
          Connexion bancaire requise
        </Text>
        <Text className="mt-2 text-center text-sm text-slate-400">
          Connectez votre compte bancaire via EnableBanking dans la version web pour voir vos
          dépenses réelles vs. planifiées.
        </Text>
      </View>
    );
  }

  const totalDiff = reality.actual_total - reality.planned_total;
  const overBudget = totalDiff > 0;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />}
    >
      {/* Global summary */}
      <Card className="mb-4">
        <View className="flex-row gap-3">
          <View className="flex-1 items-center rounded-xl bg-primary-50 py-3">
            <Text className="text-xs text-slate-500">Prévu</Text>
            <Text className="mt-0.5 text-lg font-bold text-primary-600">
              {formatEur(reality.planned_total)}
            </Text>
          </View>
          <View className="flex-1 items-center rounded-xl bg-slate-50 py-3">
            <Text className="text-xs text-slate-500">Réel</Text>
            <Text
              className="mt-0.5 text-lg font-bold"
              style={{ color: overBudget ? COLORS.danger : COLORS.success }}
            >
              {formatEur(reality.actual_total)}
            </Text>
          </View>
        </View>
        <View
          className={`mt-3 rounded-xl px-4 py-2 ${overBudget ? 'bg-red-50' : 'bg-green-50'}`}
        >
          <Text
            className="text-center text-sm font-semibold"
            style={{ color: overBudget ? COLORS.danger : COLORS.success }}
          >
            {overBudget
              ? `⚠ Dépassement de ${formatEur(totalDiff)}`
              : `✓ Budget respecté — ${formatEur(Math.abs(totalDiff))} d'économies`}
          </Text>
        </View>
      </Card>

      {/* Per category */}
      <Card>
        <Text className="mb-4 text-sm font-semibold text-slate-700">Par catégorie</Text>
        {reality.by_category.map((item) => (
          <CompareBar
            key={item.category}
            label={CATEGORY_LABELS[item.category] ?? item.category}
            planned={item.planned}
            actual={item.actual}
          />
        ))}
      </Card>
    </ScrollView>
  );
}
