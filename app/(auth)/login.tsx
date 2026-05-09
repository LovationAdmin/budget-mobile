import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  email:    z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await login(data);
      router.replace('/(app)');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Identifiants invalides.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center px-6 py-12">
            {/* Header */}
            <View className="mb-10">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-primary-600">
                <Text className="text-2xl font-bold text-white">BF</Text>
              </View>
              <Text className="text-3xl font-bold text-slate-900">Connexion</Text>
              <Text className="mt-1 text-base text-slate-500">
                Gérez votre budget en famille
              </Text>
            </View>

            {/* Form */}
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

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input
                  label="Mot de passe"
                  placeholder="••••••••"
                  secureTextEntry
                  autoComplete="password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />

            <TouchableOpacity
              className="mb-6 self-end"
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text className="text-sm font-medium text-primary-600">
                Mot de passe oublié ?
              </Text>
            </TouchableOpacity>

            {error && (
              <View className="mb-4 rounded-xl bg-red-50 p-3">
                <Text className="text-sm text-red-600">{error}</Text>
              </View>
            )}

            <Button onPress={handleSubmit(onSubmit)} loading={isSubmitting} size="lg">
              Se connecter
            </Button>

            <View className="mt-6 flex-row justify-center">
              <Text className="text-sm text-slate-500">Pas encore de compte ? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                <Text className="text-sm font-semibold text-primary-600">Créer un compte</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
