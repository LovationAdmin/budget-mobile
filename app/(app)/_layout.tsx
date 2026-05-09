import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Home, User } from 'lucide-react-native';

import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import { palette } from '@/constants/colors';

function TabIcon({ Icon, label, focused }: {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string; focused: boolean;
}) {
  return (
    <View className="items-center pt-1">
      <Icon size={22} color={focused ? palette.primary : palette.light.mutedFg} />
      <Text
        style={{ color: focused ? palette.primary : palette.light.mutedFg }}
        className={`mt-0.5 text-xs ${focused ? 'font-semibold' : 'font-medium'}`}
      >
        {label}
      </Text>
    </View>
  );
}

export default function AppLayout() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, isLocked } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (isLocked) return <Redirect href="/(auth)/biometric-unlock" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 70, paddingBottom: 8, paddingTop: 6,
          borderTopColor: palette.light.border,
          backgroundColor: palette.light.background,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="index" options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon Icon={Home} label={t('dashboard.yourBudgets')} focused={focused} />
        ),
      }} />
      <Tabs.Screen name="profile" options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon Icon={User} label={t('profile.title')} focused={focused} />
        ),
      }} />

      {/* Hidden screens (deep navigation only) */}
      <Tabs.Screen name="two-factor-setup" options={{ href: null }} />
      <Tabs.Screen name="banking-connect"  options={{ href: null }} />
      <Tabs.Screen name="invitation/[token]" options={{ href: null }} />
      <Tabs.Screen name="budget/[id]/_layout"  options={{ href: null }} />
      <Tabs.Screen name="budget/[id]/overview" options={{ href: null }} />
      <Tabs.Screen name="budget/[id]/members"  options={{ href: null }} />
      <Tabs.Screen name="budget/[id]/charges"  options={{ href: null }} />
      <Tabs.Screen name="budget/[id]/projects" options={{ href: null }} />
      <Tabs.Screen name="budget/[id]/calendar" options={{ href: null }} />
      <Tabs.Screen name="budget/[id]/reality"  options={{ href: null }} />
    </Tabs>
  );
}
