import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, Text } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import { COLORS } from '@/constants/colors';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View className="items-center pt-1">
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text
        className={`mt-0.5 text-xs ${focused ? 'font-semibold text-primary-600' : 'font-medium text-slate-400'}`}
      >
        {label}
      </Text>
    </View>
  );
}

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 70,
          paddingBottom: 8,
          paddingTop: 6,
          borderTopColor: COLORS.border,
          backgroundColor: COLORS.surface,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Accueil" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Profil" focused={focused} />
          ),
        }}
      />
      {/* Hide budget detail from tab bar — accessed via navigation */}
      <Tabs.Screen
        name="budget/[id]/overview"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="budget/[id]/members"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="budget/[id]/charges"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="budget/[id]/projects"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="budget/[id]/calendar"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="budget/[id]/reality"
        options={{ href: null }}
      />
    </Tabs>
  );
}
