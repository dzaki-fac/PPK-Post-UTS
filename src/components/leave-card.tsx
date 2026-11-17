import React from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AICategoryBadge } from './ai-category-badge';
import { LeaveRequestDocument } from '@/services/leave-service';

export interface LeaveCardProps {
  request: LeaveRequestDocument;
  onApprove?: (request: LeaveRequestDocument) => void;
  onReject?: (request: LeaveRequestDocument) => void;
  isProcessing?: boolean;
}

export function LeaveCard({
  request,
  onApprove,
  onReject,
  isProcessing = false,
}: LeaveCardProps) {
  const isPending = request.status === 'menunggu';
  const isApproved = request.status === 'disetujui';
  const isRejected = request.status === 'ditolak';

  const avatarInitial = request.studentName
    ? request.studentName.charAt(0).toUpperCase()
    : 'M';

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <View style={styles.card}>
      {/* 1. Header: Avatar + Student Meta + Status */}
      <View style={styles.headerRow}>
        <View style={styles.studentInfoWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </View>
          <View style={styles.nameWrap}>
            <View style={styles.nameClassRow}>
              <Text style={styles.studentName} numberOfLines={1}>
                {request.studentName}
              </Text>
              <View style={styles.classChip}>
                <Text style={styles.classText}>{request.studentClass}</Text>
              </View>
            </View>
            <Text style={styles.studentNim}>NIM: {request.studentNim}</Text>
          </View>
        </View>

        {/* Status Badge */}
        <View
          style={[
            styles.statusPill,
            isPending && styles.statusPillPending,
            isApproved && styles.statusPillApproved,
            isRejected && styles.statusPillRejected,
          ]}>
          <Text
            style={[
              styles.statusText,
              isPending && { color: '#B45309' },
              isApproved && { color: '#15803D' },
              isRejected && { color: '#B91C1C' },
            ]}>
            {isPending && 'Menunggu Verifikasi'}
            {isApproved && 'Izin Disetujui'}
            {isRejected && 'Izin Ditolak'}
          </Text>
        </View>
      </View>

      {/* 2. Session Target Info */}
      <View style={styles.sessionBox}>
        <Text style={styles.sessionLabel}>SESI PRAKTIKUM BERHALANGAN</Text>
        <Text style={styles.sessionName}>{request.sessionName}</Text>
        <Text style={styles.sessionDate}>Diajukan: {formatDate(request.createdAt)} WIB</Text>
      </View>

      {/* 3. Reason Statement */}
      <View style={styles.reasonBox}>
        <Text style={styles.reasonLabel}>Alasan Tertulis Praktikan:</Text>
        <Text style={styles.reasonText}>{request.alasan}</Text>

        {request.lampiranUrl ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              if (request.lampiranUrl) {
                Linking.openURL(request.lampiranUrl).catch(() => {});
              }
            }}
            style={({ pressed }) => [styles.linkWrap, pressed && styles.pressed]}>
            <Text style={styles.linkText}>Lihat Berkas Lampiran / Surat Bukti →</Text>
          </Pressable>
        ) : null}
      </View>

      {/* 4. AI Decision Support Banner */}
      <View style={styles.aiBox}>
        <View style={styles.aiBoxHeader}>
          <Text style={styles.aiTitle}>Rekomendasi AI Pengajar (Model EDOM)</Text>
          <AICategoryBadge
            category={request.aiClassification.category}
            confidence={request.aiClassification.confidence}
            size="small"
          />
        </View>

        {request.aiClassification.rawSummary ? (
          <Text style={styles.aiSummary}>{request.aiClassification.rawSummary}</Text>
        ) : null}

        <View style={styles.aiMetaRow}>
          <Text style={styles.aiMetaTag}>
            Sentimen: {request.aiClassification.sentiment || 'netral'}
          </Text>
          <Text style={styles.aiMetaSeparator}>•</Text>
          <Text style={styles.aiMetaTag}>
            {request.aiClassification.isFallback ? 'Metode Cadangan' : 'Inferensi Lokal JS (Offline)'}
          </Text>
        </View>
      </View>

      {/* 5. Review Result (if already reviewed) */}
      {!isPending && (
        <View
          style={[
            styles.reviewResultBox,
            isApproved ? styles.reviewResultApproved : styles.reviewResultRejected,
          ]}>
          <Text
            style={[
              styles.reviewResultTitle,
              isApproved ? { color: '#15803D' } : { color: '#B91C1C' },
            ]}>
            Keputusan Asisten: {isApproved ? 'DISETUJUI' : 'DITOLAK'}
          </Text>
          {request.reviewerName ? (
            <Text style={styles.reviewResultSub}>
              Oleh: {request.reviewerName} • {formatDate(request.reviewedAt)} WIB
            </Text>
          ) : null}
          {request.reviewNotes ? (
            <Text style={styles.reviewResultNotes}>
              Catatan: {`"${request.reviewNotes}"`}
            </Text>
          ) : null}
        </View>
      )}

      {/* 6. Action Buttons for Assistant (Human in the loop) */}
      {isPending && onApprove && onReject && (
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tolak Permohonan Izin"
            disabled={isProcessing}
            onPress={() => onReject(request)}
            style={({ pressed }) => [
              styles.actionButton,
              styles.rejectButton,
              (pressed || isProcessing) && styles.pressed,
            ]}>
            <Text style={styles.rejectButtonText}>Tolak Izin</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Setujui Permohonan Izin"
            disabled={isProcessing}
            onPress={() => onApprove(request)}
            style={({ pressed }) => [
              styles.actionButton,
              styles.approveButton,
              (pressed || isProcessing) && styles.pressed,
            ]}>
            <Text style={styles.approveButtonText}>Setujui Izin</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    flexWrap: 'wrap',
  },
  studentInfoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 140,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  nameWrap: {
    flex: 1,
    gap: 2,
  },
  nameClassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  studentName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  classChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  classText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  studentNim: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusPillPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusPillApproved: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  statusPillRejected: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sessionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  sessionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  sessionName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  sessionDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  reasonBox: {
    borderLeftWidth: 3,
    borderLeftColor: '#0D9488',
    paddingLeft: 12,
    gap: 4,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#0F172A',
  },
  linkWrap: {
    marginTop: 4,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  aiBox: {
    backgroundColor: '#F0FDFA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#99F6E4',
    padding: 12,
    gap: 6,
  },
  aiBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  aiTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F766E',
  },
  aiSummary: {
    fontSize: 12,
    color: '#134E4A',
    lineHeight: 18,
  },
  aiMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  aiMetaTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0D9488',
  },
  aiMetaSeparator: {
    fontSize: 11,
    color: '#99F6E4',
  },
  reviewResultBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  reviewResultApproved: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  reviewResultRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  reviewResultTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  reviewResultSub: {
    fontSize: 11,
    color: '#64748B',
  },
  reviewResultNotes: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  approveButton: {
    backgroundColor: '#0D9488', // Academic Teal
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  rejectButton: {
    backgroundColor: '#DC2626', // Danger Red
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
