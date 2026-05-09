import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useBudget } from '@/hooks/useBudget';
import { BudgetService } from '@/services/budget.service';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/ErrorScreen';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { QUERY_KEYS } from '@/constants/api';
import type { BudgetMember } from '@/types';

const inviteSchema = z.object({
  email: z.string().email('Email invalide'),
  role:  z.enum(['admin', 'member', 'viewer']),
});
type InviteForm = z.infer<typeof inviteSchema>;

const ROLE_LABELS: Record<string, string> = {
  owner:  '👑 Propriétaire',
  admin:  '🛡 Admin',
  member: '👤 Membre',
  viewer: '👁 Lecteur',
};

function MemberRow({ member, onRemove, canRemove }: {
  member: BudgetMember;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <View className="mb-2 flex-row items-center">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-100">
        <Text className="font-bold text-primary-700">
          {member.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-semibold text-slate-900">{member.name}</Text>
        <Text className="text-xs text-slate-400">{member.email}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Text className="text-xs text-slate-500">{ROLE_LABELS[member.role] ?? member.role}</Text>
        {canRemove && (
          <TouchableOpacity onPress={onRemove} className="ml-1 p-1">
            <Text className="text-danger text-lg">×</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function MembersTab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: budget, isLoading, isError, refetch } = useBudget(id!);
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<InviteForm>({
      resolver: zodResolver(inviteSchema),
      defaultValues: { role: 'member' },
    });

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
      await BudgetService.invite(id!, data.email, data.role);
      reset();
      setShowInvite(false);
    } catch (e: any) {
      setInviteError(e?.response?.data?.message ?? 'Erreur lors de l\'invitation.');
    }
  };

  const handleRemove = (member: BudgetMember) => {
    Alert.alert(
      'Retirer le membre',
      `Voulez-vous retirer ${member.name} du budget ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: () => removeMutation.mutate({ memberId: member.user_id }),
        },
      ],
    );
  };

  return (
    <View className="flex-1">
      <FlatList
        data={budget.members}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item }) => (
          <Card padding="sm">
            <MemberRow
              member={item}
              canRemove={item.role !== 'owner'}
              onRemove={() => handleRemove(item)}
            />
          </Card>
        )}
        ListHeaderComponent={
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-base font-bold text-slate-800">
              {budget.members.length} membre{budget.members.length > 1 ? 's' : ''}
            </Text>
            <Button size="sm" onPress={() => setShowInvite(true)}>
              + Inviter
            </Button>
          </View>
        }
      />

      {/* Invite modal */}
      <Modal visible={showInvite} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="rounded-t-3xl bg-white px-5 pb-10 pt-6">
              <View className="mb-5 flex-row items-center justify-between">
                <Text className="text-xl font-bold text-slate-900">Inviter un membre</Text>
                <TouchableOpacity onPress={() => { setShowInvite(false); reset(); }}>
                  <Text className="text-2xl text-slate-400">×</Text>
                </TouchableOpacity>
              </View>

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="Email"
                    placeholder="ami@exemple.com"
                    keyboardType="email-address"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    autoFocus
                  />
                )}
              />

              <Text className="mb-2 text-sm font-medium text-slate-700">Rôle</Text>
              <Controller
                control={control}
                name="role"
                render={({ field: { onChange, value } }) => (
                  <View className="mb-4 flex-row gap-2">
                    {(['member', 'viewer', 'admin'] as const).map((r) => (
                      <TouchableOpacity
                        key={r}
                        onPress={() => onChange(r)}
                        className={`flex-1 rounded-xl border py-2 items-center ${
                          value === r ? 'border-primary-600 bg-primary-50' : 'border-border bg-white'
                        }`}
                      >
                        <Text className={`text-xs font-semibold ${
                          value === r ? 'text-primary-600' : 'text-slate-500'
                        }`}>
                          {ROLE_LABELS[r]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />

              {inviteError && (
                <Text className="mb-3 text-sm text-danger">{inviteError}</Text>
              )}

              <Button onPress={handleSubmit(onInvite)} loading={isSubmitting} size="lg">
                Envoyer l'invitation
              </Button>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
