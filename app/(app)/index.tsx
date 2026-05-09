import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAuth } from '@/contexts/AuthContext';
import { useBudgets, useCreateBudget } from '@/hooks/useBudgets';
import { BudgetCard } from '@/components/BudgetCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/ErrorScreen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

const createSchema = z.object({
  name:        z.string().min(2, '2 caractères minimum'),
  description: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

export default function DashboardScreen() {
  const { user } = useAuth();
  const { data: budgets, isLoading, isError, refetch, isRefetching } = useBudgets();
  const createMutation = useCreateBudget();
  const [showCreate, setShowCreate] = useState(false);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<CreateForm>({ resolver: zodResolver(createSchema) });

  const onCreate = async (data: CreateForm) => {
    await createMutation.mutateAsync({ ...data, currency: 'EUR' });
    reset();
    setShowCreate(false);
  };

  if (isLoading) return <LoadingScreen message="Chargement de vos budgets…" />;
  if (isError) return <ErrorScreen onRetry={refetch} />;

  const firstName = user?.name?.split(' ')[0] ?? 'vous';

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* Header */}
      <View className="px-5 pb-4 pt-6">
        <Text className="text-sm font-medium text-slate-500">Bonjour,</Text>
        <Text className="text-2xl font-bold text-slate-900">{firstName} 👋</Text>
      </View>

      {/* Budget list */}
      <FlatList
        data={budgets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        renderItem={({ item }) => <BudgetCard budget={item} />}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />
        }
        ListEmptyComponent={
          <Card className="items-center py-10">
            <Text className="text-4xl">📊</Text>
            <Text className="mt-3 text-base font-semibold text-slate-700">
              Aucun budget pour l'instant
            </Text>
            <Text className="mt-1 text-center text-sm text-slate-400">
              Créez votre premier budget familial
            </Text>
          </Card>
        }
        ListHeaderComponent={
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-slate-800">
              Mes budgets ({budgets?.length ?? 0})
            </Text>
            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              className="flex-row items-center rounded-xl bg-primary-600 px-4 py-2"
            >
              <Text className="text-sm font-semibold text-white">+ Nouveau</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Create budget modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="rounded-t-3xl bg-white px-5 pb-10 pt-6">
              <View className="mb-5 flex-row items-center justify-between">
                <Text className="text-xl font-bold text-slate-900">Nouveau budget</Text>
                <TouchableOpacity onPress={() => { setShowCreate(false); reset(); }}>
                  <Text className="text-2xl text-slate-400">×</Text>
                </TouchableOpacity>
              </View>

              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="Nom du budget"
                    placeholder="Budget Famille 2025"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.name?.message}
                    autoFocus
                  />
                )}
              />
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="Description (optionnel)"
                    placeholder="Budget mensuel du foyer"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                )}
              />
              <Button onPress={handleSubmit(onCreate)} loading={isSubmitting} size="lg">
                Créer le budget
              </Button>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
