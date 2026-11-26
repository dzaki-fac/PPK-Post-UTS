import { collection, doc, writeBatch } from 'firebase/firestore';

import {
  DEFAULT_FINE_AMOUNT,
  DEFAULT_GRACE_MINUTES,
  DEFAULT_RADIUS_METER,
  IMPORT_BATCH_SIZE,
  MAX_FINE_AMOUNT,
  MAX_GRACE_MINUTES,
  MAX_RADIUS_METER,
  MIN_FINE_AMOUNT,
  MIN_GRACE_MINUTES,
  MIN_RADIUS_METER,
} from '@/constants/praktikum-config';
import { db } from '@/lib/firebase';
import {
  clampFineAmount,
  clampGraceMinutes,
  clampRadiusMeter,
  LABS_COLLECTION,
} from '@/services/lab-service';
import type {
  CourseDocument,
  ImportBatchDocument,
  ImportRowItem,
  LabLocationDocument,
} from '@/types/praktikum';
import { normalizeKodeLab, sanitizeDocKey } from '@/utils/format';

export const IMPORT_BATCHES_COLLECTION = 'import_batches';

export interface LabImportDraftData {
  nama: string;
  kode: string;
  gedung: string;
  latitudeText: string;
  longitudeText: string;
  radiusText: string;
  graceText: string;
  fineText: string;
  kapasitasText: string;
  kelas: string;
}

export function createEmptyLabDraftRow(): LabImportDraftData {
  return {
    nama: '',
    kode: '',
    gedung: 'Gedung E FSM UNDIP',
    latitudeText: '-7.049120',
    longitudeText: '110.440820',
    radiusText: String(DEFAULT_RADIUS_METER),
    graceText: String(DEFAULT_GRACE_MINUTES),
    fineText: String(DEFAULT_FINE_AMOUNT),
    kapasitasText: '36',
    kelas: '',
  };
}

export function parseLabSpreadsheetRows(
  rows: Record<string, string>[]
): { raw: Record<string, string>; data: LabImportDraftData }[] {
  return rows.map((raw) => ({
    raw,
    data: {
      nama: raw.nama_lab || raw.nama || raw.lab || '',
      kode: (raw.kode_lab || raw.kode || '').toUpperCase(),
      gedung: raw.gedung || raw.lokasi || '',
      latitudeText: raw.latitude || raw.lat || '',
      longitudeText: raw.longitude || raw.lng || raw.lon || '',
      radiusText: raw.radius_meter || raw.radius || '',
      graceText: raw.grace_menit || raw.grace_minutes || raw.grace || '',
      fineText: raw.nominal_denda || raw.fine_amount || raw.denda || '',
      kapasitasText: raw.kapasitas || raw.capacity || '',
      kelas: raw.kelas || '',
    },
  }));
}

export function generateQuickLabDrafts(params: {
  count: number;
  namaPrefix: string;
  kodePrefix: string;
  gedung: string;
  latitude: number;
  longitude: number;
  radiusMeter: number;
  graceMinutes: number;
  fineAmount: number;
  kapasitas?: number;
}): { raw: Record<string, string>; data: LabImportDraftData }[] {
  const safeCount = Math.max(1, Math.min(50, Math.round(params.count)));
  const cleanNamaPrefix = params.namaPrefix.trim() || 'PPK Lab';
  const cleanKodePrefix = normalizeKodeLab(params.kodePrefix || 'PPK-LAB');

  return Array.from({ length: safeCount }, (_, i) => {
    const num = i + 1;
    const data: LabImportDraftData = {
      nama: `${cleanNamaPrefix} ${num}`,
      kode: `${cleanKodePrefix}-${num}`,
      gedung: params.gedung.trim() || 'Gedung E FSM UNDIP',
      latitudeText: String(Number(params.latitude.toFixed(6))),
      longitudeText: String(Number(params.longitude.toFixed(6))),
      radiusText: String(clampRadiusMeter(params.radiusMeter)),
      graceText: String(clampGraceMinutes(params.graceMinutes)),
      fineText: String(clampFineAmount(params.fineAmount)),
      kapasitasText:
        params.kapasitas && params.kapasitas > 0 ? String(Math.round(params.kapasitas)) : '',
      kelas: '',
    };
    return { raw: {}, data };
  });
}

