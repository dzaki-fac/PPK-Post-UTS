/**
 * Hook tagihan & riwayat pembayaran dengan cache AsyncStorage per-uid (SRS4 FR-P3-04.5).
 * Data langsung tampil dari cache (juga saat offline / app dibuka ulang), lalu diganti
 * otomatis oleh data terbaru dari Firestore.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import {
  subscribeStudentFines,
  subscribeStudentPayments,
} from '@/services/payment-service';
import type { FineDocument, PaymentDocument } from '@/types/finance';

interface CachedState<T> {
  items: T[];
  loading: boolean;
  fromCache: boolean;
  error: string | null;
}

type Subscriber<T> = (
  uid: string,
  onData: (items: T[]) => void,
  onError?: (error: Error) => void
) => () => void;

function useCachedCollection<T>(
  uid: string | undefined,
  cachePrefix: string,
  subscribe: Subscriber<T>
): CachedState<T> {
  const [state, setState] = useState<CachedState<T>>({
    items: [],
    loading: true,
    fromCache: false,
    error: null,
  });

  useEffect(() => {
    if (!uid) {
      // Tanpa uid tidak ada yang bisa dimuat; hentikan indikator loading.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ items: [], loading: false, fromCache: false, error: null });
      return;
    }

    let active = true;
    let gotLiveData = false;
    const cacheKey = `${cachePrefix}:${uid}`;

    AsyncStorage.getItem(cacheKey)
      .then((raw) => {
        if (!active || gotLiveData || !raw) return;
        const cached = JSON.parse(raw) as T[];
        if (Array.isArray(cached)) {
          setState({ items: cached, loading: false, fromCache: true, error: null });
        }
      })
      .catch(() => {});

    const unsubscribe = subscribe(
      uid,
      (items) => {
        if (!active) return;
        gotLiveData = true;
        setState({ items, loading: false, fromCache: false, error: null });
        AsyncStorage.setItem(cacheKey, JSON.stringify(items)).catch(() => {});
      },
      (error) => {
        if (!active) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error.message || 'Gagal memuat data dari server.',
        }));
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [uid, cachePrefix, subscribe]);

  return state;
}

export function useStudentFines(uid: string | undefined): CachedState<FineDocument> {
  return useCachedCollection<FineDocument>(uid, 'cache:fines', subscribeStudentFines);
}

export function useStudentPayments(uid: string | undefined): CachedState<PaymentDocument> {
  return useCachedCollection<PaymentDocument>(uid, 'cache:payments', subscribeStudentPayments);
}
