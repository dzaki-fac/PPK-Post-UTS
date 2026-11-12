/**
 * ==============================================================================
 * PPK LabPortal — Layanan Pengajuan & Moderasi Izin Praktikum
 * ==============================================================================
 * Mengelola alur pengajuan izin praktikan, penyimpanan dokumen ke Cloud Firestore
 * koleksi /leave_requests, inferensi analisis AI on-device, dan moderasi asisten.
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { AICategory, AISentiment, analyzeLeaveReason } from './ai-service';

export type LeaveStatus = 'menunggu' | 'disetujui' | 'ditolak';

export interface LeaveRequestDocument {
  id: string; // Document ID
  sessionId: string; // Relasi ke sesi praktikum
  sessionName: string; // Denormalisasi nama praktikum / modul
  studentId: string; // UID / ID praktikan pemohon
  studentName: string; // Denormalisasi nama praktikan
  studentNim: string; // Denormalisasi NIM
  studentClass: string; // Kelas praktikan (mis. 'A' | 'B')
  alasan: string; // Deskripsi alasan tertulis
  lampiranUrl?: string; // Tautan bukti surat dokter / dinas (opsional)
  status: LeaveStatus; // 'menunggu' | 'disetujui' | 'ditolak'

  // Hasil Analisis Model AI Pengajar (Decision Support Metadata)
  aiClassification: {
    category: AICategory;
    confidence: number;
    sentiment?: AISentiment;
    rawSummary?: string;
    processedAt: string;
    isFallback: boolean;
  };

  // Keputusan Asisten Laboratorium (Human in the Loop)
  reviewedBy?: string; // UID / ID asisten peninjau
  reviewerName?: string; // Nama asisten peninjau
  reviewNotes?: string; // Catatan alasan penolakan/persetujuan
  reviewedAt?: string; // ISO timestamp verifikasi

  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface CreateLeaveRequestInput {
  sessionId: string;
  sessionName: string;
  studentId: string;
  studentName: string;
  studentNim: string;
  studentClass: string;
  alasan: string;
  lampiranUrl?: string;
}

// In-Memory Storage Fallback (untuk ketahanan saat Firestore offline / dev mode)
const inMemoryStore: LeaveRequestDocument[] = [
  {
    id: 'leave-demo-1',
    sessionId: 'sesi-2',
    sessionName: 'Modul 2: Komponen Interaktif, State & Context Management',
    studentId: 'prak-3',
    studentName: 'Citra Dewi',
    studentNim: '24060122130003',
    studentClass: 'Kelas A',
    alasan: 'Mohon izin tidak dapat hadir praktikum karena sakit demam tinggi dan harus rawat jalan.',
    lampiranUrl: 'https://undip.ac.id/surat-dokter-citra.pdf',
    status: 'menunggu',
    aiClassification: {
      category: 'Sakit',
      confidence: 0.94,
      sentiment: 'negatif',
      rawSummary: 'Terdeteksi indikasi masalah kesehatan (sentimen: negatif).',
      processedAt: new Date(Date.now() - 3600000).toISOString(),
      isFallback: false,
    },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'leave-demo-2',
    sessionId: 'sesi-2',
    sessionName: 'Modul 2: Komponen Interaktif, State & Context Management',
    studentId: 'prak-6',
    studentName: 'Fajar Nugraha',
    studentNim: '24060122130006',
    studentClass: 'Kelas A',
    alasan: 'Mengikuti seleksi delegasi olimpiade sains mahasiswa mewakili universitas.',
    status: 'menunggu',
    aiClassification: {
      category: 'Akademik',
      confidence: 0.91,
      sentiment: 'netral',
      rawSummary: 'Terdeteksi penugasan akademik atau bentrok kuliah (sentimen: netral).',
      processedAt: new Date(Date.now() - 7200000).toISOString(),
      isFallback: false,
    },
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

const listeners = new Set<() => void>();

function notifyLocalListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.warn('Gagal memicu listener izin lokal:', err);
    }
  });
}

/**
 * 1. Membuat pengajuan izin baru:
 *    - Menjalankan analisis model AI EDOM on-device (< 20ms)
 *    - Menyimpan dokumen ke Cloud Firestore /leave_requests dengan status awal 'menunggu'
 */