export function validateLabImportRows(
  items: ImportRowItem<LabImportDraftData>[],
  existingCourseLabs: LabLocationDocument[]
): ImportRowItem<LabImportDraftData>[] {
  const existingCodes = new Set(existingCourseLabs.map((l) => normalizeKodeLab(l.kode)));
  const seenCodes = new Map<string, number>();

  return items.map((item) => {
    const d = item.data;
    const missingFields: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!d.nama.trim()) missingFields.push('nama');
    if (!d.kode.trim()) missingFields.push('kode');
    if (!d.gedung.trim()) missingFields.push('gedung');
    if (!d.latitudeText.trim()) missingFields.push('latitude');
    if (!d.longitudeText.trim()) missingFields.push('longitude');

    // Sesuai FR-P1-04 catatan template lab: kolom radius/grace/denda kosong ditandai Perlu Dilengkapi
    if (!d.radiusText.trim()) missingFields.push('radius');
    if (!d.graceText.trim()) missingFields.push('grace');
    if (!d.fineText.trim()) missingFields.push('fine');

    const lat = Number(d.latitudeText.replace(',', '.').trim());
    const lng = Number(d.longitudeText.replace(',', '.').trim());
    if (d.latitudeText.trim() && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
      errors.push('Latitude harus angka antara -90 dan 90.');
    }
    if (d.longitudeText.trim() && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
      errors.push('Longitude harus angka antara -180 dan 180.');
    }

    if (d.radiusText.trim()) {
      const rad = Number(d.radiusText.trim());
      if (!Number.isFinite(rad) || rad < MIN_RADIUS_METER || rad > MAX_RADIUS_METER) {
        errors.push(`Radius harus ${MIN_RADIUS_METER}-${MAX_RADIUS_METER} meter.`);
      }
    }

    if (d.graceText.trim()) {
      const grace = Number(d.graceText.trim());
      if (
        !Number.isFinite(grace) ||
        !Number.isInteger(grace) ||
        grace < MIN_GRACE_MINUTES ||
        grace > MAX_GRACE_MINUTES
      ) {
        errors.push(`Toleransi harus bilangan bulat ${MIN_GRACE_MINUTES}-${MAX_GRACE_MINUTES} menit.`);
      }
    }

    if (d.fineText.trim()) {
      const fine = Number(d.fineText.replace(/[.\s]/g, '').trim());
      if (
        !Number.isFinite(fine) ||
        !Number.isInteger(fine) ||
        fine < MIN_FINE_AMOUNT ||
        fine > MAX_FINE_AMOUNT
      ) {
        errors.push(`Nominal denda harus ${MIN_FINE_AMOUNT}-${MAX_FINE_AMOUNT} Rupiah.`);
      }
    }

    if (d.kapasitasText.trim()) {
      const cap = Number(d.kapasitasText.trim());
      if (!Number.isFinite(cap) || !Number.isInteger(cap) || cap <= 0) {
        errors.push('Kapasitas harus bilangan bulat positif.');
      }
    }

    const normKode = d.kode.trim() ? normalizeKodeLab(d.kode) : '';
    let isDuplicate = false;
    if (normKode) {
      const firstRow = seenCodes.get(normKode);
      if (firstRow !== undefined) {
        isDuplicate = true;
        errors.push(`Kode lab "${normKode}" duplikat dengan Baris #${firstRow}.`);
      } else {
        seenCodes.set(normKode, item.rowNumber);
        if (existingCodes.has(normKode)) {
          isDuplicate = true;
          errors.push(`Kode lab "${normKode}" sudah terdaftar pada mata kuliah ini.`);
        }
      }
    }

    if (
      missingFields.some((f) => f === 'radius' || f === 'grace' || f === 'fine')
    ) {
      warnings.push(
        `Gunakan tombol "Isi Kolom Kosong Default" untuk melengkapi radius (${DEFAULT_RADIUS_METER}m), toleransi (${DEFAULT_GRACE_MINUTES}m), dan denda (Rp ${DEFAULT_FINE_AMOUNT.toLocaleString('id-ID')}).`
      );
    }

    let status = item.status;
    if (isDuplicate) {
      status = 'duplicate';
    } else if (errors.length > 0) {
      status = 'error';
    } else if (missingFields.length > 0) {
      status = 'needs_input';
    } else {
      status = 'valid';
    }

    const canAccept = status === 'valid';
    return {
      ...item,
      status,
      missingFields,
      errors,
      warnings,
      decision: canAccept ? (item.decision === 'denied' ? 'denied' : 'accepted') : 'denied',
    };
  });
}

