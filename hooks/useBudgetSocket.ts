import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

import { BudgetSocket, type BudgetWebSocket } from '@/services/websocket.service';
import { QUERY_KEYS } from '@/constants/api';

// Mounted by /budget/[id]/_layout — listens to WS events and invalidates
// React Query caches so the UI hydrates from the new server state.
//
// Events expected from the server (see budget-api/handlers/ws.go):
//   { type: 'budget_data_updated', updated_by, version }
//   { type: 'budget_updated' }
//   { type: 'member_added' | 'member_removed' | 'invitation_sent' }
//
// We invalidate the relevant query keys; React Query refetches in the background.

export function useBudgetSocket(budgetId: string | undefined): void {
  const qc = useQueryClient();
  const ref = useRef<BudgetWebSocket | null>(null);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    if (!budgetId) return;
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = async () => {
      if (cancelled) return;
      const sock = await BudgetSocket.connect(budgetId, (msg) => {
        const ev = msg as { type?: string };
        switch (ev.type) {
          case 'budget_data_updated':
            qc.invalidateQueries({ queryKey: QUERY_KEYS.BUDGET_DATA(budgetId) });
            break;
          case 'budget_updated':
          case 'member_added':
          case 'member_removed':
          case 'invitation_sent':
            qc.invalidateQueries({ queryKey: QUERY_KEYS.BUDGET(budgetId) });
            break;
          default:
            break;
        }
      });
      if (!sock || cancelled) return;
      ref.current = sock;
      reconnectAttempts.current = 0;
    };

    const subscription = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active' && !ref.current) {
        // App came back to foreground -> try to reconnect.
        connect();
      }
    });

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ref.current?.close();
      ref.current = null;
      subscription.remove();
    };
  }, [budgetId, qc]);
}
