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
import type { CalendarEntry, ChargeCategory } from '@/types';

const schema = z.object({
  label:    z.string().min(1),
  amount:   z.coerce.number().positive(),
  date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  type:     z.enum(['income', 'expense']),
  category: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (entry: Omit<CalendarEntry, 'id'>) => Promise<void>;
  onDelete?: () => Promise<void>;
  initial?: CalendarEntry;
  defaultDate?: string;
}

export function CalendarEntryFormSheet({
  visible, onClose, onSubmit, onDelete, initial, defaultDate,
}: Props) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    reset({
      label:    initial?.label    ?? '',
      amount:   initial?.amount   ?? 0,
      date:     initial?.date     ?? (defaultDate ?? new Date().toISOString().slice(0, 10)),
      type:     initial?.type     ?? 'expense',
      category: String(initial?.category ?? 'other'),
    });
  }, [initial, reset, visible, defaultDate]);

  const type = watch('type');

  const handle = async (data: FormData) => {
    await onSubmit({
      label:    data.label,
      amount:   data.amount,
      date:     data.date,
      type:     data.type,
      category: (data.category ?? 'other') as ChargeCategory,
    });
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={initial ? t('common.edit') : t('budget.calendar.addEntry')}
    >
      <Controller control={control} name="type"
        render={({ field: { onChange, value } }) => (
          <View className="mb-4 flex-row gap-2">
            {(['expense', 'income'] as const).map((tt) => (
              <TouchableOpacity
                key={tt}
                onPress={() => onChange(tt)}
                className={`flex-1 rounded-xl border py-3 ${
                  value === tt
                    ? tt === 'income'
                      ? 'border-success bg-success/10'
                      : 'border-danger bg-danger/10'
                    : 'border-border bg-card'
                }`}
              >
                <Text className="text-center text-sm font-display-semibold text-foreground">
                  {t(`budget.overview.${tt === 'income' ? 'income' : 'expenses'}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )} />

      <Controller control={control} name="label"
        render={({ field: { onChange, value, onBlur } }) => (
          <Input label={t('budget.charges.label')}
            value={value} onChangeText={onChange} onBlur={onBlur}
            error={errors.label?.message} autoFocus />
        )} />

      <Controller control={control} name="amount"
        render={({ field: { onChange, value, onBlur } }) => (
          <Input label={t('budget.charges.amount')}
            keyboardType="decimal-pad"
            value={String(value ?? '')}
            onChangeText={(v) => onChange(v.replace(',', '.'))}
            onBlur={onBlur}
            error={errors.amount?.message} />
        )} />

      <Controller control={control} name="date"
        render={({ field: { onChange, value, onBlur } }) => (
          <Input label="YYYY-MM-DD" placeholder="2026-05-09"
            value={value} onChangeText={onChange} onBlur={onBlur}
            error={errors.date?.message} />
        )} />

      {type === 'expense' ? (
        <Controller control={control} name="category"
          render={({ field: { onChange, value } }) => (
            <CategoryPicker
              label={t('budget.charges.category')}
              value={value}
              onChange={onChange as (c: ChargeCategory) => void}
            />
          )} />
      ) : null}

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
