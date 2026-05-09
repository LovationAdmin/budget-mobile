import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import type { Budget } from '@/types';

export function BudgetCard({ budget }: { budget: Budget }) {
  const router = useRouter();
  const { t } = useTranslation();

  const memberCount = budget.members?.length ?? 0;
  const created = new Date(budget.created_at).toLocaleDateString();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/budget/${budget.id}/overview`)}
      className="mb-3"
    >
      <Card>
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-lg text-foreground font-display-bold">{budget.name}</Text>
            <Text className="mt-0.5 text-sm text-muted-fg font-sans" numberOfLines={1}>
              {budget.location} · {budget.currency}
            </Text>
          </View>
          {budget.is_owner ? (
            <View className="ml-3 rounded-full bg-warm-100 px-3 py-1">
              <Text className="text-xs text-warm-700 font-display-semibold">
                {t('budget.members.owner')}
              </Text>
            </View>
          ) : null}
        </View>

        {memberCount > 0 ? (
          <View className="mt-3 flex-row items-center gap-2">
            {budget.members.slice(0, 5).map((m) => (
              <View
                key={m.id}
                className="h-8 w-8 items-center justify-center rounded-full bg-primary-100"
              >
                <Text className="text-xs text-primary-700 font-display-bold">
                  {(m.user_name ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            ))}
            {memberCount > 5 ? (
              <Text className="text-xs text-muted-fg font-sans">+{memberCount - 5}</Text>
            ) : null}
          </View>
        ) : null}

        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-xs text-muted-fg font-sans">
            {memberCount} {t('budget.members.title').toLowerCase()}
          </Text>
          <Text className="text-xs text-muted-fg font-sans">{created}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}
