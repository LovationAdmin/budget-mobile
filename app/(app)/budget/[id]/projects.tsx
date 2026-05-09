import React, { useState } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Target, Plus } from 'lucide-react-native';

import { useBudget, useBudgetData } from '@/hooks/useBudget';
import { useBudgetMutations } from '@/hooks/useBudgetMutations';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/ErrorScreen';
import { Card } from '@/components/ui/Card';
import { ProjectFormSheet } from '@/components/forms/ProjectFormSheet';
import { palette } from '@/constants/colors';
import type { Project } from '@/types';

function formatMoney(n: number, currency = 'EUR') {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n); }
  catch { return `${n.toFixed(2)} ${currency}`; }
}

function ProjectCard({
  project, currency, onPress,
}: { project: Project; currency: string; onPress: () => void }) {
  const { t } = useTranslation();
  const target = project.target_amount || 1;
  const progress = Math.min((project.current_amount ?? 0) / target, 1);
  const pct = Math.round(progress * 100);
  const color = project.color ?? palette.warm;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
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
    </TouchableOpacity>
  );
}

export default function ProjectsTab() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const budget = useBudget(id!);
  const env    = useBudgetData(id!);
  const m      = useBudgetMutations(id!);
  const [editing, setEditing] = useState<Project | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

  if (env.isLoading) return <LoadingScreen />;
  if (env.isError || !env.data) return <ErrorScreen onRetry={env.refetch} />;

  const projects = (env.data.data?.projects ?? []) as Project[];
  const currency = budget.data?.currency ?? 'EUR';
  const totalSaved  = projects.reduce((a, p) => a + (p.current_amount ?? 0), 0);
  const totalTarget = projects.reduce((a, p) => a + (p.target_amount   ?? 0), 0);

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            currency={currency}
            onPress={() => { setEditing(item); setShowForm(true); }}
          />
        )}
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

      <TouchableOpacity
        onPress={() => { setEditing(undefined); setShowForm(true); }}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-warm-500"
        style={{ shadowColor: '#F97316', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
      >
        <Plus size={24} color="#FFF" />
      </TouchableOpacity>

      <ProjectFormSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        initial={editing}
        onSubmit={async (p) => {
          if (editing) await m.updateProject(editing.id, p);
          else         await m.addProject(p);
        }}
        onDelete={editing ? () => m.removeProject(editing.id) : undefined}
      />
    </View>
  );
}
