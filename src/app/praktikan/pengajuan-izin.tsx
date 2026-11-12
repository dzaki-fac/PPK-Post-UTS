import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AICategoryBadge } from '@/components/ai-category-badge';
import { useAuth } from '@/context/auth-context';
import { usePraktikum } from '@/context/praktikum-context';
import { AIAnalysisResult, analyzeLeaveReason } from '@/services/ai-service';
import {
  checkExistingLeaveRequest,
  createLeaveRequest,
} from '@/services/leave-service';
import { subscribeSessions } from '@/services/session-service';
import { SessionDocument } from '@/types/praktikum';

export default function PengajuanIzinScreen() {
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const { userDoc } = useAuth();
  const { currentPraktikan, sesiList: dummySesiList } = usePraktikum();
  const [firestoreSessions, setFirestoreSessions] = useState<SessionDocument[]>([]);

  useEffect(() => {
    const unsub = subscribeSessions((items) => {
      if (items && items.length > 0) {
        setFirestoreSessions(items);
      }
    });
    return () => unsub();
  }, []);

  const sesiList = firestoreSessions.length > 0 ? firestoreSessions : dummySesiList;
  const currentStudent = useMemo(() => {
    if (userDoc) {
      return {
        id: userDoc.uid,
        nama: userDoc.nama,
        nim: userDoc.nim || '24060122130000',
        kelas: (userDoc.kelas || 'A') as 'A' | 'B',
      };
    }
    return currentPraktikan;
  }, [userDoc, currentPraktikan]);

  // State Form
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    params.sessionId || ''
  );
  const [alasan, setAlasan] = useState<string>('');
  const [lampiranUrl, setLampiranUrl] = useState<string>('');

  // State Analisis AI Real-Time
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // State Status Pengajuan
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDuplicate, setIsDuplicate] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State Modal Sukses
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // Sesi yang relevan untuk kelas praktikan
  const availableSessions = useMemo(() => {
    if (!currentStudent) return sesiList;
    const kodeKelas = currentStudent.kelas.toUpperCase();
    return sesiList.filter(
      (s) =>
        s.kelas.toUpperCase().includes(kodeKelas) ||
        s.kelas.includes(currentStudent.kelas)
    );
  }, [sesiList, currentStudent]);

  // ID sesi aktif (pilihan pengguna atau opsi pertama yang tersedia)
  const activeSessionId =
    selectedSessionId || (availableSessions.length > 0 ? availableSessions[0].id : '');

  // Cek duplikasi izin saat sesi berubah
  useEffect(() => {
    if (!activeSessionId || !currentStudent) return;

    let isMounted = true;

    (async () => {
      try {
        const exists = await checkExistingLeaveRequest(
          activeSessionId,
          currentStudent.id
        );
        if (isMounted) {
          setIsDuplicate(exists);
        }
      } catch {
        if (isMounted) {
          setIsDuplicate(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [activeSessionId, currentStudent]);

  // Inferensi AI on-device saat teks alasan berubah
  useEffect(() => {
    const text = alasan.trim();
    let isMounted = true;

    const timer = setTimeout(async () => {
      if (text.length >= 5) {
        setIsAnalyzing(true);
        try {
          const result = await analyzeLeaveReason(text);
          if (isMounted) {
            setAiResult(result);
            setIsAnalyzing(false);
          }
        } catch {
          if (isMounted) {
            setIsAnalyzing(false);
          }
        }
      } else {
        if (isMounted) {
          setAiResult(null);
          setIsAnalyzing(false);
        }
      }
    }, 150); // Debounce halus, eksekusi < 20ms

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [alasan]);

  const selectedSession = useMemo(
    () => sesiList.find((s) => s.id === activeSessionId),
    [sesiList, activeSessionId]
  );

  const isFormValid =
    alasan.trim().length >= 10 &&
    Boolean(activeSessionId) &&
    !isDuplicate &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!isFormValid || !currentStudent || !selectedSession) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await createLeaveRequest({
        sessionId: selectedSession.id,
        sessionName: `${selectedSession.praktikum} - ${selectedSession.materi}`,
        studentId: currentStudent.id,
        studentName: currentStudent.nama,
        studentNim: currentStudent.nim,
        studentClass: currentStudent.kelas,
        alasan: alasan.trim(),
        lampiranUrl: lampiranUrl.trim() || undefined,
      });

      setIsSubmitting(false);
      setShowSuccessModal(true);
    } catch (err: unknown) {
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : 'Gagal mengirim pengajuan izin.';
      setErrorMessage(msg);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* 1. Breadcrumb Navigasi Sesuai DESIGN.md */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali ke Jadwal Praktikum"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/praktikan/jadwal');
              }
            }}
            style={({ pressed }) => [styles.breadcrumbPill, pressed && styles.pressed]}>
            <Text style={styles.breadcrumbText}>← Kembali ke Jadwal Praktikum</Text>
          </Pressable>

          {/* 2. Header Layar */}
          <View style={styles.header}>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowBadge}>
                <Text style={styles.eyebrowText}>PORTAL MAHASISWA</Text>
              </View>
              <View style={styles.aiTag}>
                <View style={styles.aiDot} />
                <Text style={styles.aiTagText}>Model EDOM On-Device</Text>
              </View>
            </View>

            <Text style={styles.title}>Pengajuan Izin Praktikum</Text>
            <Text style={styles.subtitle}>
              Ajukan permohonan ketidakhadiran praktikum. Sistem AI akan menganalisis alasan Anda
              secara instan untuk membantu asisten memverifikasi izin.
            </Text>
          </View>

          {/* 3. Kartu Identitas Praktikan */}
          <View style={styles.identityCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {currentStudent?.nama?.charAt(0).toUpperCase() || 'M'}
              </Text>
            </View>
            <View style={styles.identityMeta}>
              <View style={styles.identityNameRow}>
                <Text style={styles.identityName}>{currentStudent?.nama || '-'}</Text>
                <View style={styles.classChip}>
                  <Text style={styles.classText}>Kelas {currentStudent?.kelas || '-'}</Text>
                </View>
              </View>
              <Text style={styles.identityNim}>NIM: {currentStudent?.nim || '-'}</Text>
            </View>
          </View>

          {/* 4. Formulir Masukan */}
          <View style={styles.formCard}>
            {/* Pilihan Sesi Praktikum */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Pilih Sesi Praktikum yang Berhalangan Hadir <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.sessionSelectWrap}>
                {availableSessions.map((sesi) => {
                  const isSelected = sesi.id === activeSessionId;
                  return (
                    <Pressable
                      key={sesi.id}
                      accessibilityRole="button"
                      onPress={() => setSelectedSessionId(sesi.id)}
                      style={[
                        styles.sessionOption,
                        isSelected && styles.sessionOptionSelected,
                      ]}>
                      <View style={styles.sessionOptionHeader}>
                        <Text
                          style={[
                            styles.sessionOptionTitle,
                            isSelected && styles.sessionOptionTitleSelected,
                          ]}>
                          {sesi.praktikum} ({sesi.kelas})
                        </Text>
                        <View
                          style={[
                            styles.radioDot,
                            isSelected && styles.radioDotSelected,
                          ]}
                        />
                      </View>
                      <Text style={styles.sessionOptionMateri} numberOfLines={2}>
                        {sesi.materi}
                      </Text>
                      <Text style={styles.sessionOptionSchedule}>
                        {sesi.tanggal} • {sesi.waktuMulai} - {sesi.waktuSelesai} WIB
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Peringatan jika sudah pernah mengajukan */}
            {isDuplicate ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Pengajuan Sudah Pernah Dilakukan</Text>
                <Text style={styles.warningText}>
                  Anda sudah pernah mengajukan permohonan izin untuk sesi praktikum ini.
                  Silakan periksa status peninjauan di tab Riwayat.
                </Text>
              </View>
            ) : null}

            {/* Input Alasan */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>
                  Alasan Berhalangan Hadir <Text style={styles.required}>*</Text>
                </Text>
                <Text
                  style={[
                    styles.counterText,
                    alasan.trim().length >= 10 && styles.counterTextValid,
                  ]}>
                  {alasan.trim().length}/10 karakter min
                </Text>
              </View>
              <TextInput
                multiline
                numberOfLines={4}
                value={alasan}
                onChangeText={setAlasan}
                placeholder="Contoh: Mohon izin tidak dapat hadir karena sakit demam tinggi dan harus rawat jalan di klinik."
                placeholderTextColor="#94A3B8"
                style={styles.textArea}
              />
            </View>

            {/* Live Preview Analisis AI On-Device */}
            <View style={styles.aiPreviewBox}>
              <View style={styles.aiPreviewHeader}>
                <Text style={styles.aiPreviewTitle}>Pratinjau Klasifikasi AI</Text>
                {isAnalyzing ? (
                  <View style={styles.analyzingRow}>
                    <ActivityIndicator size="small" color="#EA580C" />
                    <Text style={styles.analyzingText}>Menganalisis...</Text>
                  </View>
                ) : aiResult ? (
                  <AICategoryBadge
                    category={aiResult.kategori}
                    confidence={aiResult.confidence}
                    size="small"
                  />
                ) : (
                  <Text style={styles.aiPreviewHint}>Menunggu input alasan</Text>
                )}
              </View>

              {aiResult ? (
                <View style={styles.aiResultContent}>
                  <Text style={styles.aiSummaryText}>{aiResult.ringkasan}</Text>
                  <View style={styles.aiMetaInfo}>
                    <Text style={styles.aiMetaItem}>
                      Sentimen Teks: <Text style={styles.bold}>{aiResult.sentimen}</Text>
                    </Text>
                    <Text style={styles.aiMetaSeparator}>•</Text>
                    <Text style={styles.aiMetaItem}>
                      Pemrosesan: <Text style={styles.bold}>JavaScript On-Device (Offline)</Text>
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.aiPlaceholderText}>
                  Tuliskan alasan minimal 10 karakter untuk melihat prediksi kategori (Sakit,
                  Akademik, Keluarga, atau Lainnya) secara instan.
                </Text>
              )}
            </View>

            {/* Input Tautan Bukti / Lampiran (Opsional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Tautan Berkas / Dokumen Pendukung <Text style={styles.optional}>(Opsional)</Text>
              </Text>
              <TextInput
                value={lampiranUrl}
                onChangeText={setLampiranUrl}
                placeholder="https://drive.google.com/... atau tautan surat dokter"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                keyboardType="url"
                style={styles.textInput}
              />
              <Text style={styles.inputHelp}>
                Lampirkan tautan berkas surat izin/surat dokter jika ada.
              </Text>
            </View>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Tombol Kirim Pengajuan */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kirim Pengajuan Izin"
              disabled={!isFormValid}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.submitButton,
                !isFormValid && styles.submitButtonDisabled,
                pressed && isFormValid && styles.pressed,
              ]}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Kirim Pengajuan Izin</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Modal Dialog Konfirmasi Sukses */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Text style={styles.modalIconText}>✓</Text>
            </View>
            <Text style={styles.modalTitle}>Pengajuan Izin Terkirim</Text>
            <Text style={styles.modalMessage}>
              Permohonan izin Anda telah berhasil disimpan ke Cloud Firestore dengan status
              awal <Text style={styles.bold}>Menunggu Verifikasi</Text>.
            </Text>

            {aiResult ? (
              <View style={styles.modalBadgeRow}>
                <Text style={styles.modalBadgeLabel}>Rekomendasi AI Terlampir:</Text>
                <AICategoryBadge
                  category={aiResult.kategori}
                  confidence={aiResult.confidence}
                  size="small"
                />
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Buka Riwayat Presensi & Izin"
              onPress={() => {
                setShowSuccessModal(false);
                router.replace('/praktikan/riwayat');
              }}
              style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Lihat di Tab Riwayat →</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  container: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 16,
    gap: 16,
  },
  breadcrumbPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  breadcrumbText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  header: {
    gap: 8,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  eyebrowBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0D9488',
  },
  aiTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  identityMeta: {
    flex: 1,
    gap: 3,
  },
  identityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  identityName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  classChip: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  classText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
  },
  identityNim: {
    fontSize: 12,
    color: '#64748B',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  required: {
    color: '#DC2626',
  },
  optional: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  counterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  counterTextValid: {
    color: '#16A34A',
  },
  sessionSelectWrap: {
    gap: 8,
  },
  sessionOption: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 4,
  },
  sessionOptionSelected: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  sessionOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionOptionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  sessionOptionTitleSelected: {
    color: '#C2410C',
  },
  radioDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  radioDotSelected: {
    borderColor: '#EA580C',
    backgroundColor: '#EA580C',
  },
  sessionOptionMateri: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  sessionOptionSchedule: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 44,
  },
  inputHelp: {
    fontSize: 11,
    color: '#64748B',
  },
  aiPreviewBox: {
    backgroundColor: '#F0FDFA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#99F6E4',
    padding: 12,
    gap: 6,
  },
  aiPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiPreviewTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F766E',
  },
  aiPreviewHint: {
    fontSize: 11,
    color: '#64748B',
  },
  analyzingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  analyzingText: {
    fontSize: 11,
    color: '#EA580C',
    fontWeight: '600',
  },
  aiResultContent: {
    gap: 4,
    marginTop: 4,
  },
  aiSummaryText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#134E4A',
    fontWeight: '500',
  },
  aiMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  aiMetaItem: {
    fontSize: 11,
    color: '#0D9488',
  },
  aiMetaSeparator: {
    fontSize: 11,
    color: '#99F6E4',
  },
  aiPlaceholderText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  infoBox: {
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#475569',
  },
  warningBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    gap: 4,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B91C1C',
  },
  warningText: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#EA580C',
    borderRadius: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  modalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#15803D',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
    textAlign: 'center',
  },
  modalBadgeRow: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    width: '100%',
  },
  modalBadgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  modalButton: {
    width: '100%',
    backgroundColor: '#EA580C',
    borderRadius: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  bold: {
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
