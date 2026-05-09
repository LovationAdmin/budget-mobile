import React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@/components/ui/Button';

interface ErrorScreenProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorScreen({ message = 'Une erreur est survenue.', onRetry }: ErrorScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-bg px-6">
      <Text className="text-4xl">😕</Text>
      <Text className="mt-4 text-center text-base text-slate-600">{message}</Text>
      {onRetry && (
        <Button variant="outline" className="mt-6" onPress={onRetry}>
          Réessayer
        </Button>
      )}
    </View>
  );
}
