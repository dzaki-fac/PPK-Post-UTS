import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';

import { IMPORT_BATCH_SIZE } from '@/constants/praktikum-config';
import { db } from '@/lib/firebase';
import { IMPORT_BATCHES_COLLECTION } from '@/services/lab-import-service';
import {
  buildAsprakMemberId,
  buildPraktikanMemberId,
  LAB_MEMBERS_COLLECTION,
  LAB_TRANSFERS_COLLECTION,
  USERS_COLLECTION,
} from '@/services/lab-member-service';
import type {
  CourseDocument,
  ImportBatchDocument,
  ImportRowItem,
  LabLocationDocument,
  LabMemberDocument,
  LabTransferDocument,
} from '@/types/praktikum';
import { normalizeEmailLower, normalizeKodeLab, normalizeNim } from '@/utils/format';

export interface PraktikanImportDraftData {
  nim: string;
  nama: string;
  email: string;
  kodeLab: string;
}

export interface AsprakImportDraftData {
  nama: string;
  email: string;
  nim: string;
  kodeLab: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createEmptyPraktikanDraftRow(defaultKodeLab = ''): PraktikanImportDraftData {
  return {
    nim: '',
    nama: '',
    email: '',
    kodeLab: defaultKodeLab,
  };
}

export function createEmptyAsprakDraftRow(defaultKodeLab = ''): AsprakImportDraftData {
  return {
    nama: '',
    email: '',
    nim: '',
    kodeLab: defaultKodeLab,
  };
}

export function parsePraktikanSpreadsheetRows(
  rows: Record<string, string>[]
): { raw: Record<string, string>; data: PraktikanImportDraftData }[] {
  return rows.map((raw) => ({
    raw,
    data: {
      nim: normalizeNim(raw.nim || raw.nim_mahasiswa || ''),
      nama: (raw.nama || raw.nama_lengkap || raw.nama_mahasiswa || '').trim(),
      email: normalizeEmailLower(raw.email || raw.email_mahasiswa || ''),
      kodeLab: (raw.kode_lab || raw.kode || raw.lab || '').trim().toUpperCase(),
    },
  }));
}

export function parseAsprakSpreadsheetRows(
  rows: Record<string, string>[]
): { raw: Record<string, string>; data: AsprakImportDraftData }[] {
  return rows.map((raw) => ({
    raw,
    data: {
      nama: (raw.nama || raw.nama_lengkap || raw.nama_asprak || '').trim(),
      email: normalizeEmailLower(raw.email || raw.email_asprak || ''),
      nim: normalizeNim(raw.nim || ''),
      kodeLab: (raw.kode_lab || raw.kode || raw.lab || '').trim().toUpperCase(),
    },
  }));
}

function resolveLabFromRow(
  kodeLab: string,
  targetLab: LabLocationDocument | null,
  courseLabs: LabLocationDocument[]
): { lab: LabLocationDocument | null; error?: string } {
  const cleanCode = kodeLab.trim();
  if (!cleanCode) {
    return { lab: targetLab };
  }
  const normalized = normalizeKodeLab(cleanCode);
  const matched = courseLabs.find(
    (l) =>
      normalizeKodeLab(l.kode) === normalized ||
      l.nama.trim().toLowerCase() === cleanCode.toLowerCase()
  );
  if (!matched) {
    return {
      lab: null,
      error: `Kode lab "${cleanCode}" tidak ditemukan pada mata kuliah terpilih.`,
    };
  }
  return { lab: matched };
}

/**
 * Validasi draf impor PRAKTIKAN dengan aturan duplikat NIM & konflik lab pada mata kuliah yang sama.
 */
export function validatePraktikanImportRows(
  items: ImportRowItem<PraktikanImportDraftData>[],
  context: {
    targetLab: LabLocationDocument | null;
    courseLabs: LabLocationDocument[];
    existingMembers: LabMemberDocument[];
  }
): ImportRowItem<PraktikanImportDraftData>[] {
  const existingPraktikanByNim = new Map<string, LabMemberDocument>();
  for (const m of context.existingMembers) {
    if (m.role === 'praktikan' && m.status === 'active' && m.nim) {
      existingPraktikanByNim.set(normalizeNim(m.nim), m);
    }
  }

  const seenNimInFile = new Map<string, number>();

  return items.map((item) => {
    const d = item.data;
    const missingFields: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    const nim = normalizeNim(d.nim);
    const email = normalizeEmailLower(d.email);
    const nama = d.nama.trim();

    if (!nim) missingFields.push('nim');
    if (!nama) missingFields.push('nama');
    if (!email) missingFields.push('email');

    const { lab: resolvedLab, error: labError } = resolveLabFromRow(
      d.kodeLab,
      context.targetLab,
      context.courseLabs
    );
    if (labError) {
      errors.push(labError);
    } else if (!resolvedLab) {
      missingFields.push('kodeLab');
    }

    if (nim && !/^\d{6,20}$/.test(nim)) {
      errors.push('NIM harus berupa 6-20 digit angka.');
    }
    if (nama && nama.length < 2) {
      errors.push('Nama minimal 2 karakter.');
    }
    if (email && !EMAIL_REGEX.test(email)) {
      errors.push('Format email tidak valid.');
    }

    let isDuplicate = false;
    let conflictInfo = item.conflictInfo;

    if (nim) {
      const firstRow = seenNimInFile.get(nim);
      if (firstRow !== undefined) {
        isDuplicate = true;
        errors.push(`NIM ${nim} duplikat dengan Baris #${firstRow} di file ini.`);
      } else {
        seenNimInFile.set(nim, item.rowNumber);
        const existing = existingPraktikanByNim.get(nim);
        if (existing && resolvedLab) {
          if (existing.labId === resolvedLab.id) {
            isDuplicate = true;
            errors.push(`NIM ${nim} sudah aktif terdaftar di ${resolvedLab.nama}.`);
          } else {
            const resolveTransfer = Boolean(item.conflictInfo?.resolveTransfer);
            conflictInfo = {
              existingMemberId: existing.id,
              existingLabId: existing.labId,
              existingLabNama: existing.labNama,
              resolveTransfer,
            };
            warnings.push(
              `Sudah terdaftar di ${existing.labNama}. Aktifkan "Pindahkan ke lab ini" untuk memindahkan praktikan ini ke ${resolvedLab.nama}.`
            );
          }
        } else {
          conflictInfo = undefined;
        }
      }
    } else {
      conflictInfo = undefined;
    }

    let status = item.status;
    if (isDuplicate) {
      status = 'duplicate';
    } else if (errors.length > 0) {
      status = 'error';
    } else if (missingFields.length > 0) {
      status = 'needs_input';
    } else if (conflictInfo) {
      status = 'conflict';
    } else {
      status = 'valid';
    }

    const acceptable =
      status === 'valid' || (status === 'conflict' && Boolean(conflictInfo?.resolveTransfer));

    return {
      ...item,
      status,
      missingFields,
      errors,
      warnings,
      conflictInfo,
      accepted: acceptable ? item.accepted : false,
    };
  });
}

/**
 * Validasi draf impor ASPRAK: boleh mengajar lebih dari satu lab, hanya duplikat jika di lab yang sama.
 */
export function validateAsprakImportRows(
  items: ImportRowItem<AsprakImportDraftData>[],
  context: {
    targetLab: LabLocationDocument | null;
    courseLabs: LabLocationDocument[];
    existingMembers: LabMemberDocument[];
  }
): ImportRowItem<AsprakImportDraftData>[] {
  const existingAsprakByEmail = new Map<string, LabMemberDocument[]>();
  for (const m of context.existingMembers) {
    if (m.role === 'asprak' && m.status === 'active') {
      const arr = existingAsprakByEmail.get(m.emailLower) ?? [];
      arr.push(m);
      existingAsprakByEmail.set(m.emailLower, arr);
    }
  }

  const seenEmailLabInFile = new Map<string, number>();

  return items.map((item) => {
    const d = item.data;
    const missingFields: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    const nama = d.nama.trim();
    const email = normalizeEmailLower(d.email);
    const nim = normalizeNim(d.nim);

    if (!nama) missingFields.push('nama');
    if (!email) missingFields.push('email');

    const { lab: resolvedLab, error: labError } = resolveLabFromRow(
      d.kodeLab,
      context.targetLab,
      context.courseLabs
    );
    if (labError) {
      errors.push(labError);
    } else if (!resolvedLab) {
      missingFields.push('kodeLab');
    }

    if (nama && nama.length < 2) {
      errors.push('Nama minimal 2 karakter.');
    }
    if (email && !EMAIL_REGEX.test(email)) {
      errors.push('Format email tidak valid.');
    }
    if (nim && !/^\d{6,20}$/.test(nim)) {
      errors.push('NIM opsional harus berupa 6-20 digit angka jika diisi.');
    }

    let isDuplicate = false;
    if (email && resolvedLab) {
      const composite = `${email}::${resolvedLab.id}`;
      const firstRow = seenEmailLabInFile.get(composite);
      if (firstRow !== undefined) {
        isDuplicate = true;
        errors.push(`Email ${email} duplikat untuk ${resolvedLab.nama} (Baris #${firstRow}).`);
      } else {
        seenEmailLabInFile.set(composite, item.rowNumber);
        const existingEntries = existingAsprakByEmail.get(email) ?? [];
        const sameLab = existingEntries.find((e) => e.labId === resolvedLab.id);
        if (sameLab) {
          isDuplicate = true;
          errors.push(`Asprak ${email} sudah terdaftar aktif di ${resolvedLab.nama}.`);
        } else if (existingEntries.length > 0) {
          const otherNames = existingEntries.map((e) => e.labNama).join(', ');
          warnings.push(`Juga mengampu lab lain (${otherNames}). Multi-lab diizinkan untuk Asprak.`);
        }
      }
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

    return {
      ...item,
      status,
      missingFields,
      errors,
      warnings,
      conflictInfo: undefined,
      accepted: status === 'valid' ? item.accepted : false,
    };
  });
}

async function lookupUidsByEmails(emails: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const unique = Array.from(new Set(emails.map(normalizeEmailLower).filter(Boolean)));
  const CHUNK_IN = 25;

  for (let i = 0; i < unique.length; i += CHUNK_IN) {
    const slice = unique.slice(i, i + CHUNK_IN);
    try {
      const snap = await getDocs(
        query(collection(db, USERS_COLLECTION), where('email', 'in', slice))
      );
      for (const d of snap.docs) {
        const data = d.data() as { email?: string; emailLower?: string };
        const key = normalizeEmailLower(data.emailLower ?? data.email ?? '');
        if (key) result.set(key, d.id);
      }
    } catch {
      // Jika query terhambat, uid tetap null & ditautkan saat user login pertama kali.
    }
  }
  return result;
}

export async function commitPraktikanImportBatch(params: {
  rows: ImportRowItem<PraktikanImportDraftData>[];
  course: CourseDocument;
  targetLab: LabLocationDocument | null;
  courseLabs: LabLocationDocument[];
  actorUid: string;
  actorNama: string;
  fileName?: string | null;
}): Promise<{
  savedRowNumbers: Set<number>;
  failedRowNumbers: Set<number>;
  batchId: string;
  errorMessage?: string;
}> {
  const acceptedRows = params.rows.filter(
    (r) =>
      r.accepted &&
      (r.status === 'valid' || (r.status === 'conflict' && r.conflictInfo?.resolveTransfer))
  );
  if (acceptedRows.length === 0) {
    throw new Error('Tidak ada baris praktikan yang siap disimpan.');
  }

  const emailToUid = await lookupUidsByEmails(acceptedRows.map((r) => r.data.email));
  const now = new Date().toISOString();
  const batchRef = doc(collection(db, IMPORT_BATCHES_COLLECTION));
  const savedRowNumbers = new Set<number>();
  const failedRowNumbers = new Set<number>();
  let lastError: string | undefined;

  for (let i = 0; i < acceptedRows.length; i += IMPORT_BATCH_SIZE) {
    const chunk = acceptedRows.slice(i, i + IMPORT_BATCH_SIZE);
    const batch = writeBatch(db);

    for (const row of chunk) {
      const { lab } = resolveLabFromRow(row.data.kodeLab, params.targetLab, params.courseLabs);
      if (!lab) {
        failedRowNumbers.add(row.rowNumber);
        continue;
      }

      const nim = normalizeNim(row.data.nim);
      const emailLower = normalizeEmailLower(row.data.email);
      const memberId = buildPraktikanMemberId(params.course.id, nim);
      const matchedUid = emailToUid.get(emailLower) ?? null;

      const memberDoc: LabMemberDocument = {
        id: memberId,
        courseId: params.course.id,
        labId: lab.id,
        labNama: lab.nama,
        role: 'praktikan',
        uid: matchedUid,
        nim,
        nama: row.data.nama.trim(),
        email: emailLower,
        emailLower,
        status: 'active',
        importedBatchId: batchRef.id,
        createdAt: now,
        updatedAt: now,
      };

      batch.set(doc(db, LAB_MEMBERS_COLLECTION, memberId), memberDoc, { merge: true });

      if (matchedUid) {
        batch.update(doc(db, USERS_COLLECTION, matchedUid), {
          labId: lab.id,
          courseId: params.course.id,
          updatedAt: now,
        });
      }

      if (row.conflictInfo?.resolveTransfer && row.conflictInfo.existingLabId !== lab.id) {
        const transferRef = doc(collection(db, LAB_TRANSFERS_COLLECTION));
        const transferLog: LabTransferDocument = {
          id: transferRef.id,
          courseId: params.course.id,
          memberId: matchedUid ?? memberId,
          memberNama: row.data.nama.trim(),
          memberRole: 'praktikan',
          nim,
          fromLabId: row.conflictInfo.existingLabId,
          fromLabNama: row.conflictInfo.existingLabNama,
          toLabId: lab.id,
          toLabNama: lab.nama,
          alasan: 'Pemindahan otomatis melalui impor praktikan',
          transferredBy: params.actorUid,
          transferredByNama: params.actorNama,
          createdAt: now,
        };
        batch.set(transferRef, transferLog);
      }
    }

    try {
      await batch.commit();
      chunk.forEach((r) => {
        if (!failedRowNumbers.has(r.rowNumber)) {
          savedRowNumbers.add(r.rowNumber);
        }
      });
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Gagal menyimpan sebagian batch praktikan.';
      chunk.forEach((r) => failedRowNumbers.add(r.rowNumber));
    }
  }

  if (savedRowNumbers.size > 0) {
    try {
      const logDoc: ImportBatchDocument = {
        id: batchRef.id,
        type: 'praktikan',
        courseId: params.course.id,
        ...(params.targetLab ? { targetLabId: params.targetLab.id } : {}),
        ...(params.fileName ? { fileName: params.fileName } : {}),
        totalRows: params.rows.length,
        acceptedCount: savedRowNumbers.size,
        rejectedCount: params.rows.length - savedRowNumbers.size,
        createdBy: params.actorUid,
        createdByNama: params.actorNama,
        createdAt: now,
      };
      const logBatch = writeBatch(db);
      logBatch.set(batchRef, logDoc);
      await logBatch.commit();
    } catch {
      // non-fatal
    }
  }

  return {
    savedRowNumbers,
    failedRowNumbers,
    batchId: batchRef.id,
    errorMessage: lastError,
  };
}

export async function commitAsprakImportBatch(params: {
  rows: ImportRowItem<AsprakImportDraftData>[];
  course: CourseDocument;
  targetLab: LabLocationDocument | null;
  courseLabs: LabLocationDocument[];
  actorUid: string;
  actorNama: string;
  fileName?: string | null;
}): Promise<{
  savedRowNumbers: Set<number>;
  failedRowNumbers: Set<number>;
  batchId: string;
  errorMessage?: string;
}> {
  const acceptedRows = params.rows.filter((r) => r.accepted && r.status === 'valid');
  if (acceptedRows.length === 0) {
    throw new Error('Tidak ada baris asprak yang siap disimpan.');
  }

  const emailToUid = await lookupUidsByEmails(acceptedRows.map((r) => r.data.email));
  const now = new Date().toISOString();
  const batchRef = doc(collection(db, IMPORT_BATCHES_COLLECTION));
  const savedRowNumbers = new Set<number>();
  const failedRowNumbers = new Set<number>();
  let lastError: string | undefined;

  for (let i = 0; i < acceptedRows.length; i += IMPORT_BATCH_SIZE) {
    const chunk = acceptedRows.slice(i, i + IMPORT_BATCH_SIZE);
    const batch = writeBatch(db);

    for (const row of chunk) {
      const { lab } = resolveLabFromRow(row.data.kodeLab, params.targetLab, params.courseLabs);
      if (!lab) {
        failedRowNumbers.add(row.rowNumber);
        continue;
      }

      const emailLower = normalizeEmailLower(row.data.email);
      const nim = normalizeNim(row.data.nim);
      const memberId = buildAsprakMemberId(lab.id, emailLower);
      const matchedUid = emailToUid.get(emailLower) ?? null;

      const memberDoc: LabMemberDocument = {
        id: memberId,
        courseId: params.course.id,
        labId: lab.id,
        labNama: lab.nama,
        role: 'asprak',
        uid: matchedUid,
        ...(nim ? { nim } : {}),
        nama: row.data.nama.trim(),
        email: emailLower,
        emailLower,
        status: 'active',
        importedBatchId: batchRef.id,
        createdAt: now,
        updatedAt: now,
      };

      batch.set(doc(db, LAB_MEMBERS_COLLECTION, memberId), memberDoc, { merge: true });

      if (matchedUid) {
        batch.update(doc(db, USERS_COLLECTION, matchedUid), {
          labIds: arrayUnion(lab.id),
          updatedAt: now,
        });
      }
    }

    try {
      await batch.commit();
      chunk.forEach((r) => {
        if (!failedRowNumbers.has(r.rowNumber)) {
          savedRowNumbers.add(r.rowNumber);
        }
      });
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Gagal menyimpan sebagian batch asprak.';
      chunk.forEach((r) => failedRowNumbers.add(r.rowNumber));
    }
  }

  if (savedRowNumbers.size > 0) {
    try {
      const logDoc: ImportBatchDocument = {
        id: batchRef.id,
        type: 'asprak',
        courseId: params.course.id,
        ...(params.targetLab ? { targetLabId: params.targetLab.id } : {}),
        ...(params.fileName ? { fileName: params.fileName } : {}),
        totalRows: params.rows.length,
        acceptedCount: savedRowNumbers.size,
        rejectedCount: params.rows.length - savedRowNumbers.size,
        createdBy: params.actorUid,
        createdByNama: params.actorNama,
        createdAt: now,
      };
      const logBatch = writeBatch(db);
      logBatch.set(batchRef, logDoc);
      await logBatch.commit();
    } catch {
      // non-fatal
    }
  }

  return {
    savedRowNumbers,
    failedRowNumbers,
    batchId: batchRef.id,
    errorMessage: lastError,
  };
}
