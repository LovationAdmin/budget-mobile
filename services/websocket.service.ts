import * as SecureStore from 'expo-secure-store';
import { WS_BASE_URL, SECURE_STORE_KEYS } from '@/constants/api';

// Lightweight wrapper over the realtime WS at /api/v1/ws/budgets/:id.
// The server expects the access token in the `?token=` query string
// (see budget-api/handlers/ws.go).
//
// Usage:
//   const sock = await BudgetSocket.connect(budgetId, (msg) => {...});
//   sock.send({ type: 'ping' });
//   sock.close();

type Listener = (msg: unknown) => void;

export interface BudgetWebSocket {
  send(msg: unknown): void;
  close(): void;
}

export const BudgetSocket = {
  async connect(budgetId: string, onMessage: Listener): Promise<BudgetWebSocket | null> {
    const token = await SecureStore.getItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
    if (!token) return null;

    const url = `${WS_BASE_URL}/ws/budgets/${budgetId}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);

    ws.onmessage = (e) => {
      try { onMessage(JSON.parse(e.data as string)); }
      catch { /* ignore non-JSON */ }
    };

    return {
      send: (msg) => {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
      },
      close: () => ws.close(),
    };
  },
};
