import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AuthService } from '@/services/auth.service';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const schema = z.object({ email: z.string().email() });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [sent, setSent] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: FormData) => {
    await AuthService.forgotPassword(email);
    setSent(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 justify-center px-6 py-12">
            <Button variant="ghost" className="mb-6 self-start" onPress={() => router.back()}>
              ← {t('common.back')}
            </Button>

            <Text className="mb-2 text-3xl text-foreground font-display-bold">{t('auth.forgotTitle')}</Text>
            <Text className="mb-8 text-base text-muted-fg font-sans">{t('auth.forgotSubtitle')}</Text>

            {sent ? (
              <View className="rounded-2xl bg-success/10 p-5">
                <Text className="text-base text-success font-display-semibold">{t('auth.forgotSent')}</Text>
              </View>
            ) : (
              <>
                <Controller control={control} name="email"
                  render={({ field: { onChange, value, onBlur } }) => (
                    <Input label={t('auth.email')} placeholder="vous@exemple.com"
                      keyboardType="email-address" autoComplete="email"
                      value={value} onChangeText={onChange} onBlur={onBlur}
                      error={errors.email?.message} />
                  )} />
                <Button onPress={handleSubmit(onSubmit)} loading={isSubmitting} size="lg">
                  {t('auth.forgotSubmit')}
                </Button>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
