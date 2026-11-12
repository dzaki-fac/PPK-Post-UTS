import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createSentimentClassifier, SentimentPrediction } from '../../ai/sentiment.js';
import model from '../../ai/model-edom.json';
import { analyzeLeaveReason, AIAnalysisResult } from '@/services/ai-service';

/**
 * Model dibuat sekali di luar komponen agar tidak dibuat ulang setiap render
 * sesuai petunjuk resmi modul praktikum:
 * https://github.com/Doctor3131/ppk-rn-expo-58/blob/main/docs/Pertemuan%202/Model%20EDOM.md
 */
const classify = createSentimentClassifier(model);

export default function TestAiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('Mohon izin tidak dapat hadir karena demam tinggi.');
  const [prediction, setPrediction] = useState<SentimentPrediction | null>(null);
  const [mappedResult, setMappedResult] = useState<AIAnalysisResult | null>(null);

  const handleClassify = async () => {
    if (!inputText.trim()) return;

    // 1. Eksekusi langsung fungsi classify sesuai snippet resmi pengajar
    const pred = classify(inputText);
    setPrediction(pred);

    // 2. Eksekusi analisis terintegrasi untuk kategori pengajuan izin
    const result = await analyzeLeaveReason(inputText);
    setMappedResult(result);
  };

  const setSample = (text: string) => {
    setInputText(text);
  };

  const getSentimentBadgeStyle = (label: string | null) => {
    switch (label) {
      case 'positif':
        return { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' };
      case 'negatif':
        return { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' };
      case 'netral':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FCD34D' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
    }
  };

  const sentimentStyle = prediction ? getSentimentBadgeStyle(prediction.label) : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/');
            }}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backButtonText}>← Kembali</Text>
          </Pressable>
          <Text style={styles.headerTag}>Offline On-Device AI</Text>
        </View>

        <Text style={styles.title}>Uji Inferensi Model EDOM</Text>
        <Text style={styles.subtitle}>
          Verifikasi model sentimen resmi pengajar (ai/model-edom.json) yang berjalan murni di
          JavaScript lokal tanpa jaringan.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Teks Masukan / Alasan:</Text>
          <TextInput
            multiline
            numberOfLines={4}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ketik teks untuk dianalisis oleh model..."
            placeholderTextColor="#94A3B8"
            style={styles.textInput}
          />
        </View>

        <View style={styles.sampleContainer}>
          <Text style={styles.sampleLabel}>Pilih contoh cepat:</Text>
          <View style={styles.sampleChips}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSample('Saya sedang sakit demam dan disarankan dokter istirahat.')}
              style={styles.sampleChip}>
              <Text style={styles.sampleChipText}>Alasan Sakit (Negatif)</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                setSample('Jadwal praktikum bentrok dengan kegiatan lomba dan ujian susulan kampus.')
              }
              style={styles.sampleChip}>
              <Text style={styles.sampleChipText}>Alasan Bentrok (Akademik)</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                setSample('Praktikum hari ini sangat menyenangkan, materi jelas dan mudah dipahami.')
              }
              style={styles.sampleChip}>
              <Text style={styles.sampleChipText}>Ulasan Positif (EDOM)</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleClassify}
          style={({ pressed }) => [styles.classifyButton, pressed && styles.pressed]}>
          <Text style={styles.classifyButtonText}>Jalankan Model AI (classify)</Text>
        </Pressable>

        {prediction && sentimentStyle && (
          <View style={styles.resultBox}>
            <Text style={styles.resultHeading}>Hasil Analisis Model EDOM</Text>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Label Sentimen:</Text>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: sentimentStyle.bg,
                    borderColor: sentimentStyle.border,
                  },
                ]}>
                <Text style={[styles.badgeText, { color: sentimentStyle.text }]}>
                  {prediction.label ? prediction.label.toUpperCase() : 'UNKNOWN'}
                </Text>
              </View>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Status Inferensi:</Text>
              <Text style={styles.resultValue}>{prediction.status}</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Tipe Skor:</Text>
              <Text style={styles.resultValue}>{prediction.scoreType}</Text>
            </View>

            {mappedResult && (
              <View style={styles.mappingSection}>
                <Text style={styles.mappingTitle}>Pemetaan Kategori Izin Praktikum:</Text>
                <View style={styles.mappingBadgeRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      Kategori: {mappedResult.kategori}
                    </Text>
                  </View>
                  <Text style={styles.confidenceText}>
                    Confidence: {(mappedResult.confidence * 100).toFixed(0)}%
                  </Text>
                </View>
                <Text style={styles.summaryText}>{mappedResult.ringkasan}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  headerTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
    backgroundColor: '#F0FDFA',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    minHeight: 88,
    textAlignVertical: 'top',
  },
  sampleContainer: {
    marginBottom: 16,
  },
  sampleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  sampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sampleChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  sampleChipText: {
    fontSize: 12,
    color: '#475569',
  },
  classifyButton: {
    backgroundColor: '#0D9488',
    minHeight: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  classifyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
  resultBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  resultHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  resultLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  resultValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  mappingSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  mappingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  mappingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338CA',
  },
  confidenceText: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    lineHeight: 16,
  },
});

