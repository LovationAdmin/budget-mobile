import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { Copy, ShieldCheck } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { TwoFactorService, type TOTPSetupResponse } from '@/services/twofactor.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { palette } from '@/constants/colors';

// expo-clipboard isn't in our deps; we lazy-import to avoid a hard dep.
// Fallback to the WebAPI-style navigator.clipboard or a no-op.
async function copyText(text: string): Promise<void> {
  try {
    if ((Clipboard as unknown as { setStringAsync?: (s: string) => Promise<void> }).setStringAsync) {
      await (Clipboard as unknown as { setStringAsync: (s: string) => Promise<void> }).setStringAsync(text);
    }
  } catch { /* swallow */ }
}

export default function TwoFactorSetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [setup, setSetup] = useState<TOTPSetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    TwoFactorService.setup()
      .then(setSetup)
      .catch(() => setError(t('errors.network')))
      .finally(() => setLoading(false));
  }, [t]);

  const handleVerify = async () => {
    if (code.length !== 6) { setError(t('errors.validation')); return; }
    setError(null); setVerifying(true);
    try {
      await TwoFactorService.verify(code);
      await refreshUser();
      Toast.show({ type: 'success', text1: t('common.confirm') });
      router.back();
    } catch {
      setError(t('errors.invalid_credentials'));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="mb-6 items-center">
          <View className="mb-3 h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck size={28} color={palette.primary} />
          </View>
          <Text className="text-2xl text-foreground font-display-bold">
            {t('auth.tfaTitle')}
          </Text>
          <Text className="mt-1 text-center text-sm text-muted-fg font-sans">
            {t('auth.tfaSubtitle')}
          </Text>
        </View>

        {loading ? (
          <View className="py-10 items-center">
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : setup ? (
          <>
            <Card className="mb-4">
              <Text className="mb-3 text-sm text-foreground font-display-semibold">
                1. Scan with Google Authenticator / 1Password / Authy
              </Text>
              <Text className="text-xs text-muted-fg font-mono break-all" selectable>
                {setup.qr_code_url}
              </Text>
              <Text className="mt-3 text-xs text-muted-fg font-sans">
                Or enter this secret manually:
              </Text>
              <View className="mt-1 flex-row items-center justify-between rounded-xl bg-muted px-3 py-2">
                <Text className="text-base text-foreground font-mono" selectable>
                  {setup.secret}
                </Text>
                <Copy size={16} color={palette.primary} onPress={() => copyText(setup.secret)} />
              </View>
            </Card>

            {setup.backup_codes && setup.backup_codes.length > 0 ? (
              <Card className="mb-4 bg-warm-50">
                <Text className="mb-2 text-sm text-warm-700 font-display-semibold">
                  Backup codes (save securely)
                </Text>
                {setup.backup_codes.map((c) => (
                  <Text key={c} className="text-base text-foreground font-mono" selectable>
                    {c}
                  </Text>
                ))}
              </Card>
            ) : null}

            <Card>
              <Text className="mb-3 text-sm text-foreground font-display-semibold">
                2. Enter the 6-digit code
              </Text>
              <Input
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                autoFocus
                error={error ?? undefined}
              />
              <Button
                size="lg"
                onPress={handleVerify}
                loading={verifying}
                disabled={code.length !== 6}
              >
                {t('common.confirm')}
              </Button>
            </Card>
          </>
        ) : (
          <Text className="text-center text-danger">{error}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
