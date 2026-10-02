import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';
import { Eye, ExternalLink } from 'lucide-react-native';

import { palette } from '@/constants/colors';

const WEB_APP_URL = 'https://budgetfamille.com';

/**
 * Shown on budgets that follow the web model (see lib/budget/web.ts): the
 * figures match the web app, and editing happens there.
 */
export function ReadOnlyBanner({ budgetId }: { budgetId: string }) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-3 border-b border-border bg-primary/5 px-5 py-3">
      <Eye size={18} color={palette.primary} />
      <Text className="flex-1 text-xs text-foreground font-sans">{t('budget.readOnly.body')}</Text>
      <TouchableOpacity
        accessibilityRole="link"
        accessibilityLabel={t('budget.readOnly.openWeb')}
        onPress={() => Linking.openURL(`${WEB_APP_URL}/budget/${budgetId}/complete/month`)}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        className="flex-row items-center gap-1 rounded-lg bg-primary px-3 py-2"
      >
        <Text className="text-xs text-white font-display-semibold">{t('budget.readOnly.openWeb')}</Text>
        <ExternalLink size={12} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}
