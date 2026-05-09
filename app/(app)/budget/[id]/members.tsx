import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X, Plus, Mail, Clock } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { useBudget } from '@/hooks/useBudget';
import { BudgetService } from '@/services/budget.service';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/ErrorScreen';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { QUERY_KEYS } from '@/constants/api';
import { palette } from '@/constants/colors';
import type { BudgetMember, Invitation } from '@/types';

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

function InvitationRow({ inv, onCancel }: { inv: Invitation; onCancel: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Mail size={18} color={palette.light.mutedFg} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-foreground font-display-semibold">{inv.email}</Text>
        <View className="flex-row items-center gap-1">
          <Clock size={11} color={palette.warning} />
          <Text className="text-xs text-warning font-sans">{t('budget.members.pending')}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onCancel} className="p-1">
        <X size={18} color={palette.danger} />
      </TouchableOpacity>
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

  const invitations = useQuery({
    queryKey: ['budgets', id, 'invitations'] as const,
    queryFn: () => BudgetService.listInvitations(id!) as Promise<Invitation[]>,
    enabled: !!id && !!budget?.is_owner,
  });

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<InviteForm>({ resolver: zodResolver(inviteSchema) });

  const removeMutation = useMutation({
    mutationFn: ({ memberId }: { memberId: string }) =>
      BudgetService.removeMember(id!, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.BUDGET(id!) }),
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: ({ invId }: { invId: string }) => BudgetService.cancelInvitation(id!, invId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets', id, 'invitations'] }),
  });

  if (isLoading) return <LoadingScreen />;
  if (isError || !budget) return <ErrorScreen onRetry={refetch} />;

  const onInvite = async (data: InviteForm) => {
    setInviteError(null);
    try {
      await BudgetService.invite(id!, data.email);
      reset();
      setShowInvite(false);
      qc.invalidateQueries({ queryKey: ['budgets', id, 'invitations'] });
      Toast.show({ type: 'success', text1: t('budget.members.inviteSent') });
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
          text: t('budget.members.remove'),
          style: 'destructive',
          onPress: () => removeMutation.mutate({ memberId: member.id }),
        },
      ],
    );
  };

  type Row =
    | { kind: 'header'; key: string; title: string }
    | { kind: 'member'; key: string; member: BudgetMember }
    | { kind: 'invitation'; key: string; inv: Invitation }
    | { kind: 'spacer'; key: string };

  const rows: Row[] = [
    { kind: 'header', key: 'h-members', title: t('budget.members.title') },
    ...budget.members.map<Row>((m) => ({ kind: 'member', key: `m-${m.id}`, member: m })),
  ];
  if (budget.is_owner && (invitations.data?.length ?? 0) > 0) {
    rows.push({ kind: 'spacer', key: 'spacer' });
    rows.push({ kind: 'header', key: 'h-pending', title: t('budget.members.pending') });
    for (const inv of invitations.data!) rows.push({ kind: 'invitation', key: `i-${inv.id}`, inv });
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return (
              <Text className="mb-2 mt-2 text-xs uppercase text-muted-fg font-display-semibold">
                {item.title}
              </Text>
            );
          }
          if (item.kind === 'spacer') return <View className="h-2" />;
          if (item.kind === 'invitation') {
            return (
              <Card className="mb-2" padding="sm">
                <InvitationRow
                  inv={item.inv}
                  onCancel={() => cancelInvitationMutation.mutate({ invId: item.inv.id })}
                />
              </Card>
            );
          }
          return (
            <Card className="mb-2" padding="sm">
              <MemberRow
                member={item.member}
                canRemove={item.member.role !== 'owner' && budget.is_owner}
                onRemove={() => handleRemove(item.member)}
              />
            </Card>
          );
        }}
      />

      {budget.is_owner ? (
        <TouchableOpacity
          onPress={() => setShowInvite(true)}
          className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-warm-500"
          style={{ shadowColor: '#F97316', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
        >
          <Plus size={24} color="#FFF" />
        </TouchableOpacity>
      ) : null}

      <BottomSheet
        visible={showInvite}
        onClose={() => { setShowInvite(false); reset(); }}
        title={t('budget.members.invite')}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
        </KeyboardAvoidingView>
      </BottomSheet>
    </View>
  );
}
