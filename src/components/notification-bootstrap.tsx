/** Dipasang di root layout (di dalam AuthProvider) untuk registrasi token & listener notifikasi. */

import { useNotifications } from '@/hooks/use-notifications';

export function NotificationBootstrap() {
  useNotifications();
  return null;
}
