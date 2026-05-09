import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, RefreshControl,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react-native';

import { useAuth } from '@/contexts/AuthContext';
import { useBudgets, useCreateBudget } from '@/hooks/useBudgets';
import { BudgetCard } from '@/components/BudgetCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/ErrorScreen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { palette } from '@/constants/colors';

const createSchema = z.object({
  name:     z.string().min(2),
  currency: z.string().length(3).optional(),
});
type CreateForm = z.infer<typeof createSchema>;

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: budgets, isLoading, isError, refetch, isRefetching } = useBudgets();
  const createMutation = useCreateBudget();
  const [showCreate, setShowCreate] = useState(false);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<CreateForm>({
      resolver: zodResolver(createSchema),
      defaultValues: { currency: 'EUR' },
    });

  const onCreate = async (data: CreateForm) => {
    await createMutation.mutateAsync({ name: data.name, currency: data.currency ?? 'EUR' });
    reset({ currency: 'EUR' });
    setShowCreate(false);
  };

  if (isLoading) return <LoadingScreen message={t('common.loading')} />;
  if (isError) return <ErrorScreen onRetry={refetch} />;

  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pb-4 pt-6">
        <Text className="text-sm text-muted-fg font-sans">{t('dashboard.greeting', { name: '' }).replace(/\{?\{?name\}?\}?/, '').trim()}</Text>
        <Text className="text-2xl text-foreground font-display-bold">{firstName}</Text>
      </View>

      <FlatList
        data={budgets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        renderItem={({ item }) => <BudgetCard budget={item} />}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.primary} />
        }
        ListEmptyComponent={
          <Card className="items-center py-10">
            <View className="mb-3 h-16 w-16 items-center justify-center rounded-2xl bg-warm-50">
              <Plus size={32} color={palette.warm} />
            </View>
            <Text className="text-base text-foreground font-display-semibold">
              {t('dashboard.empty')}
            </Text>
            <Button
              variant="warm"
              size="md"
              className="mt-4"
              onPress={() => setShowCreate(true)}
            >
              {t('dashboard.createFirst')}
            </Button>
          </Card>
        }
        ListHeaderComponent={
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg text-foreground font-display-semibold">
              {t('dashboard.yourBudgets')} ({budgets?.length ?? 0})
            </Text>
            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              className="flex-row items-center rounded-xl bg-warm-500 px-4 py-2"
            >
              <Plus size={16} color="#FFF" />
              <Text className="ml-1 text-sm text-white font-display-semibold">
                {t('dashboard.newBudget')}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal visible={showCreate} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="rounded-t-3xl bg-card px-5 pb-10 pt-6">
              <View className="mb-5 flex-row items-center justify-between">
                <Text className="text-xl text-foreground font-display-bold">
                  {t('dashboard.createBudget')}
                </Text>
                <TouchableOpacity onPress={() => { setShowCreate(false); reset(); }}>
                  <X size={24} color={palette.light.mutedFg} />
                </TouchableOpacity>
              </View>

              <Controller control={control} name="name"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input label={t('dashboard.budgetName')}
                    placeholder="Budget Famille 2025"
                    value={value} onChangeText={onChange} onBlur={onBlur}
                    error={errors.name?.message} autoFocus />
                )} />
              <Controller control={control} name="currency"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input label={t('dashboard.budgetCurrency')}
                    placeholder="EUR"
                    autoCapitalize="characters"
                    maxLength={3}
                    value={value} onChangeText={onChange} onBlur={onBlur}
                    error={errors.currency?.message} />
                )} />

              <Button onPress={handleSubmit(onCreate)} loading={isSubmitting} size="lg">
                {t('dashboard.createBudget')}
              </Button>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
