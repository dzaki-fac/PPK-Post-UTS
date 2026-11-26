import { COLLECTIONS, db } from './config';

export type PaymentNotificationType =
  | 'fine_created'
  | 'payment_success'
  | 'payment_failed'
  | 'payment_action_required';

export interface NotificationPayload {
  eventType: PaymentNotificationType;
  title: string;
  body: string;
  relatedSessionId?: string;
  relatedFineId?: string;
  relatedPaymentId?: string;
}

const ALREADY_EXISTS_CODE = 6;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendToUser(
  uid: string,
  payload: NotificationPayload,
  dedupeKey?: string
): Promise<boolean> {
  if (!uid) return false;

  const now = new Date().toISOString();
  const ref = dedupeKey
    ? db.collection(COLLECTIONS.notifications).doc(dedupeKey)
    : db.collection(COLLECTIONS.notifications).doc();

  const record = {
    id: ref.id,
    targetUserId: uid,
    eventType: payload.eventType,
    title: payload.title,
    body: payload.body,
    isRead: false,
    createdAt: now,
    ...(payload.relatedSessionId ? { relatedSessionId: payload.relatedSessionId } : {}),
    ...(payload.relatedFineId ? { relatedFineId: payload.relatedFineId } : {}),
    ...(payload.relatedPaymentId ? { relatedPaymentId: payload.relatedPaymentId } : {}),
  };

  try {
    await ref.create(record);
  } catch (error) {
    const code = (error as { code?: number | string })?.code;
    if (code === ALREADY_EXISTS_CODE || code === 'already-exists') {
      return false;
    }
    throw error;
  }

  try {
    const userSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
    const user = userSnap.data();
    const token = typeof user?.expoPushToken === 'string' ? user.expoPushToken : '';
    const enabled = user?.notificationsEnabled !== false;

    if (enabled && token.startsWith('ExponentPushToken[')) {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: token,
          sound: 'default',
          title: payload.title,
          body: payload.body,
          data: {
            eventType: payload.eventType,
            relatedFineId: payload.relatedFineId,
            relatedPaymentId: payload.relatedPaymentId,
          },
        }),
      });
    }
  } catch (error) {
    console.warn('Expo push gagal (non-fatal):', error instanceof Error ? error.message : 'unknown');
  }

  return true;
}
