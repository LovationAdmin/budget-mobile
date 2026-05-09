import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { format, parseISO, isSameMonth, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useBudgetData } from '@/hooks/useBudget';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/ErrorScreen';
import { Card } from '@/components/ui/Card';
import { COLORS } from '@/constants/colors';
import type { CalendarEntry } from '@/types';

function formatEur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

function EntryRow({ entry }: { entry: CalendarEntry }) {
  const isIncome = entry.type === 'income';
  return (
    <View className="mb-1.5 flex-row items-center justify-between rounded-xl bg-white px-4 py-3"
      style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
      <View className="flex-1">
        <Text className="text-sm font-medium text-slate-800">{entry.label}</Text>
        <Text className="text-xs text-slate-400">
          {format(parseISO(entry.date), 'd MMM', { locale: fr })}
        </Text>
      </View>
      <Text
        className="text-sm font-bold"
        style={{ color: isIncome ? COLORS.success : COLORS.danger }}
      >
        {isIncome ? '+' : '-'}{formatEur(Math.abs(entry.amount))}
      </Text>
    </View>
  );
}

export default function CalendarTab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch, isRefetching } = useBudgetData(id!);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  if (isLoading) return <LoadingScreen />;
  if (isError || !data) return <ErrorScreen onRetry={refetch} />;

  const entries = (data.calendar_entries ?? []).filter((e) =>
    isSameMonth(parseISO(e.date), currentMonth),
  );
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const monthIncome   = sorted.filter((e) => e.type === 'income').reduce((a, e) => a + e.amount, 0);
  const monthExpenses = sorted.filter((e) => e.type === 'expense').reduce((a, e) => a + e.amount, 0);

  return (
    <FlatList
      data={sorted}
      keyExtractor={(e) => e.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      renderItem={({ item }) => <EntryRow entry={item} />}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />}
      ListHeaderComponent={
        <View className="mb-4">
          {/* Month navigator */}
          <View className="mb-3 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="p-2"
            >
              <Text className="text-xl text-slate-500">‹</Text>
            </TouchableOpacity>
            <Text className="text-base font-bold capitalize text-slate-900">
              {format(currentMonth, 'MMMM yyyy', { locale: fr })}
            </Text>
            <TouchableOpacity
              onPress={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="p-2"
            >
              <Text className="text-xl text-slate-500">›</Text>
            </TouchableOpacity>
          </View>

          {/* Month summary */}
          <View className="flex-row gap-3">
            <Card className="flex-1 items-center py-3" padding="none">
              <Text className="text-xs text-slate-400">Revenus</Text>
              <Text className="mt-0.5 text-base font-bold text-success">
                {formatEur(monthIncome)}
              </Text>
            </Card>
            <Card className="flex-1 items-center py-3" padding="none">
              <Text className="text-xs text-slate-400">Dépenses</Text>
              <Text className="mt-0.5 text-base font-bold text-danger">
                {formatEur(monthExpenses)}
              </Text>
            </Card>
          </View>
        </View>
      }
      ListEmptyComponent={
        <Card className="items-center py-10">
          <Text className="text-3xl">📅</Text>
          <Text className="mt-3 text-sm text-slate-400">Aucune entrée ce mois-ci</Text>
        </Card>
      }
    />
  );
}
