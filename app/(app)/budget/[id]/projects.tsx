import React from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useBudgetData } from '@/hooks/useBudget';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/ErrorScreen';
import { Card } from '@/components/ui/Card';
import type { Project } from '@/types';

function formatEur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

function ProjectCard({ project }: { project: Project }) {
  const progress = Math.min(project.current_amount / project.target_amount, 1);
  const pct = Math.round(progress * 100);
  const color = project.color ?? '#6366f1';

  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="font-bold text-slate-900">
            {project.icon ?? '🎯'} {project.name}
          </Text>
          {project.deadline && (
            <Text className="mt-0.5 text-xs text-slate-400">
              Échéance : {new Date(project.deadline).toLocaleDateString('fr-FR')}
            </Text>
          )}
        </View>
        <Text className="ml-3 text-sm font-bold" style={{ color }}>
          {pct}%
        </Text>
      </View>

      {/* Progress bar */}
      <View className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <View
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </View>

      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-sm text-slate-500">
          {formatEur(project.current_amount)} épargné
        </Text>
        <Text className="text-sm font-semibold text-slate-700">
          / {formatEur(project.target_amount)}
        </Text>
      </View>

      {progress >= 1 && (
        <View className="mt-2 rounded-xl bg-green-50 px-3 py-1.5">
          <Text className="text-sm font-semibold text-green-700">🎉 Objectif atteint !</Text>
        </View>
      )}
    </Card>
  );
}

export default function ProjectsTab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch, isRefetching } = useBudgetData(id!);

  if (isLoading) return <LoadingScreen />;
  if (isError || !data) return <ErrorScreen onRetry={refetch} />;

  const totalSaved  = data.projects.reduce((a, p) => a + p.current_amount, 0);
  const totalTarget = data.projects.reduce((a, p) => a + p.target_amount, 0);

  return (
    <FlatList
      data={data.projects}
      keyExtractor={(p) => p.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      renderItem={({ item }) => <ProjectCard project={item} />}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />}
      ListHeaderComponent={
        <View className="mb-4">
          <Text className="text-base font-bold text-slate-800">
            {data.projects.length} projet{data.projects.length > 1 ? 's' : ''}
          </Text>
          {data.projects.length > 0 && (
            <Card className="mt-3" padding="sm">
              <Text className="text-xs text-slate-500">Total épargné</Text>
              <Text className="mt-0.5 text-xl font-extrabold text-success">
                {formatEur(totalSaved)}
              </Text>
              <Text className="text-xs text-slate-400">sur {formatEur(totalTarget)} visés</Text>
            </Card>
          )}
        </View>
      }
      ListEmptyComponent={
        <Card className="items-center py-10">
          <Text className="text-3xl">🎯</Text>
          <Text className="mt-3 text-sm text-slate-400">Aucun projet d'épargne</Text>
        </Card>
      }
    />
  );
}
