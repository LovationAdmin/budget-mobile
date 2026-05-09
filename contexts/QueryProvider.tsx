import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

// React Query with offline persistence:
// - List/detail queries are cached in AsyncStorage so the app boots offline
//   with the last-known data.
// - Mutations don't queue automatically — for now we keep optimistic updates
//   and rely on the user being online when editing. A retry-queue can be
//   layered later by setting `defaultOptions.mutations.retry` + a network
//   listener if offline edits become a hard requirement.

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime:    1000 * 60 * 60 * 24, // 24h — give the persister time to read
      retry: 1,
      refetchOnReconnect: 'always',
      refetchOnWindowFocus: false,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'bf-react-query-cache',
  throttleTime: 1000,
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7d retention
        // Bump this when query shapes change (force a clean cache).
        buster: 'v1',
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
