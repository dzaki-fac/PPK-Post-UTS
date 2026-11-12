/**
 * ==============================================================================
 * PPK LabPortal — Layanan Integrasi Model AI Resmi (Model EDOM)
 * ==============================================================================
 * Berdasarkan panduan resmi praktikum:
 * https://github.com/Doctor3131/ppk-rn-expo-58/blob/main/docs/Pertemuan%202/Model%20EDOM.md
 *
 * Menggunakan paket model JavaScript resmi pengajar:
 * - ai/sentiment.js (Inference engine)
 * - ai/model-edom.json (LinearSVC TF-IDF Model)
 *
 * Murni berjalan di JavaScript lokal tanpa dependensi native atau jaringan.
 */

import { createSentimentClassifier, SentimentPrediction } from '../../ai/sentiment.js';
import model from '../../ai/model-edom.json';

export type AICategory = 'Sakit' | 'Akademik' | 'Keluarga' | 'Lainnya';
export type AISentiment = 'negatif' | 'netral' | 'positif';

export interface AIAnalysisResult {
  kategori: AICategory;
  sentimen: AISentiment;
  confidence: number;
  ringkasan: string;
  processedAt: string;
  isFallback: boolean;
}

// Inisialisasi model EDOM sekali di luar komponen sesuai panduan resmi praktikum
let classifier: ((text: string) => SentimentPrediction) | null = null;

try {
  classifier = createSentimentClassifier(model);
} catch (err) {
  console.warn('Peringatan: Gagal memuat model EDOM resmi:', err);
}

/**
 * Melakukan analisis teks alasan pengajuan izin menggunakan kombinasi model EDOM
 * dan kategorisasi semantik alasan praktikum.
 */
export async function analyzeLeaveReason(alasan: string): Promise<AIAnalysisResult> {
  const text = (alasan || '').trim().toLowerCase();

  // 1. Eksekusi inferensi Model Sentimen EDOM
  let sentimen: AISentiment = 'netral';
  let isFallback = false;

  if (classifier) {
    try {
      const pred = classifier(text);
      if (pred.label === 'negatif' || pred.label === 'netral' || pred.label === 'positif') {
        sentimen = pred.label;
      }
    } catch {
      isFallback = true;
    }
  } else {
    isFallback = true;
  }

  // 2. Klasifikasi Kategori Alasan Praktikum
  let kategori: AICategory = 'Lainnya';
  let confidence = 0.75;
  let ringkasan = 'Alasan izin ketidakhadiran praktikum.';

  const sakitKeywords = [
    'sakit', 'demam', 'pusing', 'rawat', 'opname', 'klinik', 'dokter',
    'rs', 'rumah sakit', 'flu', 'batuk', 'cedera', 'lemas', 'istirahat',
    'kecelakaan', 'infeksi', 'terkilir', 'panas'
  ];
  const akademikKeywords = [
    'lomba', 'ujian', 'sidang', 'seminar', 'delegasi', 'matkul',
    'kuliah', 'bentrok', 'tugas', 'kegiatan kampus', 'himpunan', 'organisasi',
    'workshop', 'studi', 'magang'
  ];
  const keluargaKeywords = [
    'keluarga', 'orang tua', 'ayah', 'ibu', 'menikah', 'duka',
    'meninggal', 'saudara', 'pulang kampung', 'wali', 'hajatan'
  ];

  if (sakitKeywords.some((kw) => text.includes(kw))) {
    kategori = 'Sakit';
    confidence = 0.94;
    ringkasan = `Terdeteksi indikasi masalah kesehatan (sentimen: ${sentimen}).`;
  } else if (akademikKeywords.some((kw) => text.includes(kw))) {
    kategori = 'Akademik';
    confidence = 0.91;
    ringkasan = `Terdeteksi penugasan akademik atau bentrok kuliah (sentimen: ${sentimen}).`;
  } else if (keluargaKeywords.some((kw) => text.includes(kw))) {
    kategori = 'Keluarga';
    confidence = 0.89;
    ringkasan = `Terdeteksi keperluan keluarga mendesak (sentimen: ${sentimen}).`;
  } else {
    kategori = 'Lainnya';
    confidence = 0.72;
    ringkasan = `Keperluan pribadi atau alasan non-spesifik (sentimen: ${sentimen}).`;
  }

  return {
    kategori,
    sentimen,
    confidence,
    ringkasan,
    processedAt: new Date().toISOString(),
    isFallback,
  };
}

