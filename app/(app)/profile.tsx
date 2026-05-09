import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import {
  ShieldCheck, FileText, Lock, Globe, ChevronRight, Download,
} from 'lucide-react-native';

import { useAuth } from '@/contexts/AuthContext';
import { UserService } from '@/services/user.service';
import { BiometricService } from '@/services/biometric.service';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { setLocale, type SupportedLocale } from '@/i18n';
import { palette } from '@/constants/colors';

const profileSchema = z.object({ name: z.string().min(2) });
const passwordSchema = z.object({
  current_password: z.string().min(1),
  new_password:     z.string().min(10),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Mismatch', path: ['confirm_password'],
});

type ProfileForm  = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

function Row({
  Icon, label, onPress, right,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  onPress: () => void;
  right?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between border-t border-border py-3 first:border-t-0"
    >
      <View className="flex-row items-center gap-3">
        <Icon size={18} color={palette.light.mutedFg} />
        <Text className="text-sm text-foreground font-sans">{label}</Text>
      </View>
      {right ?? <ChevronRight size={16} color={palette.light.mutedFg} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const {
    user, logout, refreshUser,
    biometricEnabled, enableBiometric, disableBiometric,
  } = useAuth();
  const [bioAvailable, setBioAvailable] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => { BiometricService.isAvailable().then(setBioAvailable); }, []);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '' },
  });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onSaveProfile = async ({ name }: ProfileForm) => {
    await UserService.updateProfile({ name });
    await refreshUser();
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 3000);
  };

  const onChangePassword = async ({ current_password, new_password }: PasswordForm) => {
    await UserService.changePassword(current_password, new_password);
    passwordForm.reset();
    setPasswordSuccess(true);
    setTimeout(() => setPasswordSuccess(false), 3000);
  };

  const handleLogout = () => {
    Alert.alert(t('profile.logout'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logout'), style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <View className="mb-6 items-center">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-warm-500">
            <Text className="text-3xl text-white font-display-bold">
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text className="mt-3 text-xl text-foreground font-display-bold">{user?.name}</Text>
          <Text className="text-sm text-muted-fg font-sans">{user?.email}</Text>
        </View>

        {/* Profile name */}
        <Card className="mb-4">
          <Text className="mb-3 text-sm text-foreground font-display-semibold">
            {t('profile.title')}
          </Text>
          <Controller control={profileForm.control} name="name"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input label={t('auth.name')} value={value}
                onChangeText={onChange} onBlur={onBlur}
                error={profileForm.formState.errors.name?.message}
                autoCapitalize="words" />
            )} />
          {profileSuccess ? <Text className="mb-2 text-sm text-success">✓</Text> : null}
          <Button onPress={profileForm.handleSubmit(onSaveProfile)}
            loading={profileForm.formState.isSubmitting} variant="outline">
            {t('common.save')}
          </Button>
        </Card>

        {/* Security */}
        <Card className="mb-4">
          <Text className="mb-3 text-sm text-foreground font-display-semibold">
            {t('profile.biometric').replace('Déverrouillage biométrique', 'Sécurité')}
          </Text>

          {bioAvailable ? (
            <View className="flex-row items-center justify-between border-b border-border py-3">
              <Text className="flex-1 text-sm text-foreground font-sans">
                {t('profile.biometric')}
              </Text>
              <Switch
                value={biometricEnabled}
                onValueChange={async (v) => v ? enableBiometric() : disableBiometric()}
                trackColor={{ true: palette.primary, false: palette.light.border }}
              />
            </View>
          ) : null}

          <Row
            Icon={ShieldCheck}
            label={t('profile.twoFactor')}
            onPress={() => router.push('/(app)/two-factor-setup')}
            right={
              user?.totp_enabled ? (
                <Text className="text-xs text-success font-display-semibold">ON</Text>
              ) : (
                <ChevronRight size={16} color={palette.light.mutedFg} />
              )
            }
          />
        </Card>

        {/* Preferences */}
        <Card className="mb-4">
          <Text className="mb-3 text-sm text-foreground font-display-semibold">
            {t('profile.language')}
          </Text>
          <View className="flex-row gap-2">
            {(['fr', 'en'] as const).map((lng) => (
              <TouchableOpacity
                key={lng}
                onPress={() => setLocale(lng as SupportedLocale)}
                className={`flex-1 rounded-xl border px-4 py-3 ${
                  i18n.language === lng ? 'border-primary bg-primary/5' : 'border-border bg-card'
                }`}
              >
                <View className="flex-row items-center justify-center gap-2">
                  <Globe size={14} color={i18n.language === lng ? palette.primary : palette.light.mutedFg} />
                  <Text className={`font-display-semibold ${
                    i18n.language === lng ? 'text-primary' : 'text-foreground'
                  }`}>
                    {lng.toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Password */}
        <Card className="mb-4">
          <Text className="mb-3 text-sm text-foreground font-display-semibold">
            {t('auth.password')}
          </Text>
          <Controller control={passwordForm.control} name="current_password"
            render={({ field }) => (
              <Input label={t('auth.password')} placeholder="••••••••" secureTextEntry
                value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
                error={passwordForm.formState.errors.current_password?.message} />
            )} />
          <Controller control={passwordForm.control} name="new_password"
            render={({ field }) => (
              <Input label={t('auth.password')} placeholder="10+" secureTextEntry
                value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
                error={passwordForm.formState.errors.new_password?.message} />
            )} />
          <Controller control={passwordForm.control} name="confirm_password"
            render={({ field }) => (
              <Input label={t('common.confirm')} placeholder="••••••••" secureTextEntry
                value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
                error={passwordForm.formState.errors.confirm_password?.message} />
            )} />
          {passwordSuccess ? <Text className="mb-2 text-sm text-success">✓</Text> : null}
          <Button onPress={passwordForm.handleSubmit(onChangePassword)}
            loading={passwordForm.formState.isSubmitting} variant="outline">
            {t('common.save')}
          </Button>
        </Card>

        {/* Data & legal */}
        <Card className="mb-4">
          <Row
            Icon={Download}
            label={t('profile.exportData')}
            onPress={async () => {
              try {
                const data = await UserService.exportData();
                Alert.alert(t('common.confirm'), JSON.stringify(data).slice(0, 200) + '…');
              } catch { Alert.alert(t('errors.network')); }
            }}
          />
          <Row
            Icon={FileText}
            label="Privacy Policy"
            onPress={() => router.push('/legal/privacy')}
          />
          <Row
            Icon={FileText}
            label="Terms of Service"
            onPress={() => router.push('/legal/terms')}
          />
        </Card>

        {/* Logout */}
        <Button variant="danger" onPress={handleLogout}>
          {t('profile.logout')}
        </Button>

        {/* Delete account (destructive — surface but require confirmation) */}
        <TouchableOpacity
          className="mt-4 py-3"
          onPress={() => Alert.alert(
            t('profile.deleteAccount'),
            'Cette action est définitive.',
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('common.delete'), style: 'destructive',
                onPress: async () => {
                  // Real delete requires the password; route to a confirmation
                  // screen in a future iteration. For now, surface a hint.
                  Alert.alert('TODO', 'Confirmer le mot de passe dans un écran dédié.');
                }
              },
            ],
          )}
        >
          <Text className="text-center text-sm text-muted-fg font-sans">
            {t('profile.deleteAccount')}
          </Text>
        </TouchableOpacity>

        <View className="mt-6 items-center">
          <View className="flex-row items-center gap-2">
            <Lock size={12} color={palette.light.mutedFg} />
            <Text className="text-xs text-muted-fg font-sans">
              BudgetFamille · v1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
