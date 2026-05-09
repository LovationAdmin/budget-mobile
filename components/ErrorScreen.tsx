import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { palette } from '@/constants/colors';

interface ErrorScreenProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorScreen({ message, onRetry }: ErrorScreenProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-danger/10">
        <AlertCircle size={32} color={palette.danger} />
      </View>
      <Text className="text-center text-base text-foreground font-sans">
        {message ?? t('common.error')}
      </Text>
      {onRetry ? (
        <Button variant="outline" className="mt-6" onPress={onRetry}>
          {t('common.retry')}
        </Button>
      ) : null}
    </View>
  );
}
