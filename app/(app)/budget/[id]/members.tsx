import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X, Plus } from 'lucide-react-native';

import { useBudget } from '@/hooks/useBudget';
import { BudgetService } from '@/services/budget.service';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/ErrorScreen';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { QUERY_KEYS } from '@/constants/api';
import { palette } from '@/constants/colors';
import type { BudgetMember } from '@/types';

const inviteSchema = z.object({ email: z.string().email() });
type InviteForm = z.infer<typeof inviteSchema>;

function MemberRow({ member, onRemove, canRemove }: {
  member: BudgetMember;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-warm-100">
        <Text className="font-display-bold text-warm-700">
          {(member.user_name ?? '?').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-foreground font-display-semibold">{member.user_name}</Text>
        <Text className="text-xs text-muted-fg font-sans">{member.user_email}</Text>
      </View>
      <Text className="mr-2 text-xs text-muted-fg font-sans">
        {member.role === 'owner' ? t('budget.members.owner') : member.role}
      </Text>
      {canRemove ? (
        <TouchableOpacity onPress={onRemove} className="p-1">
          <X size={18} color={palette.danger} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function MembersTab() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: budget, isLoading, isError, refetch } = useBudget(id!);
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<InviteForm>({ resolver: zodResolver(inviteSchema) });

  const removeMutation = useMutation({
    mutationFn: ({ memberId }: { memberId: string }) =>
      BudgetService.removeMember(id!, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.BUDGET(id!) }),
  });

  if (isLoading) return <LoadingScreen />;
  if (isError || !budget) return <ErrorScreen onRetry={refetch} />;

  const onInvite = async (data: InviteForm) => {
    setInviteError(null);
    try {
      await BudgetService.invite(id!, data.email);
      reset(); setShowInvite(false);
    } catch (e: unknown) {
      const apiErr = (e as { response?: { data?: { error?: string } } }).response?.data;
      setInviteError(apiErr?.error ?? t('errors.validation'));
    }
  };

  const handleRemove = (member: BudgetMember) => {
    Alert.alert(
      t('budget.members.removeConfirm'),
      member.user_name,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('budget.members.remove'), style: 'destructive',
          onPress: () => removeMutation.mutate({ memberId: member.id }),
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={budget.members}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item }) => (
          <Card padding="sm">
            <MemberRow
              member={item}
              canRemove={item.role !== 'owner' && budget.is_owner}
              onRemove={() => handleRemove(item)}
            />
          </Card>
        )}
        ListHeaderComponent={
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-base text-foreground font-display-semibold">
              {budget.members.length} {t('budget.members.title').toLowerCase()}
            </Text>
            {budget.is_owner ? (
              <TouchableOpacity
                onPress={() => setShowInvite(true)}
                className="flex-row items-center rounded-xl bg-warm-500 px-3 py-2"
              >
                <Plus size={16} color="#FFF" />
                <Text className="ml-1 text-sm text-white font-display-semibold">
                  {t('budget.members.invite')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />

      <Modal visible={showInvite} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="rounded-t-3xl bg-card px-5 pb-10 pt-6">
              <View className="mb-5 flex-row items-center justify-between">
                <Text className="text-xl text-foreground font-display-bold">
                  {t('budget.members.invite')}
                </Text>
                <TouchableOpacity onPress={() => { setShowInvite(false); reset(); }}>
                  <X size={22} color={palette.light.mutedFg} />
                </TouchableOpacity>
              </View>

              <Controller control={control} name="email"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input label={t('auth.email')} placeholder="ami@exemple.com"
                    keyboardType="email-address"
                    value={value} onChangeText={onChange} onBlur={onBlur}
                    error={errors.email?.message} autoFocus />
                )} />

              {inviteError ? (
                <Text className="mb-3 text-sm text-danger font-sans">{inviteError}</Text>
              ) : null}

              <Button onPress={handleSubmit(onInvite)} loading={isSubmitting} size="lg">
                {t('budget.members.invite')}
              </Button>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
