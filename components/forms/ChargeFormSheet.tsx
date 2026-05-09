import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { CategoryPicker } from '@/components/ui/CategoryPicker';
import type { Charge, ChargeCategory, RecurrenceType } from '@/types';

const schema = z.object({
  label:      z.string().min(1),
  amount:     z.coerce.number().positive(),
  category:   z.string().min(1),
  recurrence: z.enum(['monthly', 'yearly', 'one-time']).default('monthly'),
});
type FormData = z.infer<typeof schema>;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (charge: Omit<Charge, 'id'>) => Promise<void>;
  onDelete?: () => Promise<void>;
  initial?: Charge;
}

export function ChargeFormSheet({ visible, onClose, onSubmit, onDelete, initial }: Props) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    reset({
      label:      initial?.label      ?? '',
      amount:     initial?.amount     ?? 0,
      category:   String(initial?.category ?? 'other'),
      recurrence: (initial?.recurrence ?? 'monthly') as RecurrenceType,
    });
  }, [initial, reset, visible]);

  const handle = async (data: FormData) => {
    await onSubmit({
      label:      data.label,
      amount:     data.amount,
      category:   data.category as ChargeCategory,
      recurrence: data.recurrence,
    });
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={initial ? t('common.edit') : t('budget.charges.addCharge')}
    >
      <Controller control={control} name="label"
        render={({ field: { onChange, value, onBlur } }) => (
          <Input label={t('budget.charges.label')} placeholder="Loyer"
            value={value} onChangeText={onChange} onBlur={onBlur}
            error={errors.label?.message} autoFocus />
        )} />

      <Controller control={control} name="amount"
        render={({ field: { onChange, value, onBlur } }) => (
          <Input label={t('budget.charges.amount')} placeholder="0"
            keyboardType="decimal-pad"
            value={String(value ?? '')}
            onChangeText={(v) => onChange(v.replace(',', '.'))}
            onBlur={onBlur}
            error={errors.amount?.message} />
        )} />

      <Controller control={control} name="category"
        render={({ field: { onChange, value } }) => (
          <CategoryPicker
            label={t('budget.charges.category')}
            value={value}
            onChange={onChange as (c: ChargeCategory) => void}
          />
        )} />

      <Controller control={control} name="recurrence"
        render={({ field: { onChange, value } }) => (
          <View className="mb-4">
            <Text className="mb-2 text-sm text-foreground font-medium">Recurrence</Text>
            <View className="flex-row gap-2">
              {(['monthly', 'yearly', 'one-time'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => onChange(r)}
                  className={`flex-1 rounded-xl border py-2 ${
                    value === r ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  }`}
                >
                  <Text className={`text-center text-xs font-display-semibold ${
                    value === r ? 'text-primary' : 'text-muted-fg'
                  }`}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )} />

      <Button onPress={handleSubmit(handle)} loading={isSubmitting} size="lg">
        {t('common.save')}
      </Button>

      {onDelete && initial ? (
        <Button variant="danger" className="mt-3"
          onPress={async () => { await onDelete(); onClose(); }}>
          {t('common.delete')}
        </Button>
      ) : null}
    </BottomSheet>
  );
}
