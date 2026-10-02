import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import type { Project } from '@/types';

// Web-model savings may have no goal (0 = none).
const schemaFor = (webModel: boolean) => z.object({
  name:           z.string().min(1),
  target_amount:  webModel ? z.coerce.number().min(0) : z.coerce.number().positive(),
  current_amount: z.coerce.number().min(0),
  deadline:       z.string().optional(),
});
type FormData = z.infer<ReturnType<typeof schemaFor>>;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (project: Omit<Project, 'id'>) => Promise<void>;
  onDelete?: () => Promise<void>;
  initial?: Project;
  /** Web-model budget: the balance comes from the months, so only name + goal are edited. */
  webModel?: boolean;
}

export function ProjectFormSheet({ visible, onClose, onSubmit, onDelete, initial, webModel = false }: Props) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schemaFor(webModel)) });

  useEffect(() => {
    reset({
      name:           initial?.name           ?? '',
      target_amount:  initial?.target_amount  ?? 0,
      current_amount: initial?.current_amount ?? 0,
      deadline:       initial?.deadline       ?? '',
    });
  }, [initial, reset, visible]);

  const handle = async (data: FormData) => {
    await onSubmit({
      name:           data.name,
      target_amount:  data.target_amount,
      current_amount: data.current_amount,
      deadline:       data.deadline || undefined,
    });
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={initial ? t('common.edit') : t('budget.projects.add')}
    >
      <Controller control={control} name="name"
        render={({ field: { onChange, value, onBlur } }) => (
          <Input label={t('budget.charges.label')} placeholder="Vacances été"
            value={value} onChangeText={onChange} onBlur={onBlur}
            error={errors.name?.message} autoFocus />
        )} />

      <Controller control={control} name="target_amount"
        render={({ field: { onChange, value, onBlur } }) => (
          <Input label={t('budget.projects.target')} placeholder="0"
            keyboardType="decimal-pad"
            value={String(value ?? '')}
            onChangeText={(v) => onChange(v.replace(',', '.'))}
            onBlur={onBlur}
            error={errors.target_amount?.message} />
        )} />

      {webModel ? null : (<>
      <Controller control={control} name="current_amount"
        render={({ field: { onChange, value, onBlur } }) => (
          <Input label={t('budget.projects.saved')} placeholder="0"
            keyboardType="decimal-pad"
            value={String(value ?? '')}
            onChangeText={(v) => onChange(v.replace(',', '.'))}
            onBlur={onBlur}
            error={errors.current_amount?.message} />
        )} />

      <Controller control={control} name="deadline"
        render={({ field: { onChange, value, onBlur } }) => (
          <Input label="YYYY-MM-DD" placeholder="2026-08-01"
            value={value ?? ''} onChangeText={onChange} onBlur={onBlur}
            error={errors.deadline?.message} />
        )} />
      </>)}

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
