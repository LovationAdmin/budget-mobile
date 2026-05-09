import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAuth } from '@/contexts/AuthContext';
import { UserService } from '@/services/user.service';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const profileSchema = z.object({ name: z.string().min(2, '2 caractères minimum') });
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Requis'),
    new_password:     z.string().min(8, '8 caractères minimum'),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirm_password'],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const {
    control: pc,
    handleSubmit: hpSubmit,
    formState: { errors: pe, isSubmitting: pis },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '' },
  });

  const {
    control: pwc,
    handleSubmit: hwSubmit,
    reset: resetPw,
    formState: { errors: pwe, isSubmitting: pwis },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onSaveProfile = async ({ name }: ProfileForm) => {
    await UserService.updateProfile({ name });
    await refreshUser();
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 3000);
  };

  const onChangePassword = async ({ current_password, new_password }: PasswordForm) => {
    await UserService.changePassword(current_password, new_password);
    resetPw();
    setPasswordSuccess(true);
    setTimeout(() => setPasswordSuccess(false), 3000);
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnecter', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Avatar / name header */}
        <View className="mb-6 items-center">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-600">
            <Text className="text-3xl font-bold text-white">
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text className="mt-3 text-xl font-bold text-slate-900">{user?.name}</Text>
          <Text className="text-sm text-slate-500">{user?.email}</Text>
          {user?.is_verified ? (
            <View className="mt-1 rounded-full bg-green-50 px-3 py-0.5">
              <Text className="text-xs font-medium text-green-600">✓ Email vérifié</Text>
            </View>
          ) : (
            <View className="mt-1 rounded-full bg-yellow-50 px-3 py-0.5">
              <Text className="text-xs font-medium text-yellow-600">⚠ Email non vérifié</Text>
            </View>
          )}
        </View>

        {/* Edit profile */}
        <Card className="mb-4">
          <Text className="mb-4 text-base font-semibold text-slate-800">Informations</Text>
          <Controller
            control={pc}
            name="name"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Nom complet"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={pe.name?.message}
                autoCapitalize="words"
              />
            )}
          />
          {profileSuccess && (
            <Text className="mb-2 text-sm text-green-600">✓ Profil mis à jour</Text>
          )}
          <Button onPress={hpSubmit(onSaveProfile)} loading={pis} variant="outline">
            Enregistrer
          </Button>
        </Card>

        {/* Change password */}
        <Card className="mb-4">
          <Text className="mb-4 text-base font-semibold text-slate-800">Mot de passe</Text>
          <Controller
            control={pwc}
            name="current_password"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Mot de passe actuel"
                placeholder="••••••••"
                secureTextEntry
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={pwe.current_password?.message}
              />
            )}
          />
          <Controller
            control={pwc}
            name="new_password"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Nouveau mot de passe"
                placeholder="8 caractères minimum"
                secureTextEntry
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={pwe.new_password?.message}
              />
            )}
          />
          <Controller
            control={pwc}
            name="confirm_password"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Confirmer"
                placeholder="••••••••"
                secureTextEntry
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={pwe.confirm_password?.message}
              />
            )}
          />
          {passwordSuccess && (
            <Text className="mb-2 text-sm text-green-600">✓ Mot de passe modifié</Text>
          )}
          <Button onPress={hwSubmit(onChangePassword)} loading={pwis} variant="outline">
            Changer le mot de passe
          </Button>
        </Card>

        {/* Logout */}
        <Button variant="danger" onPress={handleLogout}>
          Se déconnecter
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
