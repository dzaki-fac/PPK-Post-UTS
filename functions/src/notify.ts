/**
 * Notifikasi backend: menulis /notifications dan mengirim push lewat Expo Push API.
 * Kegagalan push TIDAK menggagalkan proses utama (hanya mengubah deliveryStatus).
 */

import { COLLECTIONS, db } from './config';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const CHANNEL_ID = 'praktikum-updates';
const ALREADY_EXISTS = 6;

export type PaymentNotificationType =
  | 'fine_created'
  | 'payment_success'
  | 'payment_failed'
  | 'payment_action_required';

export type DeliveryStatus = 'sent' | 'failed' | 'in_app_only';

export interface NotificationPayload {
  eventType: PaymentNotificationType;
  title: string;
  body: string;
  relatedFineId?: string;
  relatedPaymentId?: string;
  relatedSessionId?: string;
}

async function sendExpoPush(
  token: string,
  payload: NotificationPayload,
  url: string
): Promise<DeliveryStatus> {
  try {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify([
        {
          to: token,
          title: payload.title,
          body: payload.body,
          sound: 'default',
          priority: 'high',
          channelId: CHANNEL_ID,
          data: {
            url,
            eventType: payload.eventType,
            ...(payload.relatedFineId ? { relatedFineId: payload.relatedFineId } : {}),
            ...(payload.relatedPaymentId ? { relatedPaymentId: payload.relatedPaymentId } : {}),
          },
        },
      ]),
    });
    if (!response.ok) return 'failed';
    const result = (await response.json()) as { data?: { status?: string }[] };
    return (result.data ?? []).some((ticket) => ticket.status === 'ok') ? 'sent' : 'failed';
  } catch (error) {
    console.warn('Push notification gagal dikirim:', error instanceof Error ? error.message : error);
    return 'failed';
  }
}

/**
 * Menulis log notifikasi dan mengirim push ke satu pengguna.
 * `dedupeKey` membuat dokumen deterministik sehingga trigger at-least-once tidak mengirim ganda.
 * Mengembalikan true bila notifikasi benar-benar baru dibuat.
 */
export async function sendToUser(
  uid: string,
  payload: NotificationPayload,
  dedupeKey?: string
): Promise<boolean> {
  try {
    const userSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
    const expoPushToken = userSnap.exists
      ? (userSnap.data()?.expoPushToken as string | undefined)
      : undefined;

    const url = payload.relatedFineId
      ? `/praktikan/tagihan/${payload.relatedFineId}`
      : '/praktikan/tagihan';

    const ref = dedupeKey
      ? db.collection(COLLECTIONS.notifications).doc(dedupeKey)
      : db.collection(COLLECTIONS.notifications).doc();

    const baseDoc = {
      targetUserId: uid,
      targetRole: 'praktikan',
      eventType: payload.eventType,
      title: payload.title,
      body: payload.body,
      isRead: false,
      createdAt: new Date().toISOString(),
      ...(payload.relatedFineId ? { relatedFineId: payload.relatedFineId } : {}),
      ...(payload.relatedPaymentId ? { relatedPaymentId: payload.relatedPaymentId } : {}),
      ...(payload.relatedSessionId ? { relatedSessionId: payload.relatedSessionId } : {}),
    };

    try {
      await ref.create({ ...baseDoc, deliveryStatus: 'in_app_only' satisfies DeliveryStatus });
    } catch (error) {
      if ((error as { code?: number }).code === ALREADY_EXISTS) return false;
      throw error;
    }

    if (expoPushToken) {
      const delivery = await sendExpoPush(expoPushToken, payload, url);
      await ref.update({ deliveryStatus: delivery });
    }
    return true;
  } catch (error) {
    console.warn('Notifikasi dilewati:', error instanceof Error ? error.message : error);
    return false;
  }
}
