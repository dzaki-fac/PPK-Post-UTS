/**
 * Web fallback untuk Rich Push Notification Service.
 * Mencegah bundler Web memuat modul native @react-native-firebase/messaging & react-native-notify-kit.
 */

export const DEFAULT_CHANNEL_ID = 'default';
export const PRAKTIKUM_CHANNEL_ID = 'praktikum-updates';

export type RichNotificationPermissionStatus = 'granted' | 'denied' | 'unsupported' | 'error';

export interface RichNotificationInitResult {
  enabled: boolean;
  status: RichNotificationPermissionStatus;
  fcmToken: string | null;
  errorMessage?: string;
}

export async function createNotificationChannels(): Promise<void> {
  // Tidak berlaku pada platform Web
}

export async function requestRichNotificationPermission(
  _uid?: string
): Promise<RichNotificationInitResult> {
  return {
    enabled: false,
    status: 'unsupported',
    fcmToken: null,
    errorMessage: 'Rich Push Notification (FCM + notify-kit) hanya tersedia di Android/iOS.',
  };
}

export interface LocalRichNotificationInput {
  title: string;
  body: string;
  imageUrl?: string;
  channelId?: string;
  data?: Record<string, string>;
}

export async function displayLocalRichNotification(
  _input: LocalRichNotificationInput
): Promise<boolean> {
  return false;
}

export async function displayRichNotification(_remoteMessage: unknown): Promise<void> {
  // Tidak berlaku pada platform Web
}

export function registerBackgroundRichNotificationHandlers(): void {
  // Tidak berlaku pada platform Web
}

export function subscribeRichNotifications(
  _uid: string | undefined,
  _onNavigate: (data: Record<string, unknown> | undefined) => void
): () => void {
  return () => {};
}
