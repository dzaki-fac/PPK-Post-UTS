import { router, useLocalSearchParams, type Href } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConfirmationModal } from '@/components/confirmation-modal';
import { EmptyState } from '@/components/empty-state';
import {
  BreadcrumbBack,
  FineStatusBadge,
  PAYMENT_COLORS,
  PaymentStatusBadge,
} from '@/components/payment-ui';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import {
  createPaymentSession,
  openPaymentPage,
  subscribeFine,
  subscribeFinePayments,
} from '@/services/payment-service';
import type { FineDocument, PaymentDocument } from '@/types/finance';
import {
  formatPaymentType,
  formatRupiah,
  formatWibDate,
  formatWibDateTime,
} from '@/utils/payment-format';

interface SessionInfo {
  waktuMulai?: string;
  tanggal?: string;
  ruang?: string;
}

interface AttendanceInfo {
  waktuKehadiran?: string;
  labName?: string;
}

export default function PraktikanTagihanDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const fineId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, userDoc } = useAuth();
  const uid = userDoc?.uid || user?.uid;

  const [fine, setFine] = useState<FineDocument | null>(null);
  const [fineLoaded, setFineLoaded] = useState(false);
  const [payments, setPayments] = useState<PaymentDocument[]>([]);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [attendance, setAttendance] = useState<AttendanceInfo | null>(null);
  const [paying, setPaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!fineId) return;
    return subscribeFine(
      fineId,
      (data) => {
        setFine(data);
        setFineLoaded(true);
      },
      () => setFineLoaded(true)
    );
  }, [fineId]);

  useEffect(() => {
    if (!fineId || !uid) return;
    return subscribeFinePayments(uid, fineId, setPayments);
  }, [fineId, uid]);

  const sessionId = fine?.sessionId;
  const attendanceId = fine?.attendanceId;
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    getDoc(doc(db, 'sessions', sessionId))
      .then((snap) => {
        if (active && snap.exists()) setSession(snap.data() as SessionInfo);
      })
      .catch(() => {});
    if (attendanceId) {
      getDoc(doc(db, 'attendances', attendanceId))
        .then((snap) => {
          if (!active || !snap.exists()) return;
          const data = snap.data() as {
            waktuKehadiran?: string;
            locationSnapshot?: { labName?: string };
          };
          setAttendance({
            waktuKehadiran: data.waktuKehadiran,
            labName: data.locationSnapshot?.labName,
          });
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [sessionId, attendanceId]);

  const handlePay = useCallback(async () => {
    if (!fine) return;
    setPaying(true);
    try {
      const result = await createPaymentSession(fine.id);
      router.push({
        pathname: '/praktikan/pembayaran-hasil',
        params: { fineId: fine.id, paymentId: result.paymentId },
      } as unknown as Href);
      await openPaymentPage(result.redirectUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Pembayaran gagal diproses.');
    } finally {
      setPaying(false);
    }
  }, [fine]);

  if (!fineLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PAYMENT_COLORS.accent} />
      </View>
    );
  }

  if (!fine) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <BreadcrumbBack label="Kembali ke Tagihan" fallback={'/praktikan/tagihan' as Href} />
          <EmptyState
            title="Tagihan Tidak Ditemukan"
            message="Tagihan ini tidak ada atau bukan milik akun Anda."
            actionText="Kembali ke Tagihan"
            onAction={() => router.replace('/praktikan/tagihan' as Href)}
          />
        </View>
      </View>
    );
  }

  const canPay = fine.status === 'unpaid' || fine.status === 'pending';
  const actionLabel = fine.status === 'pending' ? 'Lanjutkan Pembayaran' : 'Bayar Sekarang';
  const scheduleStart = session?.tanggal
    ? `${session.tanggal}${session.waktuMulai ? `, ${session.waktuMulai} WIB` : ''}`
    : formatWibDate(fine.sessionDate);

  const rows: { label: string; value: string }[] = [
    { label: 'Praktikum', value: fine.praktikum },
    { label: 'Laboratorium', value: attendance?.labName || session?.ruang || '-' },
    { label: 'Jadwal Mulai', value: scheduleStart },
    { label: 'Toleransi', value: `${fine.graceMinutes} menit` },
    { label: 'Waktu Presensi', value: attendance?.waktuKehadiran || '-' },
    { label: 'Keterlambatan', value: `${fine.lateMinutes} menit` },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <BreadcrumbBack label="Kembali ke Tagihan" fallback={'/praktikan/tagihan' as Href} />

          <View style={styles.headerBlock}>
            <Text style={styles.title}>Rincian Tagihan Denda</Text>
            <Text style={styles.invoice}>{fine.invoiceNumber}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.amountRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.amountLabel}>Nominal Denda</Text>
                <Text style={styles.amount}>{formatRupiah(fine.amount)}</Text>
              </View>
              <FineStatusBadge status={fine.status} />
            </View>
            {fine.paidAt ? (
              <Text style={styles.paidAt}>Dibayar pada {formatWibDateTime(fine.paidAt)}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Rincian Sesi</Text>
            {rows.map((row) => (
              <View key={row.label} style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>Catatan</Text>
            <Text style={styles.noteText}>
              Pembayaran denda tidak mengubah status kehadiran. Setelah lunas, presensi Anda tetap
              tercatat sebagai terlambat.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Percobaan Pembayaran</Text>
            {payments.length === 0 ? (
              <Text style={styles.emptyAttempts}>Belum ada percobaan pembayaran untuk tagihan ini.</Text>
            ) : (
              payments.map((payment) => (
                <View key={payment.id} style={styles.attemptRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.attemptTitle}>Percobaan #{payment.attempt}</Text>
                    <Text style={styles.attemptMeta}>
                      {formatPaymentType(payment.paymentType)} • {formatWibDateTime(payment.createdAt)}
                    </Text>
                  </View>
                  <PaymentStatusBadge status={payment.status} />
                </View>
              ))
            )}
          </View>

          {canPay ? (
            <Pressable
              accessibilityRole="button"
              disabled={paying}
              onPress={() => void handlePay()}
              style={({ pressed }) => [
                styles.payButton,
                (pressed || paying) && styles.pressed,
              ]}>
              {paying ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.payButtonText}>{actionLabel} →</Text>
              )}
            </Pressable>
          ) : (
            <View style={styles.paidBox}>
              <Text style={styles.paidTitle}>Tagihan Lunas</Text>
              <Text style={styles.paidText}>Tidak ada pembayaran yang perlu dilakukan.</Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/praktikan/riwayat-pembayaran' as Href)}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>Lihat Riwayat Pembayaran →</Text>
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={errorMessage !== null}
        title="Pembayaran Gagal Diproses"
        description={errorMessage ?? ''}
        confirmText="Mengerti"
        confirmVariant="danger"
        onConfirm={() => setErrorMessage(null)}
        onCancel={() => setErrorMessage(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAYMENT_COLORS.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PAYMENT_COLORS.canvas },
  scroll: { paddingBottom: 100 },
  content: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 12,
    gap: 14,
  },
  headerBlock: { gap: 4 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: PAYMENT_COLORS.textPrimary },
  invoice: { fontSize: 12.5, fontWeight: '600', color: PAYMENT_COLORS.textMuted },
  card: {
    backgroundColor: PAYMENT_COLORS.surface,
    borderWidth: 1,
    borderColor: PAYMENT_COLORS.border,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    elevation: 1,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  amountLabel: { fontSize: 12, fontWeight: '600', color: PAYMENT_COLORS.textMuted },
  amount: { fontSize: 28, lineHeight: 34, fontWeight: '900', color: PAYMENT_COLORS.textPrimary },
  paidAt: { fontSize: 12.5, color: PAYMENT_COLORS.success.text, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: PAYMENT_COLORS.textPrimary },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: PAYMENT_COLORS.border,
  },
  rowLabel: { fontSize: 12.5, color: PAYMENT_COLORS.textMuted, fontWeight: '600', flexShrink: 0 },
  rowValue: { fontSize: 13, color: PAYMENT_COLORS.textSecondary, fontWeight: '700', flex: 1, textAlign: 'right' },
  noteBox: {
    backgroundColor: '#DBEAFE',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  noteTitle: { fontSize: 13, fontWeight: '800', color: '#1E40AF' },
  noteText: { fontSize: 12.5, lineHeight: 18, color: PAYMENT_COLORS.textSecondary },
  emptyAttempts: { fontSize: 12.5, color: PAYMENT_COLORS.textMuted },
  attemptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: PAYMENT_COLORS.border,
  },
  attemptTitle: { fontSize: 13.5, fontWeight: '800', color: PAYMENT_COLORS.textPrimary },
  attemptMeta: { fontSize: 11.5, color: PAYMENT_COLORS.textMuted },
  payButton: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: PAYMENT_COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  payButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  paidBox: {
    backgroundColor: PAYMENT_COLORS.success.bg,
    borderRadius: 14,
    padding: 14,
    gap: 2,
  },
  paidTitle: { fontSize: 14, fontWeight: '800', color: PAYMENT_COLORS.success.text },
  paidText: { fontSize: 12.5, color: PAYMENT_COLORS.textSecondary },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: PAYMENT_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { fontSize: 13.5, fontWeight: '700', color: PAYMENT_COLORS.textSecondary },
  pressed: { opacity: 0.85 },
});
