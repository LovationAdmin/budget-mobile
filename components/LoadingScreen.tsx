import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <ActivityIndicator size="large" color="#6366f1" />
      {message && (
        <Text className="mt-4 text-sm text-muted">{message}</Text>
      )}
    </View>
  );
}
