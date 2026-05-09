import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/Card';
import type { Budget } from '@/types';

function formatCurrency(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
}

interface BudgetCardProps {
  budget: Budget;
}

export function BudgetCard({ budget }: BudgetCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push(`/budget/${budget.id}/overview`)}
      className="mb-3"
    >
      <Card>
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-900">{budget.name}</Text>
            {budget.description && (
              <Text className="mt-0.5 text-sm text-slate-500" numberOfLines={1}>
                {budget.description}
              </Text>
            )}
          </View>
          <View className="ml-3 rounded-full bg-primary-50 px-3 py-1">
            <Text className="text-xs font-semibold text-primary-600">
              {budget.role === 'owner' ? 'Proprio' : budget.role}
            </Text>
          </View>
        </View>

        <View className="mt-3 flex-row items-center gap-3">
          {budget.members.slice(0, 5).map((m) => (
            <View
              key={m.id}
              className="h-8 w-8 items-center justify-center rounded-full bg-primary-100"
            >
              <Text className="text-xs font-bold text-primary-700">
                {m.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          ))}
          {budget.members.length > 5 && (
            <Text className="text-xs text-slate-400">+{budget.members.length - 5}</Text>
          )}
        </View>

        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-xs text-slate-400">
            {budget.members.length} membre{budget.members.length > 1 ? 's' : ''}
          </Text>
          <Text className="text-xs text-slate-400">
            {new Date(budget.created_at).toLocaleDateString('fr-FR')}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}