export async function createLeaveRequest(
  input: CreateLeaveRequestInput
): Promise<LeaveRequestDocument> {
  const cleanAlasan = (input.alasan || '').trim();
  if (cleanAlasan.length < 10) {
    throw new Error('Alasan izin minimal harus 10 karakter.');
  }

  // Jalankan inferensi AI lokal on-device
  const aiResult = await analyzeLeaveReason(cleanAlasan);

  const docId = `leave-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  const newDoc: LeaveRequestDocument = {
    id: docId,
    sessionId: input.sessionId,
    sessionName: input.sessionName || 'Sesi Praktikum',
    studentId: input.studentId,
    studentName: input.studentName || 'Mahasiswa',
    studentNim: input.studentNim || '-',
    studentClass: input.studentClass || 'A',
    alasan: cleanAlasan,
    lampiranUrl: input.lampiranUrl?.trim() || undefined,
    status: 'menunggu',
    aiClassification: {
      category: aiResult.kategori,
      confidence: aiResult.confidence,
      sentiment: aiResult.sentimen,
      rawSummary: aiResult.ringkasan,
      processedAt: aiResult.processedAt,
      isFallback: aiResult.isFallback,
    },
    createdAt: now,
    updatedAt: now,
  };

  // Simpan ke in-memory store terlebih dahulu
  inMemoryStore.unshift(newDoc);
  notifyLocalListeners();

  // Simpan ke Firestore jika tersedia (tanpa menyertakan field undefined)
  try {
    const docRef = doc(db, 'leave_requests', docId);
    const firestoreData: Record<string, unknown> = {
      id: docId,
      sessionId: input.sessionId,
      sessionName: input.sessionName || 'Sesi Praktikum',
      studentId: input.studentId,
      studentName: input.studentName || 'Mahasiswa',
      studentNim: input.studentNim || '-',
      studentClass: input.studentClass || 'A',
      alasan: cleanAlasan,
      status: 'menunggu',
      aiClassification: {
        category: aiResult.kategori,
        confidence: aiResult.confidence,
        sentiment: aiResult.sentimen,
        rawSummary: aiResult.ringkasan,
        processedAt: aiResult.processedAt,
        isFallback: aiResult.isFallback,
      },
      createdAt: now,
      updatedAt: now,
    };

    if (input.lampiranUrl?.trim()) {
      firestoreData.lampiranUrl = input.lampiranUrl.trim();
    }

    await setDoc(docRef, firestoreData);
  } catch (error) {
    console.error('Gagal menyimpan izin ke Firestore, menggunakan penyimpanan lokal:', error);
  }

  return newDoc;
}

/**
 * 2. Mendengarkan antrean permohonan izin secara real-time (untuk Panel Asisten)
 */
export function subscribeLeaveRequests(
  callback: (requests: LeaveRequestDocument[]) => void,
  statusFilter?: LeaveStatus
): Unsubscribe {
  let isFirestoreActive = false;

  const emitFilteredLocal = () => {
    const sorted = [...inMemoryStore].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const filtered = statusFilter
      ? sorted.filter((r) => r.status === statusFilter)
      : sorted;
    callback(filtered);
  };

  // Langsung kirim state lokal agar antarmuka tidak blank
  emitFilteredLocal();

  const localListener = () => {
    if (!isFirestoreActive) {
      emitFilteredLocal();
    }
  };
  listeners.add(localListener);

  let unsubscribeFirestore: Unsubscribe = () => {};

  try {
    const colRef = collection(db, 'leave_requests');
    // Tidak menggabungkan where dan orderBy pada field berbeda di query Firestore
    // agar tidak mewajibkan pembuatan composite index manual di Firebase Console.
    const q = statusFilter
      ? query(colRef, where('status', '==', statusFilter))
      : query(colRef);

    unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        isFirestoreActive = true;
        const docs: LeaveRequestDocument[] = [];
        snapshot.forEach((snapDoc) => {
          docs.push({ id: snapDoc.id, ...snapDoc.data() } as LeaveRequestDocument);
        });

        // Urutkan dokumen terbaru di atas secara in-memory (0ms)
        docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Sinkronisasi memori lokal dengan dokumen Firestore
        docs.forEach((docItem) => {
          const idx = inMemoryStore.findIndex((x) => x.id === docItem.id);
          if (idx >= 0) {
            inMemoryStore[idx] = docItem;
          } else {
            inMemoryStore.push(docItem);
          }
        });

        callback(docs);
      },
      (error) => {
        console.warn('Firestore onSnapshot error (subscribeLeaveRequests), menggunakan fallback memori:', error);
        isFirestoreActive = false;
        emitFilteredLocal();
      }
    );
  } catch (err) {
    console.warn('Gagal menginisialisasi listener Firestore:', err);
  }

  return () => {
    listeners.delete(localListener);
    unsubscribeFirestore();
  };
}

/**
 * 3. Mendengarkan riwayat permohonan izin praktikan tertentu secara real-time
 */
export function subscribeStudentLeaveRequests(
  studentId: string,
  callback: (requests: LeaveRequestDocument[]) => void
): Unsubscribe {
  let isFirestoreActive = false;

  const emitLocal = () => {
    const studentRequests = inMemoryStore
      .filter((r) => r.studentId === studentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(studentRequests);
  };

  emitLocal();

  const localListener = () => {
    if (!isFirestoreActive) {
      emitLocal();
    }
  };
  listeners.add(localListener);

  let unsubscribeFirestore: Unsubscribe = () => {};

  try {
    const colRef = collection(db, 'leave_requests');
    // Query dengan single where filter tanpa orderBy agar tidak memicu error composite index
    const q = query(
      colRef,
      where('studentId', '==', studentId)
    );

    unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        isFirestoreActive = true;
        const docs: LeaveRequestDocument[] = [];
        snapshot.forEach((snapDoc) => {
          docs.push({ id: snapDoc.id, ...snapDoc.data() } as LeaveRequestDocument);
        });
        docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(docs);
      },
      (error) => {
        console.warn('Firestore onSnapshot error (subscribeStudentLeaveRequests):', error);
        isFirestoreActive = false;
        emitLocal();
      }
    );
  } catch (err) {
    console.warn('Gagal menginisialisasi listener riwayat izin praktikan:', err);
  }

  return () => {
    listeners.delete(localListener);
    unsubscribeFirestore();
  };
}

/**
 * 4. Menyimpan keputusan moderasi asisten (Human-in-the-Loop):
 *    - Mengubah status ke 'disetujui' | 'ditolak'
 *    - Menyimpan catatan/alasan review dan identitas asisten
 */
export async function reviewLeaveRequest(
  requestId: string,
  decision: 'disetujui' | 'ditolak',
  notes?: string,
  reviewerUid?: string,
  reviewerName?: string
): Promise<boolean> {
  const now = new Date().toISOString();

  // 1. Perbarui state memori lokal
  const targetIndex = inMemoryStore.findIndex((r) => r.id === requestId);
  if (targetIndex >= 0) {
    inMemoryStore[targetIndex] = {
      ...inMemoryStore[targetIndex],
      status: decision,
      reviewNotes: notes?.trim() || '',
      reviewedBy: reviewerUid || '',
      reviewerName: reviewerName || '',
      reviewedAt: now,
      updatedAt: now,
    };
    notifyLocalListeners();
  }

  // 2. Perbarui dokumen di Cloud Firestore
  try {
    const docRef = doc(db, 'leave_requests', requestId);
    await updateDoc(docRef, {
      status: decision,
      reviewNotes: notes?.trim() || '',
      reviewedBy: reviewerUid || '',
      reviewerName: reviewerName || '',
      reviewedAt: now,
      updatedAt: now,
    });
    return true;
  } catch (error) {
    console.warn('Peringatan: Gagal memperbarui izin di Firestore, tersimpan di lokal:', error);
    return true;
  }
}

/**
 * 5. Memeriksa apakah praktikan sudah pernah mengajukan izin untuk sesi ini
 */
export async function checkExistingLeaveRequest(
  sessionId: string,
  studentId: string
): Promise<boolean> {
  // Cek memori lokal
  const existsInLocal = inMemoryStore.some(
    (r) => r.sessionId === sessionId && r.studentId === studentId
  );
  if (existsInLocal) return true;

  try {
    const colRef = collection(db, 'leave_requests');
    const q = query(
      colRef,
      where('sessionId', '==', sessionId),
      where('studentId', '==', studentId)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch {
    return existsInLocal;
  }
}

/**
 * 6. Mengambil daftar permohonan izin yang disetujui untuk sesi tertentu
 *    (Digunakan untuk sinkronisasi rekap kelas asisten — FR-P2-06.3)
 */
export function getApprovedLeaveForSession(
  sessionId: string,
  studentId: string
): LeaveRequestDocument | undefined {
  return inMemoryStore.find(
    (r) => r.sessionId === sessionId && r.studentId === studentId && r.status === 'disetujui'
  );
}