export async function commitLabImportBatch(params: {
  rows: ImportRowItem<LabImportDraftData>[];
  course: CourseDocument;
  actorUid: string;
  fileName?: string | null;
}): Promise<{
  savedRowNumbers: Set<number>;
  failedRowNumbers: Set<number>;
  errorByRow: Map<number, string>;
  batchId: string;
}> {
  const acceptedRows = params.rows.filter(
    (r) => r.decision === 'accepted' && r.status === 'valid'
  );
  if (acceptedRows.length === 0) {
    throw new Error('Tidak ada baris valid yang diterima untuk disimpan.');
  }

  const now = new Date().toISOString();
  const batchRef = doc(collection(db, IMPORT_BATCHES_COLLECTION));
  const savedRowNumbers = new Set<number>();
  const failedRowNumbers = new Set<number>();
  const errorByRow = new Map<number, string>();

  for (let i = 0; i < acceptedRows.length; i += IMPORT_BATCH_SIZE) {
    const chunk = acceptedRows.slice(i, i + IMPORT_BATCH_SIZE);
    const batch = writeBatch(db);

    for (const row of chunk) {
      const d = row.data;
      const kode = normalizeKodeLab(d.kode);
      const deterministicId = `${sanitizeDocKey(params.course.id)}_${sanitizeDocKey(kode)}`;
      const lat = Number(d.latitudeText.replace(',', '.').trim());
      const lng = Number(d.longitudeText.replace(',', '.').trim());
      const rad = clampRadiusMeter(Number(d.radiusText.trim()));
      const grace = clampGraceMinutes(Number(d.graceText.trim()));
      const fine = clampFineAmount(Number(d.fineText.replace(/[.\s]/g, '').trim()));
      const kapasitas = d.kapasitasText.trim()
        ? Math.round(Number(d.kapasitasText.trim()))
        : undefined;

      const labDoc: LabLocationDocument = {
        id: deterministicId,
        courseId: params.course.id,
        courseNama: params.course.nama,
        nama: d.nama.trim(),
        kode,
        gedung: d.gedung.trim(),
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        radiusMeter: rad,
        graceMinutes: grace,
        fineAmount: fine,
        ...(kapasitas ? { kapasitas } : {}),
        ...(d.kelas.trim() ? { kelas: d.kelas.trim() } : {}),
        isActive: true,
        updatedBy: params.actorUid,
        createdAt: now,
        updatedAt: now,
      };

      batch.set(doc(db, LABS_COLLECTION, deterministicId), labDoc, { merge: true });
    }

    try {
      await batch.commit();
      chunk.forEach((r) => savedRowNumbers.add(r.rowNumber));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menulis batch laboratorium.';
      chunk.forEach((r) => {
        failedRowNumbers.add(r.rowNumber);
        errorByRow.set(r.rowNumber, msg);
      });
    }
  }

  try {
    const logDoc: ImportBatchDocument = {
      id: batchRef.id,
      type: 'lab',
      courseId: params.course.id,
      ...(params.fileName ? { fileName: params.fileName } : {}),
      totalRows: params.rows.length,
      acceptedRows: acceptedRows.length,
      deniedRows: params.rows.length - acceptedRows.length,
      savedRows: savedRowNumbers.size,
      failedRows: failedRowNumbers.size,
      createdBy: params.actorUid,
      createdAt: now,
    };
    const logBatch = writeBatch(db);
    logBatch.set(batchRef, logDoc);
    await logBatch.commit();
  } catch {
    // non-fatal audit write
  }

  return {
    savedRowNumbers,
    failedRowNumbers,
    errorByRow,
    batchId: batchRef.id,
  };
}
