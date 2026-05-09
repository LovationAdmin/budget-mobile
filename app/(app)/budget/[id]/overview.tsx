import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { VictoryPie } from 'victory-native';

import { useBudgetData } from '@/hooks/useBudget';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/ErrorScreen';
import { Card } from '@/components/ui/Card';
import { CATEGORY_COLORS, CATEGORY_LABELS, COLORS } from '@/constants/colors';

function formatEur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl bg-white p-4"
      style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
      <Text className="mb-1 text-xs font-medium text-slate-500">{label}</Text>
      <Text className="text-xl font-bold" style={{ color }}>{value}</Text>
    </View>
  );
}

export default function OverviewTab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch, isRefetching } = useBudgetData(id!);

  if (isLoading) return <LoadingScreen />;
  if (isError || !data) return <ErrorScreen onRetry={refetch} />;

  // Build pie chart data by category
  const byCategory = data.charges.reduce<Record<string, number>>((acc, c) => {
    acc[c.category] = (acc[c.category] ?? 0) + c.amount;
    return acc;
  }, {});

  const pieData = Object.entries(byCategory).map(([cat, amount]) => ({
    x: CATEGORY_LABELS[cat] ?? cat,
    y: amount,
    color: CATEGORY_COLORS[cat] ?? '#94a3b8',
  }));

  const balance = data.total_income - data.total_expenses;
  const balanceColor = balance >= 0 ? COLORS.success : COLORS.danger;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />}
    >
      {/* KPI row */}
      <View className="flex-row gap-3">
        <StatBox label="Revenus" value={formatEur(data.total_income)} color={COLORS.success} />
        <StatBox label="Charges" value={formatEur(data.total_expenses)} color={COLORS.danger} />
      </View>
      <Card className="items-center py-3">
        <Text className="text-sm font-medium text-slate-500">Solde mensuel</Text>
        <Text className="mt-1 text-3xl font-extrabold" style={{ color: balanceColor }}>
          {formatEur(balance)}
        </Text>
      </Card>

      {/* Pie chart */}
      {pieData.length > 0 && (
        <Card>
          <Text className="mb-2 text-sm font-semibold text-slate-700">Répartition des charges</Text>
          <View className="items-center">
            <VictoryPie
              data={pieData}
              width={280}
              height={220}
              colorScale={pieData.map((d) => d.color)}
              innerRadius={50}
              padAngle={2}
              labels={({ datum }) => `${Math.round((datum.y / data.total_expenses) * 100)}%`}
              style={{
                labels: { fontSize: 11, fill: '#64748b', fontWeight: '600' },
              }}
            />
          </View>
          {/* Legend */}
          <View className="mt-2 flex-row flex-wrap gap-2">
            {pieData.map((d) => (
              <View key={d.x} className="flex-row items-center gap-1">
                <View className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                <Text className="text-xs text-slate-500">{d.x}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Income sources */}
      {data.income_sources.length > 0 && (
        <Card>
          <Text className="mb-3 text-sm font-semibold text-slate-700">Sources de revenus</Text>
          {data.income_sources.map((s) => (
            <View key={s.id} className="mb-2 flex-row items-center justify-between">
              <Text className="text-sm text-slate-700">{s.label}</Text>
              <Text className="text-sm font-semibold text-success">{formatEur(s.amount)}</Text>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}
