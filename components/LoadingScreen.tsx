import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { palette } from '@/constants/colors';

export function LoadingScreen({ message }: { message?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color={palette.primary} />
      {message ? <Text className="mt-4 text-sm text-muted-fg font-sans">{message}</Text> : null}
    </View>
  );
}
