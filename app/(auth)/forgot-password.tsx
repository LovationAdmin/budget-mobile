import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthService } from '@/services/auth.service';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const schema = z.object({ email: z.string().email('Email invalide') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [sent, setSent] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email }: FormData) => {
    await AuthService.forgotPassword(email);
    setSent(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 justify-center px-6 py-12">
            <Button variant="ghost" className="mb-6 self-start" onPress={() => router.back()}>
              ← Retour
            </Button>

            <Text className="mb-2 text-3xl font-bold text-slate-900">Mot de passe oublié</Text>
            <Text className="mb-8 text-base text-slate-500">
              Entrez votre email, nous vous enverrons un lien de réinitialisation.
            </Text>

            {sent ? (
              <View className="rounded-2xl bg-green-50 p-5">
                <Text className="text-base font-semibold text-green-700">✓ Email envoyé !</Text>
                <Text className="mt-1 text-sm text-green-600">
                  Vérifiez votre boîte mail et suivez le lien pour créer un nouveau mot de passe.
                </Text>
              </View>
            ) : (
              <>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, value, onBlur } }) => (
                    <Input
                      label="Email"
                      placeholder="vous@exemple.com"
                      keyboardType="email-address"
                      autoComplete="email"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.email?.message}
                    />
                  )}
                />
                <Button onPress={handleSubmit(onSubmit)} loading={isSubmitting} size="lg">
                  Envoyer le lien
                </Button>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
