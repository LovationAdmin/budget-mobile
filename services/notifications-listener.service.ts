import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/constants/api';

// Wires Expo notification taps to navigation. Server payloads use the
// `data` field to carry { type, budget_id, ... } so this hook deep-links
// into the relevant screen.

export function useNotificationsListener(): void {
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    // Foreground: refresh data when a notification arrives.
    const recvSub = Notifications.addNotificationReceivedListener((n) => {
      const data = n.request.content.data as { type?: string; budget_id?: string } | null;
      if (!data) return;
      if (data.budget_id) {
        qc.invalidateQueries({ queryKey: QUERY_KEYS.BUDGET(data.budget_id) });
        qc.invalidateQueries({ queryKey: QUERY_KEYS.BUDGET_DATA(data.budget_id) });
      }
    });

    // Background tap: open the relevant screen.
    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        { type?: string; budget_id?: string; tab?: string } | null;
      if (!data) return;

      if (data.budget_id) {
        const tab = data.tab ?? 'overview';
        router.push(`/budget/${data.budget_id}/${tab}` as `/budget/${string}/overview`);
        return;
      }
      if (data.type === 'invitation') {
        router.push('/(app)');
        return;
      }
    });

    return () => { recvSub.remove(); tapSub.remove(); };
  }, [router, qc]);
}
