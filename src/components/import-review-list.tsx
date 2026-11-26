import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import type { ImportDraftCounts, ImportDraftFilter } from '@/hooks/use-import-draft';
import type { ImportRowItem, ImportRowStatus } from '@/types/praktikum';

const ASLAB_ACCENT = '#4F46E5';
const ASLAB_TINT = '#EEF2FF';
const ASLAB_BORDER = '#C7D2FE';

interface ImportReviewListProps<TData> {
  rows: ImportRowItem<TData>[];
  filteredRows: ImportRowItem<TData>[];
  counts: ImportDraftCounts;
  filter: ImportDraftFilter;
  onFilterChange: (next: ImportDraftFilter) => void;
  fileName: string | null;
  saving: boolean;
  onAcceptAllValid: () => void;
  onRejectAllErrors: () => void;
  extraBulkActions?: React.ReactNode;
  onToggleAccept: (rowNumber: number, accepted?: boolean) => void;
  onDuplicateRow: (rowNumber: number) => void;
  onDeleteRow: (rowNumber: number) => void;
  canAcceptItem: (item: ImportRowItem<TData>) => boolean;
  renderFields: (item: ImportRowItem<TData>) => React.ReactNode;
  renderRowExtra?: (item: ImportRowItem<TData>) => React.ReactNode;
  onCommit: () => void;
  commitLabelPrefix?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  headerTopContent?: React.ReactNode;
}

const STATUS_META: Record<
  ImportRowStatus,
  { label: string; bg: string; border: string; text: string }
> = {
  valid: { label: 'Valid', bg: '#DCFCE7', border: '#86EFAC', text: '#15803D' },
  needs_input: {
    label: 'Perlu Dilengkapi',
    bg: '#FEF3C7',
    border: '#FDE68A',
    text: '#B45309',
  },
  error: { label: 'Error', bg: '#FEE2E2', border: '#FCA5A5', text: '#B91C1C' },
  duplicate: { label: 'Duplikat', bg: '#FEE2E2', border: '#FCA5A5', text: '#B91C1C' },
  conflict: { label: 'Konflik Lab', bg: '#EEF2FF', border: '#C7D2FE', text: '#4338CA' },
};

