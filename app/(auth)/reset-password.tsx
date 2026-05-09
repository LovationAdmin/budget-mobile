import React, { useState } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { AuthService } from '@/services/auth.service';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  password: z.string().min(10),
  confirm:  z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Mismatch', path: ['confirm'],
});
type FormData = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ password }: FormData) => {
    if (!token) { setError(t('errors.validation')); return; }
    try {
      await AuthService.resetPassword(token, password);
      setDone(true);
    } catch {
      setError(t('errors.session_expired'));
    }
  };

  if (done) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center px-6">
          <View className="rounded-2xl bg-success/10 p-5">
            <Text className="text-base text-success font-display-semibold">{t('common.confirm')}</Text>
          </View>
          <Button className="mt-6" size="lg" onPress={() => router.replace('/(auth)/login')}>
            {t('auth.signin')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 justify-center px-6 py-12">
            <Text className="mb-2 text-3xl text-foreground font-display-bold">
              {t('auth.forgotTitle')}
            </Text>
            <Text className="mb-8 text-base text-muted-fg font-sans">
              {t('auth.password')}
            </Text>

            <Controller control={control} name="password"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input label={t('auth.password')} placeholder="10+" secureTextEntry
                  value={value} onChangeText={onChange} onBlur={onBlur}
                  error={errors.password?.message} />
              )} />
            <Controller control={control} name="confirm"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input label={t('common.confirm')} placeholder="••••••••" secureTextEntry
                  value={value} onChangeText={onChange} onBlur={onBlur}
                  error={errors.confirm?.message} />
              )} />

            {error ? (
              <View className="mb-4 rounded-xl bg-danger/10 p-3">
                <Text className="text-sm text-danger font-sans">{error}</Text>
              </View>
            ) : null}

            <Button onPress={handleSubmit(onSubmit)} loading={isSubmitting} size="lg">
              {t('common.save')}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
