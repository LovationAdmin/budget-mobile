import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, usePathname, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBudget } from '@/hooks/useBudget';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/ErrorScreen';

const TABS = [
  { key: 'overview',  label: 'Vue d\'ensemble', emoji: '📊' },
  { key: 'members',   label: 'Membres',          emoji: '👥' },
  { key: 'charges',   label: 'Charges',          emoji: '💳' },
  { key: 'projects',  label: 'Projets',           emoji: '🎯' },
  { key: 'calendar',  label: 'Calendrier',        emoji: '📅' },
  { key: 'reality',   label: 'Réalité',           emoji: '🔍' },
] as const;

export default function BudgetLayout({ children }: { children: React.ReactNode }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const { data: budget, isLoading, isError, refetch } = useBudget(id!);

  if (isLoading) return <LoadingScreen message="Chargement du budget…" />;
  if (isError || !budget) return <ErrorScreen onRetry={refetch} />;

  const activeTab = TABS.find((t) => pathname.endsWith(t.key))?.key ?? 'overview';

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Budget header */}
      <View className="border-b border-border bg-white px-5 pb-3 pt-4">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Text className="text-xl text-slate-600">←</Text>
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-900" numberOfLines={1}>
              {budget.name}
            </Text>
            <Text className="text-xs text-slate-400">
              {budget.members.length} membre{budget.members.length > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Tab bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3 -mx-5"
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => router.push(`/budget/${id}/${tab.key}` as any)}
                className={`flex-row items-center gap-1.5 rounded-xl px-3 py-2 ${
                  isActive ? 'bg-primary-600' : 'bg-slate-100'
                }`}
              >
                <Text style={{ fontSize: 14 }}>{tab.emoji}</Text>
                <Text
                  className={`text-xs font-semibold ${
                    isActive ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tab content */}
      {children}
    </SafeAreaView>
  );
}
