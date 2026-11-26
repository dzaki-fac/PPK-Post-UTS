import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { subscribeLabs } from '@/services/lab-service';
import {
  createPaymentTransaction,
  subscribeFineById,
  subscribePaymentsByFineId,
} from '@/services/payment-service';
import { subscribeSessions } from '@/services/session-service';
import { db } from '@/lib/firebase';
import {
  FineDocument,
  LabLocationDocument,
  PaymentDocument,
  SessionDocument,
} from '@/types/praktikum';
import { formatRupiah } from '@/utils/format';
import { formatWib } from '@/utils/wib';
import { doc, onSnapshot } from 'firebase/firestore';

export default function PraktikanTagihanDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const fineId = Array.isArray(params.id) ? params.id[0] : params.id || '';

  const [fine, setFine] = useState<FineDocument | null>(null);
  const [payments, setPayments] = useState<PaymentDocument[]>([]);
  const [sessions, setSessions] = useState<SessionDocument[]>([]);
  const [labs, setLabs] = useState<LabLocationDocument[]>([]);
  const [checkedInWaktu, setCheckedInWaktu] = useState<string>('');
  const [loading, setLoading] = useState(Boolean(fineId));
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!fineId) return;

    const unsubFine = subscribeFineById(
      fineId,
      (item) => {
        setFine(item);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        setErrorMessage(err.message || 'Gagal memuat detail tagihan.');
      }
    );

    const unsubPayments = subscribePaymentsByFineId(fineId, (items) => {
      setPayments(items);
    });

    const unsubSessions = subscribeSessions((items) => {
      setSessions(items);
    });

    const unsubLabs = subscribeLabs((items) => {
      setLabs(items);
    });

    return () => {
      unsubFine();
      unsubPayments();
      unsubSessions();
      unsubLabs();
    };
  }, [fineId]);

  const attendanceId = fine?.attendanceId || fineId;
  useEffect(() => {
    if (!attendanceId) return;
    return onSnapshot(
      doc(db, 'attendances', attendanceId),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as Record<string, unknown>;
        if (typeof data.waktuKehadiran === 'string') {
          setCheckedInWaktu(data.waktuKehadiran);
        }
      },
      () => {}
    );
  }, [attendanceId]);

  const fineSessionId = fine?.sessionId;
  const relatedSession = useMemo(() => {
    if (!fineSessionId) return undefined;
    return sessions.find((s) => s.id === fineSessionId);
  }, [sessions, fineSessionId]);

  const fineLabId = fine?.labId || relatedSession?.labId;
  const relatedLab = useMemo(() => {
    if (!fineLabId) return undefined;
    return labs.find((l) => l.id === fineLabId);
  }, [labs, fineLabId]);

  const handlePayNow = async () => {
    if (!fine || fine.status === 'paid' || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await createPaymentTransaction(fine.id);

      if (Platform.OS === 'web') {
        await Linking.openURL(response.redirectUrl);
      } else {
        await WebBrowser.openBrowserAsync(response.redirectUrl);
      }

      router.push(
        `/praktikan/pembayaran-hasil?fineId=${encodeURIComponent(
          fine.id
        )}&paymentId=${encodeURIComponent(response.paymentId)}` as Href
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Gagal memulai pembayaran melalui Midtrans.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#EA580C" />
        <Text style={styles.loadingText}>Memuat rincian tagihan...</Text>
      </View>
    );
  }

  if (!fine) {
    return (
      <View style={styles.page}>
        <View style={styles.container}>
          <EmptyState
            title="Tagihan Tidak Ditemukan"
            message="Data tagihan denda tidak ditemukan atau bukan milik akun Anda."
            actionText="Kembali ke Daftar Tagihan"
            onAction={() => router.replace('/praktikan/tagihan' as Href)}
          />
        </View>
      </View>
    );
  }

  const isPaid = fine.status === 'paid';
  const isPending = fine.status === 'pending';

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View style={styles.topActionsRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/praktikan/tagihan' as Href)}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Text style={styles.backBtnText}>← Semua Tagihan</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/praktikan/riwayat-pembayaran' as Href)}
          style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}>
          <Text style={styles.linkBtnText}>Riwayat Pembayaran</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.eyebrow}>{fine.invoiceNumber}</Text>
            <Text style={styles.title}>{fine.praktikum}</Text>
            <Text style={styles.subtitle}>
              {relatedSession
                ? `${relatedSession.kelas} • ${relatedSession.materi}`
                : `Sesi tanggal ${fine.sessionDate || '-'}`}
            </Text>
          </View>
          <StatusBadge status={fine.status} />
        </View>

        <View style={styles.amountBanner}>
          <Text style={styles.amountLabel}>Nominal Tagihan Denda</Text>
          <Text style={styles.amountValue}>{formatRupiah(fine.amount)}</Text>
        </View>

        <View style={styles.detailGrid}>
          <DetailRow label="Nama Praktikan" value={fine.studentName} />
          <DetailRow label="NIM" value={fine.studentNim || '-'} />
          <DetailRow
            label="Laboratorium"
            value={
              relatedLab
                ? `${relatedLab.nama} (${relatedLab.gedung})`
                : relatedSession?.ruang || fine.labId || '-'
            }
          />
          <DetailRow label="Tanggal Sesi" value={fine.sessionDate || '-'} />
          <DetailRow
            label="Jam Jadwal"
            value={
              relatedSession
                ? `${relatedSession.waktuMulai} - ${relatedSession.waktuSelesai} WIB`
                : '-'
            }
          />
          <DetailRow label="Waktu Presensi" value={checkedInWaktu || '-'} />
          <DetailRow label="Keterlambatan" value={`${fine.lateMinutes} menit`} />
          <DetailRow label="Toleransi Terlambat" value={`${fine.graceMinutes} menit`} />
          <DetailRow label="Percobaan Bayar" value={`${fine.paymentAttempts} kali`} />
          <DetailRow label="Diterbitkan Pada" value={formatWib(fine.createdAt)} />
          {fine.paidAt ? (
            <DetailRow label="Dilunasi Pada" value={formatWib(fine.paidAt)} />
          ) : null}
        </View>

        <View style={styles.infoNote}>
          <Text style={styles.infoNoteTitle}>Catatan Status Kehadiran</Text>
          <Text style={styles.infoNoteText}>
            Pelunasan denda hanya menyelesaikan kewajiban administrasi keterlambatan dan
            tidak mengubah status kehadiran Anda (tetap tercatat sebagai Terlambat).
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {!isPaid ? (
          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={handlePayNow}
            style={({ pressed }) => [
              styles.payButton,
              submitting && styles.disabledBtn,
              pressed && styles.pressed,
            ]}>
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.payButtonText}>
                {isPending ? 'Lanjutkan Pembayaran' : 'Bayar Sekarang'}
              </Text>
            )}
          </Pressable>
        ) : (
          <View style={styles.paidBanner}>
            <Text style={styles.paidBannerTitle}>Tagihan Telah Lunas</Text>
            <Text style={styles.paidBannerText}>
              Pembayaran denda ini telah diverifikasi oleh server dan Midtrans.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Riwayat Percobaan Pembayaran</Text>
        {payments.length === 0 ? (
          <Text style={styles.emptyAttemptText}>
            Belum ada transaksi pembayaran yang dibuat untuk tagihan ini.
          </Text>
        ) : (
          <View style={styles.attemptsList}>
            {payments.map((payment) => (
              <Pressable
                key={payment.id}
                accessibilityRole="button"
                onPress={() =>
                  router.push(
                    `/praktikan/pembayaran-hasil?fineId=${encodeURIComponent(
                      fine.id
                    )}&paymentId=${encodeURIComponent(payment.id)}` as Href
                  )
                }
                style={({ pressed }) => [styles.attemptItem, pressed && styles.pressed]}>
                <View style={styles.attemptTop}>
                  <Text style={styles.attemptTitle}>
                    Percobaan #{payment.attempt} • {payment.id}
                  </Text>
                  <StatusBadge status={payment.status} size="small" />
                </View>
                <Text style={styles.attemptMeta}>
                  Nominal: {formatRupiah(payment.amount)} • Dibuat:{' '}
                  {formatWib(payment.createdAt)}
                </Text>
                {payment.paymentType ? (
                  <Text style={styles.attemptMeta}>
                    Metode: {payment.paymentType.toUpperCase()}
                  </Text>
                ) : null}
                {payment.failureReason ? (
                  <Text style={styles.attemptError}>
                    Alasan: {payment.failureReason}
                  </Text>
                ) : null}
                <Text style={styles.attemptLink}>Pantau Status Transaksi →</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 14,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  linkBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    justifyContent: 'center',
  },
  linkBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C2410C',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EA580C',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
  },
  amountBanner: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    padding: 16,
    gap: 4,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A3412',
  },
  amountValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#EA580C',
  },
  detailGrid: {
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
    flex: 1.2,
    textAlign: 'right',
  },
  infoNote: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  infoNoteTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  infoNoteText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '600',
  },
  payButton: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  disabledBtn: {
    opacity: 0.65,
  },
  payButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  paidBanner: {
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
    padding: 14,
    gap: 4,
  },
  paidBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
  },
  paidBannerText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyAttemptText: {
    fontSize: 13,
    color: '#64748B',
  },
  attemptsList: {
    gap: 10,
  },
  attemptItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 14,
    gap: 5,
  },
  attemptTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  attemptTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  attemptMeta: {
    fontSize: 12,
    color: '#475569',
  },
  attemptError: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
  },
  attemptLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
    marginTop: 4,
  },
  pressed: {
    opacity: 0.85,
  },
});
