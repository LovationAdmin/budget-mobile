import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, usePathname, Stack, Slot } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  PieChart as PieIcon, Users, CreditCard, Target, CalendarDays, TrendingUp, ChevronLeft,
} from 'lucide-react-native';

import { useBudget } from '@/hooks/useBudget';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/ErrorScreen';
import { palette } from '@/constants/colors';

const TABS = [
  { key: 'overview', tKey: 'budget.tabs.overview', Icon: PieIcon },
  { key: 'members',  tKey: 'budget.tabs.members',  Icon: Users },
  { key: 'charges',  tKey: 'budget.tabs.charges',  Icon: CreditCard },
  { key: 'projects', tKey: 'budget.tabs.projects', Icon: Target },
  { key: 'calendar', tKey: 'budget.tabs.calendar', Icon: CalendarDays },
  { key: 'reality',  tKey: 'budget.tabs.reality',  Icon: TrendingUp },
] as const;

export default function BudgetLayout() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const { data: budget, isLoading, isError, refetch } = useBudget(id!);

  if (isLoading) return <LoadingScreen message={t('common.loading')} />;
  if (isError || !budget) return <ErrorScreen onRetry={refetch} />;

  const activeTab = TABS.find((tab) => pathname.endsWith(tab.key))?.key ?? 'overview';

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="border-b border-border bg-card px-5 pb-3 pt-4">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <ChevronLeft size={24} color={palette.light.foreground} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg text-foreground font-display-bold" numberOfLines={1}>
              {budget.name}
            </Text>
            <Text className="text-xs text-muted-fg font-sans">
              {budget.members.length} {t('budget.members.title').toLowerCase()} · {budget.currency}
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          className="mt-3 -mx-5"
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {TABS.map(({ key, tKey, Icon }) => {
            const isActive = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => router.push(`/budget/${id}/${key}` as `/budget/${string}/overview`)}
                className={`flex-row items-center gap-1.5 rounded-xl px-3 py-2 ${
                  isActive ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <Icon size={14} color={isActive ? '#FFF' : palette.light.mutedFg} />
                <Text
                  className={`text-xs font-display-semibold ${
                    isActive ? 'text-white' : 'text-muted-fg'
                  }`}
                >
                  {t(tKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <Slot />
    </SafeAreaView>
  );
}
