import { EXPO_PUSH_ENDPOINT, adminDb } from './config.js';

export type PaymentNotificationEventType =
  | 'fine_created'
  | 'payment_success'
  | 'payment_failed'
  | 'payment_action_required';

export interface UserNotificationPayload {
  eventType: PaymentNotificationEventType;
  title: string;
  body: string;
  relatedSessionId?: string;
  relatedFineId?: string;
  relatedPaymentId?: string;
}

/**
 * Mengirim push notification ke Expo Push API (jika token tersedia) dan mencatat
 * log notifikasi ke koleksi Firestore /notifications. Bersifat non-blocking.
 */
export async function sendToUser(
  uid: string,
  payload: UserNotificationPayload
): Promise<void> {
  if (!uid) return;

  let deliveryStatus: 'sent' | 'failed' | 'in_app_only' = 'in_app_only';

  try {
    const userSnap = await adminDb.collection('users').doc(uid).get();
    const userData = userSnap.data() as Record<string, unknown> | undefined;
    const expoPushToken =
      typeof userData?.expoPushToken === 'string' ? userData.expoPushToken.trim() : '';

    if (expoPushToken && userData?.notificationsEnabled !== false) {
      try {
        const res = await fetch(EXPO_PUSH_ENDPOINT, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: expoPushToken,
            sound: 'default',
            title: payload.title,
            body: payload.body,
            channelId: 'praktikum-updates',
            data: {
              eventType: payload.eventType,
              url: payload.relatedFineId
                ? `/praktikan/tagihan/${payload.relatedFineId}`
                : '/praktikan/tagihan',
              ...(payload.relatedSessionId
                ? { relatedSessionId: payload.relatedSessionId }
                : {}),
              ...(payload.relatedFineId ? { relatedFineId: payload.relatedFineId } : {}),
              ...(payload.relatedPaymentId
                ? { relatedPaymentId: payload.relatedPaymentId }
                : {}),
            },
          }),
        });

        if (!res.ok) {
          deliveryStatus = 'failed';
        } else {
          const ticketPayload = (await res.json()) as {
            data?: { status?: string } | { status?: string }[];
          };
          const ticket = Array.isArray(ticketPayload.data)
            ? ticketPayload.data[0]
            : ticketPayload.data;
          deliveryStatus = ticket?.status === 'ok' ? 'sent' : 'failed';
        }
      } catch {
        deliveryStatus = 'failed';
      }
    }

    await adminDb.collection('notifications').add({
      targetUserId: uid,
      targetRole: 'praktikan',
      eventType: payload.eventType,
      title: payload.title,
      body: payload.body,
      ...(payload.relatedSessionId ? { relatedSessionId: payload.relatedSessionId } : {}),
      ...(payload.relatedFineId ? { relatedFineId: payload.relatedFineId } : {}),
      ...(payload.relatedPaymentId ? { relatedPaymentId: payload.relatedPaymentId } : {}),
      isRead: false,
      deliveryStatus,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[notify] Gagal menulis log notifikasi:', err instanceof Error ? err.message : err);
  }
}

export function formatRupiahId(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `Rp ${new Intl.NumberFormat('id-ID').format(safe)}`;
}
