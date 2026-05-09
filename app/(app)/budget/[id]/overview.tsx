import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { VictoryPie } from 'victory-native';
import { Plus, Pencil } from 'lucide-react-native';

import { useBudget, useBudgetData } from '@/hooks/useBudget';
import { useBudgetMutations } from '@/hooks/useBudgetMutations';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/ErrorScreen';
import { Card } from '@/components/ui/Card';
import { IncomeFormSheet } from '@/components/forms/IncomeFormSheet';
import { CATEGORY_COLORS, palette } from '@/constants/colors';
import type { Charge, IncomeSource } from '@/types';

function formatMoney(n: number, currency = 'EUR') {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n); }
  catch { return `${n.toFixed(2)} ${currency}`; }
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card className="flex-1 items-center" padding="md">
      <Text className="mb-1 text-xs text-muted-fg font-medium">{label}</Text>
      <Text className="text-xl font-display-bold" style={{ color }}>{value}</Text>
    </Card>
  );
}

export default function OverviewTab() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const budget = useBudget(id!);
  const env    = useBudgetData(id!);
  const m      = useBudgetMutations(id!);
  const [editingIncome, setEditingIncome] = useState<IncomeSource | undefined>(undefined);
  const [showIncomeForm, setShowIncomeForm] = useState(false);

  if (env.isLoading || budget.isLoading) return <LoadingScreen />;
  if (env.isError || !env.data) return <ErrorScreen onRetry={env.refetch} />;

  const data = env.data.data ?? {};
  const currency = budget.data?.currency ?? 'EUR';
  const charges  = (data.charges ?? []) as Charge[];
  const incomes  = (data.income_sources ?? []) as IncomeSource[];

  const totalIncome   = data.total_income   ?? incomes.reduce((s, i) => s + (i.amount ?? 0), 0);
  const totalExpenses = data.total_expenses ?? charges.reduce((s, c) => s + (c.amount ?? 0), 0);
  const balance       = data.balance        ?? totalIncome - totalExpenses;
  const balanceColor  = balance >= 0 ? palette.success : palette.danger;

  const pieData = useMemo(() => {
    const byCat = charges.reduce<Record<string, number>>((acc, c) => {
      const k = String(c.category);
      acc[k] = (acc[k] ?? 0) + (c.amount ?? 0);
      return acc;
    }, {});
    return Object.entries(byCat).map(([k, amount]) => ({
      x: t(`categories.${k}`, { defaultValue: k }),
      y: amount,
      color: CATEGORY_COLORS[k] ?? palette.light.mutedFg,
    }));
  }, [charges, t]);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={
        <RefreshControl refreshing={env.isRefetching} onRefresh={env.refetch} tintColor={palette.primary} />
      }
    >
      <View className="flex-row gap-3">
        <StatBox label={t('budget.overview.income')}   value={formatMoney(totalIncome, currency)}   color={palette.success} />
        <StatBox label={t('budget.overview.expenses')} value={formatMoney(totalExpenses, currency)} color={palette.danger}  />
      </View>

      <Card className="items-center" padding="md">
        <Text className="text-sm text-muted-fg font-medium">{t('budget.overview.balance')}</Text>
        <Text className="mt-1 text-3xl font-display-extra" style={{ color: balanceColor }}>
          {formatMoney(balance, currency)}
        </Text>
      </Card>

      {pieData.length > 0 ? (
        <Card>
          <Text className="mb-2 text-sm text-foreground font-display-semibold">
            {t('budget.overview.monthlyBreakdown')}
          </Text>
          <View className="items-center">
            <VictoryPie
              data={pieData}
              width={280} height={220}
              colorScale={pieData.map((d) => d.color)}
              innerRadius={50} padAngle={2}
              labels={({ datum }: { datum: { y: number } }) =>
                `${Math.round((datum.y / Math.max(totalExpenses, 1)) * 100)}%`
              }
              style={{ labels: { fontSize: 11, fill: palette.light.mutedFg, fontWeight: '600' } }}
            />
          </View>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {pieData.map((d) => (
              <View key={d.x} className="flex-row items-center gap-1">
                <View className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                <Text className="text-xs text-muted-fg font-sans">{d.x}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <Card>
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm text-foreground font-display-semibold">
            {t('budget.overview.income')}
          </Text>
          <TouchableOpacity
            onPress={() => { setEditingIncome(undefined); setShowIncomeForm(true); }}
            className="rounded-lg bg-warm-500 px-3 py-1 flex-row items-center"
          >
            <Plus size={14} color="#FFF" />
            <Text className="ml-1 text-xs text-white font-display-semibold">
              {t('common.save')}
            </Text>
          </TouchableOpacity>
        </View>
        {incomes.length > 0 ? (
          incomes.map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => { setEditingIncome(s); setShowIncomeForm(true); }}
              className="mb-2 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-2 flex-1">
                <Pencil size={12} color={palette.light.mutedFg} />
                <Text className="text-sm text-foreground font-sans">{s.label}</Text>
              </View>
              <Text className="text-sm text-success font-display-semibold">
                {formatMoney(s.amount ?? 0, currency)}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text className="text-sm text-muted-fg font-sans">{t('common.empty')}</Text>
        )}
      </Card>

      <IncomeFormSheet
        visible={showIncomeForm}
        onClose={() => setShowIncomeForm(false)}
        initial={editingIncome}
        onSubmit={async (i) => {
          if (editingIncome) await m.updateIncome(editingIncome.id, i);
          else               await m.addIncome(i);
        }}
        onDelete={editingIncome ? () => m.removeIncome(editingIncome.id) : undefined}
      />
    </ScrollView>
  );
}