export function ImportReviewList<TData>({
  rows,
  filteredRows,
  counts,
  filter,
  onFilterChange,
  fileName,
  saving,
  onAcceptAllValid,
  onRejectAllErrors,
  extraBulkActions,
  onToggleAccept,
  onDuplicateRow,
  onDeleteRow,
  canAcceptItem,
  renderFields,
  renderRowExtra,
  onCommit,
  commitLabelPrefix = 'Simpan',
  emptyTitle = 'Belum Ada Draf Impor',
  emptyMessage = 'Unggah file CSV/XLSX atau tambah baris secara manual untuk meninjau data sebelum disimpan ke Firestore.',
  headerTopContent,
}: ImportReviewListProps<TData>) {
  const filters: { key: ImportDraftFilter; label: string }[] = [
    { key: 'all', label: `Semua (${counts.total})` },
    { key: 'accepted', label: `Diterima (${counts.accepted})` },
    { key: 'valid', label: `Valid (${counts.valid})` },
    { key: 'needs_input', label: `Perlu Dilengkapi (${counts.needsInput})` },
    { key: 'error', label: `Error (${counts.error})` },
    { key: 'duplicate', label: `Duplikat (${counts.duplicate})` },
    ...(counts.conflict > 0
      ? [{ key: 'conflict' as ImportDraftFilter, label: `Konflik (${counts.conflict})` }]
      : []),
    { key: 'rejected', label: `Ditolak (${counts.rejected})` },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          {headerTopContent}

          {rows.length > 0 ? (
            <View style={styles.reviewControlsBox}>
              <View style={styles.fileMetaRow}>
                <Text style={styles.fileMetaText}>
                  {fileName ? `Sumber: ${fileName}` : 'Draf Impor Aktif'} ({counts.total} baris)
                </Text>
                <Text style={styles.fileMetaHint}>
                  {counts.accepted} diterima • {counts.rejected} ditolak
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}>
                {filters.map((f) => {
                  const active = filter === f.key;
                  return (
                    <Pressable
                      key={f.key}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => onFilterChange(f.key)}>
                      <Text
                        style={[
                          styles.filterChipText,
                          active && styles.filterChipTextActive,
                        ]}>
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.bulkActionRow}>
                <Pressable
                  style={({ pressed }) => [styles.bulkBtnIndigo, pressed && styles.pressed]}
                  onPress={onAcceptAllValid}>
                  <Text style={styles.bulkBtnIndigoText}>Terima Semua Valid</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.bulkBtnNeutral, pressed && styles.pressed]}
                  onPress={onRejectAllErrors}>
                  <Text style={styles.bulkBtnNeutralText}>Tolak Semua Error</Text>
                </Pressable>
                {extraBulkActions}
              </View>
            </View>
          ) : null}

          {rows.length === 0 ? (
            <EmptyState title={emptyTitle} message={emptyMessage} />
          ) : filteredRows.length === 0 ? (
            <EmptyState
              title="Tidak Ada Baris di Filter Ini"
              message="Ubah filter status di atas untuk melihat seluruh baris draf impor."
              actionText="Tampilkan Semua Baris"
              onAction={() => onFilterChange('all')}
            />
          ) : (
            <View style={styles.cardList}>
              {filteredRows.map((item) => {
                const badge = STATUS_META[item.status];
                const acceptable = canAcceptItem(item);

                return (
                  <View
                    key={`row-${item.rowNumber}`}
                    style={[
                      styles.rowCard,
                      !item.accepted && styles.rowCardRejected,
                      item.status === 'error' && styles.rowCardErrorBorder,
                    ]}>
                    <View style={styles.rowTopBar}>
                      <View style={styles.rowBadgesLeft}>
                        <View style={styles.rowNumChip}>
                          <Text style={styles.rowNumText}>Baris #{item.rowNumber}</Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: badge.bg, borderColor: badge.border },
                          ]}>
                          <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.decisionPill,
                          item.accepted ? styles.decisionAccepted : styles.decisionRejected,
                        ]}>
                        <Text
                          style={[
                            styles.decisionText,
                            item.accepted
                              ? styles.decisionAcceptedText
                              : styles.decisionRejectedText,
                          ]}>
                          {item.accepted ? 'DITERIMA' : 'DITOLAK'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.fieldsWrap}>{renderFields(item)}</View>

                    {item.errors.length > 0 ? (
                      <View style={styles.alertErrorBox}>
                        {item.errors.map((err, idx) => (
                          <Text key={`err-${idx}`} style={styles.alertErrorText}>
                            • {err}
                          </Text>
                        ))}
                      </View>
                    ) : null}

                    {item.warnings.length > 0 ? (
                      <View style={styles.alertWarnBox}>
                        {item.warnings.map((warn, idx) => (
                          <Text key={`warn-${idx}`} style={styles.alertWarnText}>
                            • {warn}
                          </Text>
                        ))}
                      </View>
                    ) : null}

                    {renderRowExtra ? renderRowExtra(item) : null}

                    <View style={styles.rowActionsBar}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.actionBtn,
                          item.accepted ? styles.actionBtnActiveGreen : styles.actionBtnOutline,
                          !acceptable && styles.actionBtnDisabled,
                          pressed && acceptable && styles.pressed,
                        ]}
                        disabled={!acceptable}
                        onPress={() => onToggleAccept(item.rowNumber, true)}>
                        <Text
                          style={[
                            styles.actionBtnText,
                            item.accepted && styles.actionBtnTextGreen,
                            !acceptable && styles.actionBtnTextDisabled,
                          ]}>
                          Terima
                        </Text>
                      </Pressable>

                      <Pressable
                        style={({ pressed }) => [
                          styles.actionBtn,
                          !item.accepted ? styles.actionBtnActiveRed : styles.actionBtnOutline,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => onToggleAccept(item.rowNumber, false)}>
                        <Text
                          style={[
                            styles.actionBtnText,
                            !item.accepted && styles.actionBtnTextRed,
                          ]}>
                          Tolak
                        </Text>
                      </Pressable>

                      <Pressable
                        style={({ pressed }) => [
                          styles.actionBtn,
                          styles.actionBtnOutline,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => onDuplicateRow(item.rowNumber)}>
                        <Text style={styles.actionBtnText}>Duplikasi</Text>
                      </Pressable>

                      <Pressable
                        style={({ pressed }) => [
                          styles.actionBtn,
                          styles.actionBtnDelete,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => onDeleteRow(item.rowNumber)}>
                        <Text style={styles.actionBtnDeleteText}>Hapus</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {rows.length > 0 ? (
        <View style={styles.stickyFooter}>
          <View style={styles.stickyInner}>
            <View style={styles.stickyInfo}>
              <Text style={styles.stickyTitle}>
                Siap disimpan: {counts.accepted} baris
              </Text>
              <Text style={styles.stickySub}>
                Ditolak / dilewati: {counts.rejected} baris
                {counts.error > 0 ? ` • ${counts.error} error tersisa` : ''}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.commitBtn,
                (counts.accepted === 0 || saving) && styles.commitBtnDisabled,
                pressed && counts.accepted > 0 && !saving && styles.pressed,
              ]}
              disabled={counts.accepted === 0 || saving}
              onPress={onCommit}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.commitBtnText}>
                  {commitLabelPrefix} {counts.accepted} Data
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'web' ? 140 : 110,
  },
  inner: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  reviewControlsBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  fileMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
  },
  fileMetaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  fileMetaHint: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  filterRow: {
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 36,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: ASLAB_TINT,
    borderColor: ASLAB_ACCENT,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: ASLAB_ACCENT,
    fontWeight: '700',
  },
  bulkActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bulkBtnIndigo: {
    backgroundColor: ASLAB_TINT,
    borderWidth: 1,
    borderColor: ASLAB_BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 40,
    justifyContent: 'center',
  },
  bulkBtnIndigoText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: ASLAB_ACCENT,
  },
  bulkBtnNeutral: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 40,
    justifyContent: 'center',
  },
  bulkBtnNeutralText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  cardList: {
    gap: 12,
  },
  rowCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  rowCardRejected: {
    backgroundColor: '#F8FAFC',
    opacity: 0.9,
  },
  rowCardErrorBorder: {
    borderColor: '#FCA5A5',
  },
  rowTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  rowBadgesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowNumChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rowNumText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#334155',
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  decisionPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  decisionAccepted: {
    backgroundColor: '#DCFCE7',
  },
  decisionRejected: {
    backgroundColor: '#FEE2E2',
  },
  decisionText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  decisionAcceptedText: {
    color: '#15803D',
  },
  decisionRejectedText: {
    color: '#B91C1C',
  },
  fieldsWrap: {
    gap: 8,
  },
  alertErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    gap: 3,
  },
  alertErrorText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
  },
  alertWarnBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    gap: 3,
  },
  alertWarnText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
  },
  rowActionsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
  },
  actionBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  actionBtnActiveGreen: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  actionBtnActiveRed: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  actionBtnDisabled: {
    opacity: 0.45,
  },
  actionBtnDelete: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  actionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  actionBtnTextGreen: {
    color: '#15803D',
  },
  actionBtnTextRed: {
    color: '#B91C1C',
  },
  actionBtnTextDisabled: {
    color: '#94A3B8',
  },
  actionBtnDeleteText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  pressed: {
    opacity: 0.85,
  },
  stickyFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'web' ? 84 : 14,
  },
  stickyInner: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stickyInfo: {
    flex: 1,
  },
  stickyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  stickySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  commitBtn: {
    backgroundColor: ASLAB_ACCENT,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commitBtnDisabled: {
    opacity: 0.45,
  },
  commitBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
