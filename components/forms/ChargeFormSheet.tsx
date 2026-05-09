import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react-native';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { CategoryPicker } from '@/components/ui/CategoryPicker';
import { SuggestionsService } from '@/services/suggestions.service';
import { palette } from '@/constants/colors';
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
  const [autoCategorizing, setAutoCategorizing] = useState(false);
  const [autoSuggested, setAutoSuggested] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userTouchedCategoryRef = useRef(false);

  const { control, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    reset({
      label:      initial?.label      ?? '',
      amount:     initial?.amount     ?? 0,
      category:   String(initial?.category ?? 'other'),
      recurrence: (initial?.recurrence ?? 'monthly') as RecurrenceType,
    });
    userTouchedCategoryRef.current = !!initial; // editing → don't auto-replace
    setAutoSuggested(null);
  }, [initial, reset, visible]);

  // Auto-categorize as the user types the label.
  const label = watch('label');
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!label || label.length < 3) return;
    if (userTouchedCategoryRef.current) return;

    debounceRef.current = setTimeout(async () => {
      setAutoCategorizing(true);
      const cat = await SuggestionsService.categorize(label);
      setAutoCategorizing(false);
      if (cat && !userTouchedCategoryRef.current) {
        setValue('category', String(cat));
        setAutoSuggested(String(cat));
      }
    }, 600);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [label, setValue]);

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
      title={initial ? t('budget.charges.editCharge') : t('budget.charges.addCharge')}
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
          <View>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-sm text-foreground font-medium">
                {t('budget.charges.category')}
              </Text>
              {autoCategorizing ? (
                <View className="flex-row items-center gap-1">
                  <ActivityIndicator size="small" color={palette.primary} />
                  <Text className="text-xs text-muted-fg font-sans">AI…</Text>
                </View>
              ) : autoSuggested && value === autoSuggested ? (
                <View className="flex-row items-center gap-1">
                  <Sparkles size={12} color={palette.primary} />
                  <Text className="text-xs text-primary font-medium">AI</Text>
                </View>
              ) : null}
            </View>
            <CategoryPicker
              value={value}
              onChange={(c) => {
                userTouchedCategoryRef.current = true;
                onChange(c as ChargeCategory);
              }}
            />
          </View>
        )} />

      <Controller control={control} name="recurrence"
        render={({ field: { onChange, value } }) => (
          <View className="mb-4">
            <Text className="mb-2 text-sm text-foreground font-medium">
              {t('budget.charges.recurrence')}
            </Text>
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
                  }`}>
                    {t(`budget.charges.${r === 'one-time' ? 'oneTime' : r}`)}
                  </Text>
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
