import React, { useState } from 'react';
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
import { isWebBudget, webMonthSummary } from '@/lib/budget/web';

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
  // Web-model budgets: this month exactly as the web app computes it.
  const web = isWebBudget(data) ? webMonthSummary(data) : null;
  const charges  = (data.charges ?? []) as Charge[];
  const incomes: IncomeSource[] = web
    ? [
        ...web.month.people.map((p) => ({ id: p.id, label: p.name, amount: p.contribution })),
        ...web.month.oneOffs.map((o) => ({ id: o.id, label: o.label, amount: o.amount })),
      ].filter((i) => i.amount !== 0)
    : ((data.income_sources ?? []) as IncomeSource[]);

  const totalIncome   = web ? web.month.totals.entrees : data.total_income ?? incomes.reduce((s, i) => s + (i.amount ?? 0), 0);
  const totalExpenses = web ? web.month.totals.charges : data.total_expenses ?? charges.reduce((s, c) => s + (c.amount ?? 0), 0);
  const balance       = web ? web.month.totals.reste : data.balance ?? totalIncome - totalExpenses;
  const balanceColor  = balance >= 0 ? palette.success : palette.danger;

  // Plain computation (no hook): it runs after the early returns above.
  const slices = web
    ? web.byCategory
    : Object.entries(
        charges.reduce<Record<string, number>>((acc, c) => {
          const k = String(c.category);
          acc[k] = (acc[k] ?? 0) + (c.amount ?? 0);
          return acc;
        }, {}),
      ).map(([category, amount]) => ({ category, amount }));
  const pieData = slices.map(({ category, amount }) => ({
    x: t(`categories.${category}`, { defaultValue: category }),
    y: amount,
    color: CATEGORY_COLORS[category] ?? palette.light.mutedFg,
  }));

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={
        <RefreshControl refreshing={env.isRefetching} onRefresh={env.refetch} tintColor={palette.primary} />
      }
    >
      <View className="flex-row gap-3">
        <StatBox label={t(web ? 'budget.overview.inflows' : 'budget.overview.income')} value={formatMoney(totalIncome, currency)} color={palette.success} />
        <StatBox label={t(web ? 'budget.overview.charges' : 'budget.overview.expenses')} value={formatMoney(totalExpenses, currency)} color={palette.danger} />
      </View>

      {web ? (
        <Text className="-mb-1 text-center text-xs text-muted-fg font-sans">
          {web.label}
          {web.month.totals.savings ? ` · ${t('budget.overview.savingsMonth')} ${formatMoney(web.month.totals.savings, currency)}` : ''}
        </Text>
      ) : null}

      <Card className="items-center" padding="md">
        <Text className="text-sm text-muted-fg font-medium">{t(web ? 'budget.overview.leftover' : 'budget.overview.balance')}</Text>
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
            {t(web ? 'budget.overview.contributions' : 'budget.overview.income')}
          </Text>
          {web ? null : (
          <TouchableOpacity
            onPress={() => { setEditingIncome(undefined); setShowIncomeForm(true); }}
            className="rounded-lg bg-warm-500 px-3 py-1 flex-row items-center"
          >
            <Plus size={14} color="#FFF" />
            <Text className="ml-1 text-xs text-white font-display-semibold">
              {t('common.save')}
            </Text>
          </TouchableOpacity>
          )}
        </View>
        {incomes.length > 0 ? (
          incomes.map((s) => (
            <TouchableOpacity
              key={s.id}
              disabled={!!web}
              onPress={() => { setEditingIncome(s); setShowIncomeForm(true); }}
              className="mb-2 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-2 flex-1">
                {web ? null : <Pencil size={12} color={palette.light.mutedFg} />}
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
