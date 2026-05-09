import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

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

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user, logout, refreshUser, biometricEnabled, enableBiometric, disableBiometric } = useAuth();
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

  const handleBiometricToggle = async (val: boolean) => {
    if (val) await enableBiometric();
    else await disableBiometric();
  };

  const handleLanguage = async (lng: SupportedLocale) => { await setLocale(lng); };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Header */}
        <View className="mb-6 items-center">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-warm-500">
            <Text className="text-3xl text-white font-display-bold">
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text className="mt-3 text-xl text-foreground font-display-bold">{user?.name}</Text>
          <Text className="text-sm text-muted-fg font-sans">{user?.email}</Text>
          {user?.email_verified ? (
            <View className="mt-1 rounded-full bg-success/10 px-3 py-0.5">
              <Text className="text-xs text-success font-medium">{t('common.confirm')}</Text>
            </View>
          ) : null}
        </View>

        {/* Edit profile */}
        <Card className="mb-4">
          <Text className="mb-4 text-base text-foreground font-display-semibold">
            {t('profile.title')}
          </Text>
          <Controller control={profileForm.control} name="name"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input label={t('auth.name')} value={value}
                onChangeText={onChange} onBlur={onBlur}
                error={profileForm.formState.errors.name?.message}
                autoCapitalize="words" />
            )} />
          {profileSuccess ? (
            <Text className="mb-2 text-sm text-success">✓</Text>
          ) : null}
          <Button onPress={profileForm.handleSubmit(onSaveProfile)}
            loading={profileForm.formState.isSubmitting} variant="outline">
            {t('common.save')}
          </Button>
        </Card>

        {/* Security & preferences */}
        <Card className="mb-4">
          <Text className="mb-4 text-base text-foreground font-display-semibold">
            {t('profile.biometric')}
          </Text>
          {bioAvailable ? (
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 text-sm text-foreground font-sans">
                {t('biometric.enableSubtitle')}
              </Text>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ true: palette.primary, false: palette.light.border }}
              />
            </View>
          ) : (
            <Text className="text-sm text-muted-fg font-sans">
              {t('common.empty')}
            </Text>
          )}
        </Card>

        <Card className="mb-4">
          <Text className="mb-4 text-base text-foreground font-display-semibold">
            {t('profile.language')}
          </Text>
          <View className="flex-row gap-2">
            {(['fr', 'en'] as const).map((lng) => (
              <TouchableOpacity
                key={lng}
                onPress={() => handleLanguage(lng)}
                className={`flex-1 rounded-xl border px-4 py-3 ${
                  i18n.language === lng ? 'border-primary bg-primary/5' : 'border-border bg-card'
                }`}
              >
                <Text className={`text-center font-display-semibold ${
                  i18n.language === lng ? 'text-primary' : 'text-foreground'
                }`}>
                  {lng.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Password change */}
        <Card className="mb-4">
          <Text className="mb-4 text-base text-foreground font-display-semibold">
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
              <Input label={t('auth.password')} placeholder="10+ chars" secureTextEntry
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

        <Button variant="danger" onPress={handleLogout}>
          {t('profile.logout')}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
