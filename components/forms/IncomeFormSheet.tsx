import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import type { IncomeSource } from '@/types';

const schema = z.object({
  label:  z.string().min(1),
  amount: z.coerce.number().positive(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (income: Omit<IncomeSource, 'id'>) => Promise<void>;
  onDelete?: () => Promise<void>;
  initial?: IncomeSource;
}

export function IncomeFormSheet({ visible, onClose, onSubmit, onDelete, initial }: Props) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    reset({
      label:  initial?.label  ?? '',
      amount: initial?.amount ?? 0,
    });
  }, [initial, reset, visible]);

  const handle = async (data: FormData) => {
    await onSubmit({ label: data.label, amount: data.amount });
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={initial ? t('common.edit') : t('budget.overview.income')}
    >
      <Controller control={control} name="label"
        render={({ field: { onChange, value, onBlur } }) => (
          <Input label={t('budget.charges.label')} placeholder="Salaire"
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
