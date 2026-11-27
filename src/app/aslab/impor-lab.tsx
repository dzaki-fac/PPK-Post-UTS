import { router, type Href } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ImportReviewList } from '@/components/import-review-list';
import {
  DEFAULT_FINE_AMOUNT,
  DEFAULT_GRACE_MINUTES,
  DEFAULT_RADIUS_METER,
} from '@/constants/praktikum-config';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useImportDraft } from '@/hooks/use-import-draft';
import { ensureDefaultCourse, subscribeManagedCourses } from '@/services/course-service';
import { pickAndParseSpreadsheet } from '@/services/import-parser';
import { downloadImportTemplate } from '@/services/import-template-service';
import {
  commitLabImportBatch,
  createEmptyLabDraftRow,
  generateQuickLabDrafts,
  parseLabSpreadsheetRows,
  validateLabImportRows,
  type LabImportDraftData,
} from '@/services/lab-import-service';
import { subscribeLabsByCourse } from '@/services/lab-service';
import type { CourseDocument, ImportRowItem, LabLocationDocument } from '@/types/praktikum';

export default function AslabImporLabScreen() {
  const { userDoc } = useAuth();
  const [courses, setCourses] = useState<CourseDocument[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [courseLabs, setCourseLabs] = useState<LabLocationDocument[]>([]);
  const [saving, setSaving] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<'csv' | 'xlsx' | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [generatorVisible, setGeneratorVisible] = useState(false);
  const [genCount, setGenCount] = useState('3');
  const [genNamaPrefix, setGenNamaPrefix] = useState('PPK Lab');
  const [genKodePrefix, setGenKodePrefix] = useState('PPK-LAB');
  const [genGedung, setGenGedung] = useState('Gedung E Lt. 2 FSM UNDIP');
  const [genLat, setGenLat] = useState('-7.049120');
  const [genLng, setGenLng] = useState('110.440820');
  const [genRadius, setGenRadius] = useState(String(DEFAULT_RADIUS_METER));
  const [genGrace, setGenGrace] = useState(String(DEFAULT_GRACE_MINUTES));
  const [genFine, setGenFine] = useState(String(DEFAULT_FINE_AMOUNT));
  const [genCapacity, setGenCapacity] = useState('36');

  useEffect(() => {
    if (!userDoc?.uid) return;
    void ensureDefaultCourse(userDoc.uid).catch(() => {});

    const unsub = subscribeManagedCourses(userDoc.uid, userDoc.managedCourseIds, (list) => {
      setCourses(list);
      setSelectedCourseId((prev) => prev || list[0]?.id || '');
    });
    return unsub;
  }, [userDoc?.uid, userDoc?.managedCourseIds]);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? courses[0] ?? null,
    [courses, selectedCourseId]
  );

  useEffect(() => {
    if (!selectedCourse?.id) return;
    return subscribeLabsByCourse(selectedCourse.id, (list) => setCourseLabs(list));
  }, [selectedCourse?.id]);

  const revalidate = useCallback(
    (items: ImportRowItem<LabImportDraftData>[]) =>
      validateLabImportRows(items, courseLabs),
    [courseLabs]
  );

  const draft = useImportDraft<LabImportDraftData>(revalidate);
  const { refreshValidation } = draft;

  useEffect(() => {
    if (draft.rows.length > 0) {
      refreshValidation();
    }
  }, [courseLabs, draft.rows.length, refreshValidation]);

  const handleDownloadTemplate = async (format: 'csv' | 'xlsx') => {
    setBanner(null);
    setDownloadingFormat(format);
    try {
      const savedName = await downloadImportTemplate('lab', format);
      setBanner({
        type: 'success',
        text: `Template ${savedName} siap. Lengkapi lalu unggah kembali di halaman ini.`,
      });
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal mengunduh template.',
      });
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleUploadFile = async () => {
    setBanner(null);
    if (!selectedCourse) {
      setBanner({ type: 'error', text: 'Pilih satu mata kuliah terlebih dahulu.' });
      return;
    }
    try {
      const parsed = await pickAndParseSpreadsheet();
      if (!parsed) return;
      if (parsed.rows.length === 0) {
        setBanner({
          type: 'error',
          text: `Berkas "${parsed.fileName}" tidak berisi baris data laboratorium.`,
        });
        return;
      }
      draft.loadRows(parseLabSpreadsheetRows(parsed.rows), parsed.fileName);
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal membaca berkas CSV/XLSX.',
      });
    }
  };

  const handleGenerateLabs = () => {
    setBanner(null);
    if (!selectedCourse) {
      setBanner({ type: 'error', text: 'Pilih satu mata kuliah terlebih dahulu.' });
      return;
    }
    const entries = generateQuickLabDrafts({
      count: Number(genCount) || 1,
      namaPrefix: genNamaPrefix,
      kodePrefix: genKodePrefix,
      gedung: genGedung,
      latitude: Number(genLat.replace(',', '.')) || -7.04912,
      longitude: Number(genLng.replace(',', '.')) || 110.44082,
      radiusMeter: Number(genRadius) || DEFAULT_RADIUS_METER,
      graceMinutes: Number(genGrace) || DEFAULT_GRACE_MINUTES,
      fineAmount: Number(genFine.replace(/[.\s]/g, '')) || DEFAULT_FINE_AMOUNT,
      kapasitas: Number(genCapacity) || undefined,
    });
    draft.loadRows(entries, `Generator ${entries.length} Lab`);
    setGeneratorVisible(false);
  };

  const handleFillEmptyDefaults = () => {
    draft.fillAllMissing((item) => ({
      ...item.data,
      gedung: item.data.gedung.trim() || 'Gedung E FSM UNDIP',
      latitudeText: item.data.latitudeText.trim() || '-7.049120',
      longitudeText: item.data.longitudeText.trim() || '110.440820',
      radiusText: item.data.radiusText.trim() || String(DEFAULT_RADIUS_METER),
      graceText: item.data.graceText.trim() || String(DEFAULT_GRACE_MINUTES),
      fineText: item.data.fineText.trim() || String(DEFAULT_FINE_AMOUNT),
    }));
  };

  const handleCommit = async () => {
    if (!selectedCourse || !userDoc?.uid) {
      setBanner({ type: 'error', text: 'Pilih satu mata kuliah terlebih dahulu.' });
      return;
    }
    setSaving(true);
    setBanner(null);
    try {
      const result = await commitLabImportBatch({
        rows: draft.rows,
        course: selectedCourse,
        actorUid: userDoc.uid,
        fileName: draft.fileName,
      });

      if (result.failedRowNumbers.size > 0) {
        draft.retainFailedRows(result.savedRowNumbers, result.errorByRow);
        setBanner({
          type: 'error',
          text: `${result.savedRowNumbers.size} lab tersimpan, ${result.failedRowNumbers.size} baris gagal. Baris gagal tetap dipertahankan untuk dicoba ulang.`,
        });
      } else {
        draft.clearDraft();
        setBanner({
          type: 'success',
          text: `${result.savedRowNumbers.size} laboratorium berhasil disimpan untuk ${selectedCourse.nama}.`,
        });
      }
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan impor laboratorium.',
      });
    } finally {
      setSaving(false);
    }
  };

  const headerTopContent = (
    <View style={styles.headerWrap}>
      <Pressable
        style={({ pressed }) => [styles.backChip, pressed && styles.pressed]}
        onPress={() => router.replace('/aslab/laboratorium' as Href)}>
        <Text style={styles.backChipText}>← Kembali ke Manajemen Lab</Text>
      </Pressable>

      <Text style={styles.title}>Impor Laboratorium</Text>
      <Text style={styles.subtitle}>
        Pilih satu mata kuliah lalu gunakan Generator Cepat N Lab, unggah template CSV/XLSX, atau tambah satu baris manual.
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
        <Text style={styles.panelTitle}>1. Mata Kuliah Tujuan (Wajib Satu Mata Kuliah)</Text>
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

        <Text style={[styles.panelTitle, { marginTop: 4 }]}>2. Sumber Data Laboratorium</Text>
        <View style={styles.actionGrid}>
          <Pressable
            style={({ pressed }) => [styles.btnIndigo, pressed && styles.pressed]}
            onPress={() => setGeneratorVisible(true)}>
            <Text style={styles.btnIndigoText}>Generator Cepat N Lab</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btnIndigoOutline, pressed && styles.pressed]}
            onPress={handleUploadFile}>
            <Text style={styles.btnIndigoOutlineText}>Unggah CSV / XLSX</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btnNeutral, pressed && styles.pressed]}
            onPress={() => draft.appendRow(createEmptyLabDraftRow())}>
            <Text style={styles.btnNeutralText}>+ Tambah Satu Baris</Text>
          </Pressable>
        </View>

        <View style={styles.templateRow}>
          <Text style={styles.templateHint}>Unduh Template Lab:</Text>
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
      <ImportReviewList<LabImportDraftData>
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
          <Pressable
            style={({ pressed }) => [styles.bulkDefaultBtn, pressed && styles.pressed]}
            onPress={handleFillEmptyDefaults}>
            <Text style={styles.bulkDefaultText}>Isi Kolom Kosong Default</Text>
          </Pressable>
        }
        onSetDecision={draft.setRowDecision}
        onDuplicateRow={draft.duplicateRow}
        onDeleteRow={draft.deleteRow}
        canAcceptItem={draft.canAcceptItem}
        onCommit={() => void handleCommit()}
        commitLabelPrefix="Simpan"
        headerTopContent={headerTopContent}
        emptyTitle="Belum Ada Draf Laboratorium"
        emptyMessage="Gunakan Generator Cepat N Lab, unggah file CSV/XLSX dari template, atau klik Tambah Satu Baris."
        renderFields={(item) => {
          const d = item.data;
          const missing = new Set(item.missingFields);

          return (
            <View style={styles.fieldGrid}>
              <View style={styles.rowTwo}>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Nama Lab *</Text>
                  <TextInput
                    style={[styles.input, missing.has('nama') && styles.inputMissing]}
                    value={d.nama}
                    onChangeText={(val) =>
                      draft.updateRow(item.rowNumber, (p) => ({ ...p, nama: val }))
                    }
                    placeholder="Lab Komputasi 1"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Kode Lab *</Text>
                  <TextInput
                    style={[styles.input, missing.has('kode') && styles.inputMissing]}
                    value={d.kode}
                    autoCapitalize="characters"
                    onChangeText={(val) =>
                      draft.updateRow(item.rowNumber, (p) => ({
                        ...p,
                        kode: val.toUpperCase(),
                      }))
                    }
                    placeholder="PPK-LAB-1"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Gedung *</Text>
                  <TextInput
                    style={[styles.input, missing.has('gedung') && styles.inputMissing]}
                    value={d.gedung}
                    onChangeText={(val) =>
                      draft.updateRow(item.rowNumber, (p) => ({ ...p, gedung: val }))
                    }
                    placeholder="Gedung E Lt. 2"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={{ width: 96 }}>
                  <Text style={styles.fieldLabel}>Kapasitas</Text>
                  <TextInput
                    style={styles.input}
                    value={d.kapasitasText}
                    keyboardType="numeric"
                    onChangeText={(val) =>
                      draft.updateRow(item.rowNumber, (p) => ({ ...p, kapasitasText: val }))
                    }
                    placeholder="36"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Latitude *</Text>
                  <TextInput
                    style={[styles.input, missing.has('latitude') && styles.inputMissing]}
                    value={d.latitudeText}
                    onChangeText={(val) =>
                      draft.updateRow(item.rowNumber, (p) => ({ ...p, latitudeText: val }))
                    }
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Longitude *</Text>
                  <TextInput
                    style={[styles.input, missing.has('longitude') && styles.inputMissing]}
                    value={d.longitudeText}
                    onChangeText={(val) =>
                      draft.updateRow(item.rowNumber, (p) => ({ ...p, longitudeText: val }))
                    }
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>

              <View style={styles.rowThree}>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Radius (m) *</Text>
                  <TextInput
                    style={[styles.input, missing.has('radius') && styles.inputMissing]}
                    value={d.radiusText}
                    keyboardType="numeric"
                    onChangeText={(val) =>
                      draft.updateRow(item.rowNumber, (p) => ({ ...p, radiusText: val }))
                    }
                  />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Toleransi (mnt) *</Text>
                  <TextInput
                    style={[styles.input, missing.has('grace') && styles.inputMissing]}
                    value={d.graceText}
                    keyboardType="numeric"
                    onChangeText={(val) =>
                      draft.updateRow(item.rowNumber, (p) => ({ ...p, graceText: val }))
                    }
                  />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Denda (Rp) *</Text>
                  <TextInput
                    style={[styles.input, missing.has('fine') && styles.inputMissing]}
                    value={d.fineText}
                    keyboardType="numeric"
                    onChangeText={(val) =>
                      draft.updateRow(item.rowNumber, (p) => ({ ...p, fineText: val }))
                    }
                  />
                </View>
              </View>
            </View>
          );
        }}
      />

      <Modal
        visible={generatorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGeneratorVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generator Cepat Laboratorium</Text>
              <Pressable onPress={() => setGeneratorVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeText}>Tutup</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.rowTwo}>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Jumlah Lab (1-50)</Text>
                  <TextInput
                    style={styles.input}
                    value={genCount}
                    onChangeText={setGenCount}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Kapasitas per Lab</Text>
                  <TextInput
                    style={styles.input}
                    value={genCapacity}
                    onChangeText={setGenCapacity}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Awalan Nama Lab</Text>
                  <TextInput style={styles.input} value={genNamaPrefix} onChangeText={setGenNamaPrefix} />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Awalan Kode Lab</Text>
                  <TextInput
                    style={styles.input}
                    value={genKodePrefix}
                    autoCapitalize="characters"
                    onChangeText={setGenKodePrefix}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.fieldLabel}>Gedung Default</Text>
                <TextInput style={styles.input} value={genGedung} onChangeText={setGenGedung} />
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Latitude Dasar</Text>
                  <TextInput style={styles.input} value={genLat} onChangeText={setGenLat} />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Longitude Dasar</Text>
                  <TextInput style={styles.input} value={genLng} onChangeText={setGenLng} />
                </View>
              </View>

              <View style={styles.rowThree}>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Radius (m)</Text>
                  <TextInput
                    style={styles.input}
                    value={genRadius}
                    onChangeText={setGenRadius}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Toleransi (mnt)</Text>
                  <TextInput
                    style={styles.input}
                    value={genGrace}
                    onChangeText={setGenGrace}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.fieldLabel}>Denda (Rp)</Text>
                  <TextInput
                    style={styles.input}
                    value={genFine}
                    onChangeText={setGenFine}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.btnNeutral, styles.flexOne]}
                onPress={() => setGeneratorVisible(false)}>
                <Text style={styles.btnNeutralText}>Batal</Text>
              </Pressable>
              <Pressable
                style={[styles.btnIndigo, styles.flexOne]}
                onPress={handleGenerateLabs}>
                <Text style={styles.btnIndigoText}>Buat Draf Lab</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  chipRow: { gap: 8 },
  chip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.aslabTint, borderColor: Colors.aslabAccent },
  chipText: { fontSize: 12.5, fontWeight: '600', color: '#475569' },
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
  btnIndigoOutline: {
    backgroundColor: Colors.aslabTint,
    borderWidth: 1,
    borderColor: Colors.aslabBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnIndigoOutlineText: { fontSize: 13, fontWeight: '700', color: Colors.aslabAccent },
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
  rowTwo: { flexDirection: 'row', gap: 8 },
  rowThree: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flexOne: { flex: 1, minWidth: 105 },
  pressed: { opacity: 0.85 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 560,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: { fontSize: 16.5, fontWeight: '800', color: '#0F172A' },
  closeBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  closeText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  modalBody: { padding: 18, gap: 10 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
});
