import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(10),
});
type FormData = z.infer<typeof schema>;

export default function SignupScreen() {
  const { t } = useTranslation();
  const { signup } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await signup(data);
      setSuccess(true);
    } catch (e: unknown) {
      const apiErr = (e as { response?: { data?: { error?: string } } }).response?.data;
      setError(apiErr?.error ?? t('errors.validation'));
    }
  };

  if (success) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center px-6">
          <View className="rounded-3xl bg-success/10 p-6">
            <Text className="text-xl font-display-bold text-foreground">{t('common.confirm')}</Text>
            <Text className="mt-2 text-base text-muted-fg font-sans">
              {t('auth.emailNotVerified')}
            </Text>
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
            <View className="mb-10">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-warm-500">
                <Text className="text-2xl text-white font-display-bold">BF</Text>
              </View>
              <Text className="text-3xl text-foreground font-display-bold">{t('auth.signupTitle')}</Text>
              <Text className="mt-1 text-base text-muted-fg font-sans">{t('auth.signupSubtitle')}</Text>
            </View>

            <Controller control={control} name="name"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input label={t('auth.name')} placeholder="Marie Dupont"
                  autoComplete="name" autoCapitalize="words"
                  value={value} onChangeText={onChange} onBlur={onBlur}
                  error={errors.name?.message} />
              )} />

            <Controller control={control} name="email"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input label={t('auth.email')} placeholder="vous@exemple.com"
                  keyboardType="email-address" autoComplete="email"
                  value={value} onChangeText={onChange} onBlur={onBlur}
                  error={errors.email?.message} />
              )} />

            <Controller control={control} name="password"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input label={t('auth.password')} placeholder="10+ caractères"
                  secureTextEntry
                  value={value} onChangeText={onChange} onBlur={onBlur}
                  error={errors.password?.message} />
              )} />

            {error ? (
              <View className="mb-4 rounded-xl bg-danger/10 p-3">
                <Text className="text-sm text-danger font-sans">{error}</Text>
              </View>
            ) : null}

            <Button onPress={handleSubmit(onSubmit)} loading={isSubmitting} size="lg">
              {t('auth.submitSignup')}
            </Button>

            <View className="mt-6 flex-row justify-center">
              <Text className="text-sm text-muted-fg font-sans">{t('auth.haveAccount')} </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text className="text-sm font-semibold text-primary">{t('auth.signin')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
