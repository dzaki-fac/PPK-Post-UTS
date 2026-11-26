/** Pusat Notifikasi in-app — riwayat real-time & fallback saat push tidak aktif. */

import { router, type Href } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DeviceStatusBanner } from '@/components/device-status-banner';
import { EmptyState } from '@/components/empty-state';
import { useAuth } from '@/context/auth-context';
import { useDeviceResilience } from '@/hooks/use-device-resilience';
import {
  getNotificationPermissionState,
  markNotificationAsRead,
  subscribeUserNotifications,
} from '@/services/notification-service';
import { NotificationDocument, NotificationEventType } from '@/types/praktikum';

const EVENT_LABEL: Record<NotificationEventType, string> = {
  session_opened: 'Sesi Dibuka',
  session_started: 'Kelas Dimulai',
  schedule_updated: 'Jadwal Diubah',
  leave_approved: 'Izin Disetujui',
  leave_rejected: 'Izin Ditolak',
  fine_created: 'Tagihan Denda',
  payment_success: 'Pembayaran Berhasil',
  payment_failed: 'Pembayaran Gagal',
  payment_action_required: 'Selesaikan Pembayaran',
};

const DELIVERY_LABEL: Record<NotificationDocument['deliveryStatus'], string> = {
  sent: 'Push terkirim',
  failed: 'Push gagal',
  in_app_only: 'Tersedia di aplikasi',
};

function targetRoute(item: NotificationDocument): Href | null {
  if (item.relatedSessionId) return '/praktikan/jadwal' as Href;
  if (item.relatedLeaveId) return '/praktikan/pengajuan-izin' as Href;
  return null;
}

export default function NotifikasiScreen() {
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();
  const [items, setItems] = useState<NotificationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<string>('unavailable');
  const device = useDeviceResilience();
  const accent =
    role === 'aslab' ? '#4F46E5' : role === 'asprak' ? '#0D9488' : '#EA580C';
  const tint =
    role === 'aslab' ? '#EEF2FF' : role === 'asprak' ? '#F0FDFA' : '#FFF7ED';

  const loadPermission = useCallback(async () => {
    setPermission(await getNotificationPermissionState());
  }, []);

  useEffect(() => {
    // Izin perangkat dibaca async setelah mount, bukan setState sinkron di body effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPermission();
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeUserNotifications(user.uid, (data) => {
      setItems(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [user?.uid, loadPermission]);

  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);

  const handleOpen = async (item: NotificationDocument) => {
    if (!item.isRead) {
      try {
        await markNotificationAsRead(item.id);
        setItems((prev) =>
          prev.map((entry) => (entry.id === item.id ? { ...entry, isRead: true } : entry))
        );
      } catch (error) {
        console.warn('Gagal menandai notifikasi dibaca:', error);
      }
    }
    const route = targetRoute(item);
    if (route) router.push(route);
  };

  const handleMarkAllRead = async () => {
    await Promise.all(
      items
        .filter((item) => !item.isRead)
        .map((item) =>
          markNotificationAsRead(item.id)
            .then(() => null)
            .catch(() => item.id)
        )
    );
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
  };

  const renderItem = ({ item }: { item: NotificationDocument }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed, !item.isRead && styles.cardUnread]}
      onPress={() => void handleOpen(item)}
      accessibilityRole="button"
      accessibilityLabel={`Buka notifikasi ${item.title}`}>
      <View style={styles.cardHeader}>
        <View style={[styles.eventPill, { backgroundColor: tint }]}>
          <Text style={[styles.eventText, { color: accent }]}>{EVENT_LABEL[item.eventType]}</Text>
        </View>
        {!item.isRead ? (
          <View style={styles.unreadDot}>
            <Text style={styles.unreadDotText}>●</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
      <View style={styles.footer}>
        <Text style={styles.meta}>{DELIVERY_LABEL[item.deliveryStatus]}</Text>
        <Text style={styles.meta}>
          {new Date(item.createdAt).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable
          style={styles.backPill}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Kembali">
          <Text style={styles.backText}>← Kembali</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Pusat Notifikasi</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Semua notifikasi telah dibaca'}
          </Text>
        </View>
        {unreadCount > 0 ? (
          <Pressable style={styles.readAllPill} onPress={() => void handleMarkAllRead()}>
            <Text style={[styles.readAllText, { color: accent }]}>Tandai Dibaca</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.content}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status notifikasi perangkat:</Text>
          <Text style={styles.statusValue}>
            {permission === 'granted'
              ? 'Aktif'
              : permission === 'denied'
                ? 'Izin ditolak'
                : 'Tidak tersedia'}
          </Text>
        </View>

        {device.statuses.map((status) => (
          <DeviceStatusBanner
            key={status}
            type={status}
            onRetry={() => {
              void device.refresh();
              void loadPermission();
            }}
          />
        ))}

        <Text style={styles.sectionTitle}>Riwayat Notifikasi</Text>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            loading ? null : (
              <EmptyState
                title="Belum Ada Notifikasi"
                message="Pemberitahuan sesi dibuka, perubahan jadwal, dan keputusan izin akan tampil di sini."
              />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => {
                void device.refresh();
                void loadPermission();
              }}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  backPill: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  backText: { color: '#334155', fontWeight: '700', fontSize: 13 },
  headerTitleWrap: { flex: 1, minWidth: 180 },
  headerTitle: { color: '#0F172A', fontWeight: '800', fontSize: 18 },
  headerSubtitle: { color: '#64748B', fontSize: 12, marginTop: 2 },
  readAllPill: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  readAllText: { fontSize: 12, fontWeight: '700' },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 14,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 4,
  },
  statusLabel: { color: '#64748B', fontSize: 12 },
  statusValue: { color: '#0F172A', fontSize: 12, fontWeight: '700' },
  sectionTitle: { color: '#0F172A', fontWeight: '800', fontSize: 15, marginBottom: 10 },
  listContent: { paddingBottom: 28, flexGrow: 1 },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
  },
  cardPressed: { opacity: 0.85 },
  cardUnread: { borderColor: '#FED7AA' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  eventText: { fontSize: 11, fontWeight: '800' },
  unreadDot: { minWidth: 22, alignItems: 'center' },
  unreadDotText: { color: '#EA580C', fontSize: 10 },
  title: { color: '#0F172A', fontWeight: '800', fontSize: 15, marginTop: 10 },
  body: { color: '#334155', fontSize: 13, lineHeight: 19, marginTop: 5 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  meta: { color: '#64748B', fontSize: 11 },
});
