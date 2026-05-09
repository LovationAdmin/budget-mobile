import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { format, parseISO, isSameMonth, addMonths, subMonths } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react-native';

import { useBudget, useBudgetData } from '@/hooks/useBudget';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/ErrorScreen';
import { Card } from '@/components/ui/Card';
import { palette } from '@/constants/colors';
import type { CalendarEntry } from '@/types';

function formatMoney(n: number, currency = 'EUR') {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n); }
  catch { return `${n.toFixed(2)} ${currency}`; }
}

function EntryRow({ entry, currency }: { entry: CalendarEntry; currency: string }) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'fr' ? fr : enUS;
  const isIncome = entry.type === 'income';
  return (
    <Card className="mb-1.5" padding="sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-sm text-foreground font-display-semibold">{entry.label}</Text>
          <Text className="text-xs text-muted-fg font-sans">
            {format(parseISO(entry.date), 'd MMM', { locale })}
          </Text>
        </View>
        <Text
          className="text-sm font-display-bold"
          style={{ color: isIncome ? palette.success : palette.danger }}
        >
          {isIncome ? '+' : '-'}{formatMoney(Math.abs(entry.amount), currency)}
        </Text>
      </View>
    </Card>
  );
}

export default function CalendarTab() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const budget = useBudget(id!);
  const env = useBudgetData(id!);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  if (env.isLoading) return <LoadingScreen />;
  if (env.isError || !env.data) return <ErrorScreen onRetry={env.refetch} />;

  const allEntries = (env.data.data?.calendar_entries ?? []) as CalendarEntry[];
  const currency = budget.data?.currency ?? 'EUR';
  const locale = i18n.language === 'fr' ? fr : enUS;

  const sorted = allEntries
    .filter((e) => isSameMonth(parseISO(e.date), currentMonth))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const monthIncome   = sorted.filter((e) => e.type === 'income').reduce((a, e) => a + e.amount, 0);
  const monthExpenses = sorted.filter((e) => e.type === 'expense').reduce((a, e) => a + e.amount, 0);

  return (
    <FlatList
      data={sorted}
      keyExtractor={(e) => e.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      renderItem={({ item }) => <EntryRow entry={item} currency={currency} />}
      refreshControl={
        <RefreshControl refreshing={env.isRefetching} onRefresh={env.refetch} tintColor={palette.primary} />
      }
      ListHeaderComponent={
        <View className="mb-4">
          <View className="mb-3 flex-row items-center justify-between">
            <TouchableOpacity onPress={() => setCurrentMonth((m) => subMonths(m, 1))} className="p-2">
              <ChevronLeft size={20} color={palette.light.foreground} />
            </TouchableOpacity>
            <Text className="text-base text-foreground capitalize font-display-bold">
              {format(currentMonth, 'MMMM yyyy', { locale })}
            </Text>
            <TouchableOpacity onPress={() => setCurrentMonth((m) => addMonths(m, 1))} className="p-2">
              <ChevronRight size={20} color={palette.light.foreground} />
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-3">
            <Card className="flex-1 items-center" padding="sm">
              <Text className="text-xs text-muted-fg font-sans">{t('budget.overview.income')}</Text>
              <Text className="mt-0.5 text-base text-success font-display-bold">
                {formatMoney(monthIncome, currency)}
              </Text>
            </Card>
            <Card className="flex-1 items-center" padding="sm">
              <Text className="text-xs text-muted-fg font-sans">{t('budget.overview.expenses')}</Text>
              <Text className="mt-0.5 text-base text-danger font-display-bold">
                {formatMoney(monthExpenses, currency)}
              </Text>
            </Card>
          </View>
        </View>
      }
      ListEmptyComponent={
        <Card className="items-center py-10">
          <CalendarDays size={32} color={palette.light.mutedFg} />
          <Text className="mt-3 text-sm text-muted-fg font-sans">{t('common.empty')}</Text>
        </Card>
      }
    />
  );
}
