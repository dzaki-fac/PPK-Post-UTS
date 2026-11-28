import { router, type Href } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ImportReviewList } from '@/components/import-review-list';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useImportDraft } from '@/hooks/use-import-draft';
import { ensureDefaultCourse, subscribeManagedCourses } from '@/services/course-service';
import { pickAndParseSpreadsheet } from '@/services/import-parser';
import { downloadImportTemplate } from '@/services/import-template-service';
import { subscribeMembersByCourse } from '@/services/lab-member-service';
import { subscribeLabsByCourse } from '@/services/lab-service';
import {
  commitAsprakImportBatch,
  createEmptyAsprakDraftRow,
  parseAsprakSpreadsheetRows,
  validateAsprakImportRows,
  type AsprakImportDraftData,
} from '@/services/member-import-service';
import type {
  CourseDocument,
  ImportRowItem,
  LabLocationDocument,
  LabMemberDocument,
} from '@/types/praktikum';

export default function AslabImporAsprakScreen() {
  const { userDoc } = useAuth();
  const [courses, setCourses] = useState<CourseDocument[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [courseLabs, setCourseLabs] = useState<LabLocationDocument[]>([]);
  const [targetLabId, setTargetLabId] = useState('');
  const [existingMembers, setExistingMembers] = useState<LabMemberDocument[]>([]);
  const [saving, setSaving] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<'csv' | 'xlsx' | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!userDoc?.uid) return;
    void ensureDefaultCourse(userDoc.uid).catch(() => {});

    return subscribeManagedCourses(userDoc.uid, userDoc.managedCourseIds, (list) => {
      setCourses(list);
      setSelectedCourseId((prev) => prev || list[0]?.id || '');
    });
  }, [userDoc?.uid, userDoc?.managedCourseIds]);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? courses[0] ?? null,
    [courses, selectedCourseId]
  );

  useEffect(() => {
    if (!selectedCourse?.id) return;
    const unsubLabs = subscribeLabsByCourse(selectedCourse.id, (list) => {
      setCourseLabs(list);
      setTargetLabId((prev) => (list.some((l) => l.id === prev) ? prev : list[0]?.id ?? ''));
    });
    const unsubMembers = subscribeMembersByCourse(selectedCourse.id, (members) => {
      setExistingMembers(members);
    });
    return () => {
      unsubLabs();
      unsubMembers();
    };
  }, [selectedCourse?.id]);

  const targetLab = useMemo(
    () => courseLabs.find((l) => l.id === targetLabId) ?? courseLabs[0] ?? null,
    [courseLabs, targetLabId]
  );

  const revalidate = useCallback(
    (items: ImportRowItem<AsprakImportDraftData>[]) =>
      validateAsprakImportRows(items, {
        targetLab,
        courseLabs,
        existingMembers,
      }),
    [targetLab, courseLabs, existingMembers]
  );

  const draft = useImportDraft<AsprakImportDraftData>(revalidate);
  const { refreshValidation } = draft;

  useEffect(() => {
    if (draft.rows.length > 0) {
      refreshValidation();
    }
  }, [targetLab, courseLabs, existingMembers, draft.rows.length, refreshValidation]);

  const handleDownloadTemplate = async (format: 'csv' | 'xlsx') => {
    setBanner(null);
    setDownloadingFormat(format);
    try {
      const savedName = await downloadImportTemplate('asprak', format);
      setBanner({
        type: 'success',
        text: `Template ${savedName} siap. Kolom wajib: nama, email (nim & kode_lab opsional).`,
      });
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal mengunduh template asprak.',
      });
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleUploadFile = async () => {
    setBanner(null);
    try {
      const parsed = await pickAndParseSpreadsheet();
      if (!parsed) return;
      if (parsed.rows.length === 0) {
        setBanner({
          type: 'error',
          text: `Berkas "${parsed.fileName}" tidak berisi baris data asprak.`,
        });
        return;
      }
      draft.loadRows(parseAsprakSpreadsheetRows(parsed.rows), parsed.fileName);
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal membaca file asprak.',
      });
    }
  };

  const handleFillMissingKodeLab = () => {
    if (!targetLab) return;
    draft.fillAllMissing((item) => ({
      ...item.data,
      kodeLab: item.data.kodeLab.trim() || targetLab.kode,
    }));
  };

  const handleCommit = async () => {
    if (!selectedCourse || !userDoc?.uid) {
      setBanner({ type: 'error', text: 'Pilih mata kuliah terlebih dahulu.' });
      return;
    }
    setSaving(true);
    setBanner(null);
    try {
      const result = await commitAsprakImportBatch({
        rows: draft.rows,
        course: selectedCourse,
        targetLab,
        courseLabs,
        actorUid: userDoc.uid,
        fileName: draft.fileName,
      });

      if (result.failedRowNumbers.size > 0) {
        draft.retainFailedRows(result.savedRowNumbers, result.errorByRow);
        setBanner({
          type: 'error',
          text: `${result.savedRowNumbers.size} asprak tersimpan, ${result.failedRowNumbers.size} baris gagal.`,
        });
      } else {
        draft.clearDraft();
        setBanner({
          type: 'success',
          text: `${result.savedRowNumbers.size} asprak berhasil disimpan dan ditautkan ke daftar lab pengampu.`,
        });
      }
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan impor asprak.',
      });
    } finally {
      setSaving(false);
    }
  };

  const headerTopContent = (
    <View style={styles.headerWrap}>
      <Pressable
        style={({ pressed }) => [styles.backChip, pressed && styles.pressed]}
        onPress={() => router.replace('/aslab/anggota' as Href)}>
        <Text style={styles.backChipText}>← Kembali ke Anggota Lab</Text>
      </Pressable>

      <Text style={styles.title}>Impor Asprak</Text>
      <Text style={styles.subtitle}>
        Distribusikan Asprak ke satu atau beberapa laboratorium pengampu melalui alur terpisah dari praktikan.
      </Text>

      {banner ? (
        <View
          style={[
            styles.bannerBox,
            banner.type === 'success' ? styles.bannerSuccess : styles.bannerError,
          ]}>
          <Text
            style={[
              styles.bannerText,
              banner.type === 'success' ? styles.bannerSuccessText : styles.bannerErrorText,
            ]}>
            {banner.text}
          </Text>
        </View>
      ) : null}

      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>1. Mata Kuliah & Lab Tujuan</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {courses.map((c) => {
            const active = selectedCourse?.id === c.id;
            return (
              <Pressable
                key={c.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedCourseId(c.id)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {c.kode} - {c.nama}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.helperLabel}>Lab Tujuan Default (jika kolom kode_lab di berkas kosong):</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {courseLabs.map((lab) => {
            const active = targetLab?.id === lab.id;
            return (
              <Pressable
                key={lab.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setTargetLabId(lab.id)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {lab.kode} • {lab.nama}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={[styles.panelTitle, { marginTop: 4 }]}>2. Unggah atau Tambah Asprak</Text>
        <View style={styles.actionGrid}>
          <Pressable
            style={({ pressed }) => [styles.btnIndigo, pressed && styles.pressed]}
            onPress={handleUploadFile}>
            <Text style={styles.btnIndigoText}>Unggah CSV / XLSX</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btnNeutral, pressed && styles.pressed]}
            onPress={() => draft.appendRow(createEmptyAsprakDraftRow(targetLab?.kode ?? ''))}>
            <Text style={styles.btnNeutralText}>+ Tambah Satu Baris</Text>
          </Pressable>
        </View>

        <View style={styles.templateRow}>
          <Text style={styles.templateHint}>Template Asprak:</Text>
          <Pressable
            style={({ pressed }) => [styles.templateBtn, pressed && styles.pressed]}
            disabled={downloadingFormat !== null}
            onPress={() => void handleDownloadTemplate('csv')}>
            {downloadingFormat === 'csv' ? (
              <ActivityIndicator size="small" color={Colors.aslabAccent} />
            ) : (
              <Text style={styles.templateBtnText}>Unduh .CSV</Text>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.templateBtn, pressed && styles.pressed]}
            disabled={downloadingFormat !== null}
            onPress={() => void handleDownloadTemplate('xlsx')}>
            {downloadingFormat === 'xlsx' ? (
              <ActivityIndicator size="small" color={Colors.aslabAccent} />
            ) : (
              <Text style={styles.templateBtnText}>Unduh .XLSX</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <ImportReviewList<AsprakImportDraftData>
        rows={draft.rows}
        filteredRows={draft.filteredRows}
        counts={draft.counts}
        filter={draft.filter}
        onFilterChange={draft.setFilter}
        fileName={draft.fileName}
        saving={saving}
        onAcceptAllValid={draft.acceptAllValid}
        onRejectAllErrors={draft.rejectAllErrors}
        extraBulkActions={
          targetLab ? (
            <Pressable
              style={({ pressed }) => [styles.bulkDefaultBtn, pressed && styles.pressed]}
              onPress={handleFillMissingKodeLab}>
              <Text style={styles.bulkDefaultText}>Isi Kode Lab Kosong ({targetLab.kode})</Text>
            </Pressable>
          ) : null
        }
        onSetDecision={draft.setRowDecision}
        onDuplicateRow={draft.duplicateRow}
        onDeleteRow={draft.deleteRow}
        canAcceptItem={draft.canAcceptItem}
        onCommit={() => void handleCommit()}
        commitLabelPrefix="Simpan"
        headerTopContent={headerTopContent}
        emptyTitle="Belum Ada Draf Asprak"
        emptyMessage="Unduh template asprak (nama, email, nim, kode_lab), lengkapi datanya, lalu unggah berkas atau klik Tambah Satu Baris."
        renderFields={(item) => {
          const d = item.data;
          const missing = new Set(item.missingFields);

          return (
            <View style={styles.fieldGrid}>
              <View style={styles.rowTwo}>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Nama Lengkap *</Text>
                  <TextInput
                    style={[styles.input, missing.has('nama') && styles.inputMissing]}
                    value={d.nama}
                    onChangeText={(val) =>
                      draft.updateRow(item.rowNumber, (p) => ({ ...p, nama: val }))
                    }
                    placeholder="Dimas Wijaya"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Email Asprak *</Text>
                  <TextInput
                    style={[styles.input, missing.has('email') && styles.inputMissing]}
                    value={d.email}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onChangeText={(val) =>
                      draft.updateRow(item.rowNumber, (p) => ({ ...p, email: val }))
                    }
                    placeholder="asprak@students.undip.ac.id"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>NIM (Opsional)</Text>
                  <TextInput
                    style={styles.input}
                    value={d.nim}
                    keyboardType="numeric"
                    onChangeText={(val) =>
                      draft.updateRow(item.rowNumber, (p) => ({ ...p, nim: val }))
                    }
                    placeholder="24060121130011"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Kode Lab (Opsional)</Text>
                  <TextInput
                    style={[styles.input, missing.has('kodeLab') && styles.inputMissing]}
                    value={d.kodeLab}
                    autoCapitalize="characters"
                    onChangeText={(val) =>
                      draft.updateRow(item.rowNumber, (p) => ({
                        ...p,
                        kodeLab: val.toUpperCase(),
                      }))
                    }
                    placeholder={targetLab?.kode || 'PPK-LAB-1'}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  headerWrap: { gap: 10 },
  backChip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.aslabTint,
    borderWidth: 1,
    borderColor: Colors.aslabBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    justifyContent: 'center',
  },
  backChipText: { fontSize: 11.5, fontWeight: '700', color: Colors.aslabAccent },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.4 },
  subtitle: { fontSize: 13.5, color: '#64748B', lineHeight: 20 },
  bannerBox: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11 },
  bannerSuccess: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  bannerError: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  bannerText: { fontSize: 13, fontWeight: '600' },
  bannerSuccessText: { color: '#15803D' },
  bannerErrorText: { color: '#B91C1C' },
  panelCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  panelTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  helperLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  chipRow: { gap: 8 },
  chip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 34,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.aslabTint, borderColor: Colors.aslabAccent },
  chipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  chipTextActive: { color: Colors.aslabAccent, fontWeight: '700' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btnIndigo: {
    backgroundColor: Colors.aslabAccent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnIndigoText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  btnNeutral: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnNeutralText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  templateRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingTop: 2 },
  templateHint: { fontSize: 12.5, fontWeight: '600', color: '#64748B' },
  templateBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  templateBtnText: { fontSize: 12.5, fontWeight: '700', color: Colors.aslabAccent },
  bulkDefaultBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.aslabBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 44,
    justifyContent: 'center',
  },
  bulkDefaultText: { fontSize: 12.5, fontWeight: '700', color: Colors.aslabAccent },
  fieldGrid: { gap: 8 },
  fieldLabel: { fontSize: 11.5, fontWeight: '700', color: '#475569', marginBottom: 4 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 13.5,
    color: '#0F172A',
    minHeight: 44,
  },
  inputMissing: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  rowTwo: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flexOne: { flex: 1, minWidth: 140 },
  pressed: { opacity: 0.85 },
});
