import React from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Target } from 'lucide-react-native';

import { useBudget, useBudgetData } from '@/hooks/useBudget';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/ErrorScreen';
import { Card } from '@/components/ui/Card';
import { palette } from '@/constants/colors';
import type { Project } from '@/types';

function formatMoney(n: number, currency = 'EUR') {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n); }
  catch { return `${n.toFixed(2)} ${currency}`; }
}

function ProjectCard({ project, currency }: { project: Project; currency: string }) {
  const { t } = useTranslation();
  const target = project.target_amount || 1;
  const progress = Math.min((project.current_amount ?? 0) / target, 1);
  const pct = Math.round(progress * 100);
  const color = project.color ?? palette.warm;

  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-foreground font-display-bold">{project.name}</Text>
          {project.deadline ? (
            <Text className="mt-0.5 text-xs text-muted-fg font-sans">
              {new Date(project.deadline).toLocaleDateString()}
            </Text>
          ) : null}
        </View>
        <Text className="ml-3 text-sm font-display-bold" style={{ color }}>{pct}%</Text>
      </View>

      <View className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
        <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </View>

      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-sm text-muted-fg font-sans">
          {t('budget.projects.saved')}: {formatMoney(project.current_amount ?? 0, currency)}
        </Text>
        <Text className="text-sm text-foreground font-display-semibold">
          / {formatMoney(project.target_amount, currency)}
        </Text>
      </View>
    </Card>
  );
}

export default function ProjectsTab() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const budget = useBudget(id!);
  const env = useBudgetData(id!);

  if (env.isLoading) return <LoadingScreen />;
  if (env.isError || !env.data) return <ErrorScreen onRetry={env.refetch} />;

  const projects = (env.data.data?.projects ?? []) as Project[];
  const currency = budget.data?.currency ?? 'EUR';
  const totalSaved  = projects.reduce((a, p) => a + (p.current_amount ?? 0), 0);
  const totalTarget = projects.reduce((a, p) => a + (p.target_amount   ?? 0), 0);

  return (
    <FlatList
      data={projects}
      keyExtractor={(p) => p.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      renderItem={({ item }) => <ProjectCard project={item} currency={currency} />}
      refreshControl={
        <RefreshControl refreshing={env.isRefetching} onRefresh={env.refetch} tintColor={palette.primary} />
      }
      ListHeaderComponent={
        <View className="mb-4">
          <Text className="text-base text-foreground font-display-semibold">
            {projects.length} {t('budget.projects.title').toLowerCase()}
          </Text>
          {projects.length > 0 ? (
            <Card className="mt-3" padding="sm">
              <Text className="text-xs text-muted-fg font-sans">{t('budget.projects.saved')}</Text>
              <Text className="mt-0.5 text-xl text-success font-display-extra">
                {formatMoney(totalSaved, currency)}
              </Text>
              <Text className="text-xs text-muted-fg font-sans">
                / {formatMoney(totalTarget, currency)}
              </Text>
            </Card>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <Card className="items-center py-10">
          <Target size={32} color={palette.light.mutedFg} />
          <Text className="mt-3 text-sm text-muted-fg font-sans">{t('common.empty')}</Text>
        </Card>
      }
    />
  );
}
