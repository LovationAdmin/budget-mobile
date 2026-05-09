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
import Toast from 'react-native-toast-message';

import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login, requestMagicLink } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [magicSending, setMagicSending] = useState(false);

  const { control, handleSubmit, getValues, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const resp = await login(data);
      if (resp.requires_2fa) {
        router.push({ pathname: '/(auth)/login', params: { requires_2fa: '1' } });
        return;
      }
      router.replace('/(app)');
    } catch (e: unknown) {
      const apiErr = (e as { response?: { data?: { error?: string; email_not_verified?: boolean } } }).response?.data;
      if (apiErr?.email_not_verified) {
        setError(t('auth.emailNotVerified'));
      } else {
        setError(apiErr?.error ?? t('errors.invalid_credentials'));
      }
    }
  };

  const onMagicLink = async () => {
    const email = getValues('email');
    if (!email) {
      setError(t('errors.validation'));
      return;
    }
    setMagicSending(true);
    try {
      await requestMagicLink(email);
      Toast.show({ type: 'success', text1: t('auth.magicLinkRequested') });
    } catch {
      Toast.show({ type: 'error', text1: t('errors.network') });
    } finally {
      setMagicSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 justify-center px-6 py-12">
            <View className="mb-10">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-warm-500">
                <Text className="text-2xl text-white font-display-bold">BF</Text>
              </View>
              <Text className="text-3xl text-foreground font-display-bold">{t('auth.loginTitle')}</Text>
              <Text className="mt-1 text-base text-muted-fg font-sans">{t('auth.loginSubtitle')}</Text>
            </View>

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input
                  label={t('auth.email')}
                  placeholder="vous@exemple.com"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={value} onChangeText={onChange} onBlur={onBlur}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input
                  label={t('auth.password')}
                  placeholder="••••••••"
                  secureTextEntry
                  autoComplete="password"
                  value={value} onChangeText={onChange} onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />

            <TouchableOpacity
              className="mb-6 self-end"
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text className="text-sm font-medium text-primary">{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>

            {error ? (
              <View className="mb-4 rounded-xl bg-danger/10 p-3">
                <Text className="text-sm text-danger font-sans">{error}</Text>
              </View>
            ) : null}

            <Button onPress={handleSubmit(onSubmit)} loading={isSubmitting} size="lg">
              {t('auth.submit')}
            </Button>

            <View className="my-4 flex-row items-center">
              <View className="flex-1 border-t border-border" />
              <Text className="mx-3 text-xs text-muted-fg uppercase font-medium">ou</Text>
              <View className="flex-1 border-t border-border" />
            </View>

            <Button variant="outline" onPress={onMagicLink} loading={magicSending}>
              {t('auth.magicLinkButton')}
            </Button>

            <View className="mt-6 flex-row justify-center">
              <Text className="text-sm text-muted-fg font-sans">{t('auth.noAccount')} </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                <Text className="text-sm font-semibold text-primary">{t('auth.createAccount')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
