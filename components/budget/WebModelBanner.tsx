import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';
import { Info, ExternalLink } from 'lucide-react-native';

import { palette } from '@/constants/colors';

const WEB_APP_URL = 'https://budgetfamille.com';

/**
 * Shown on budgets that follow the web model (see lib/budget/web.ts): says
 * how mobile edits apply, and links to the web for members / contributions.
 */
export function WebModelBanner({ budgetId }: { budgetId: string }) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-3 border-b border-border bg-primary/5 px-5 py-3">
      <Info size={18} color={palette.primary} />
      <Text className="flex-1 text-xs text-foreground font-sans">{t('budget.webModel.body')}</Text>
      <TouchableOpacity
        accessibilityRole="link"
        accessibilityLabel={t('budget.webModel.openWeb')}
        onPress={() => Linking.openURL(`${WEB_APP_URL}/budget/${budgetId}/complete/month`)}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        className="flex-row items-center gap-1 rounded-lg bg-primary px-3 py-2"
      >
        <Text className="text-xs text-white font-display-semibold">{t('budget.webModel.openWeb')}</Text>
        <ExternalLink size={12} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}
