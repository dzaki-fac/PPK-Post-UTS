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
const NIM_IMPORT_REGEX = /^\d{8,20}$/;

export function createEmptyPraktikanDraftRow(defaultKodeLab = ''): PraktikanImportDraftData {
  return { nim: '', nama: '', email: '', kodeLab: defaultKodeLab };
}

export function createEmptyAsprakDraftRow(defaultKodeLab = ''): AsprakImportDraftData {
  return { nama: '', email: '', nim: '', kodeLab: defaultKodeLab };
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

export function validatePraktikanImportRows(
  items: ImportRowItem<PraktikanImportDraftData>[],
  context: {
    targetLab: LabLocationDocument | null;
    courseLabs: LabLocationDocument[];
    existingMembers: LabMemberDocument[];
  }
): ImportRowItem<PraktikanImportDraftData>[] {
  const labNameById = new Map(context.courseLabs.map((l) => [l.id, l.nama]));
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
    if (labError) errors.push(labError);
    else if (!resolvedLab) missingFields.push('kodeLab');

    if (nim && !NIM_IMPORT_REGEX.test(nim)) {
      errors.push('NIM harus berupa 8-20 digit angka.');
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
        errors.push(`NIM ${nim} ganda dengan Baris #${firstRow} dalam berkas ini.`);
      } else {
        seenNimInFile.set(nim, item.rowNumber);
        const existing = existingPraktikanByNim.get(nim);
        if (existing && resolvedLab) {
          if (existing.labId === resolvedLab.id) {
            isDuplicate = true;
            errors.push(`NIM ${nim} sudah terdaftar aktif di ${resolvedLab.nama}.`);
          } else {
            const existingLabNama = labNameById.get(existing.labId) ?? existing.labId;
            const resolveTransfer = Boolean(item.conflictInfo?.resolveTransfer);
            conflictInfo = {
              existingMemberId: existing.id,
              existingLabId: existing.labId,
              existingLabNama,
              resolveTransfer,
            };
            warnings.push(
              `Konflik lintas lab: terdaftar di ${existingLabNama}. Default ditolak; aktifkan "Pindahkan ke lab ini" untuk memindahkan ke ${resolvedLab.nama}.`
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
    if (isDuplicate) status = 'duplicate';
    else if (errors.length > 0) status = 'error';
    else if (missingFields.length > 0) status = 'needs_input';
    else if (conflictInfo) status = 'conflict';
    else status = 'valid';

    const acceptable =
      status === 'valid' || (status === 'conflict' && Boolean(conflictInfo?.resolveTransfer));

    return {
      ...item,
      status,
      missingFields,
      errors,
      warnings,
      conflictInfo,
      decision: acceptable
        ? item.decision === 'denied'
          ? 'denied'
          : 'accepted'
        : 'denied',
    };
  });
}

export function validateAsprakImportRows(
  items: ImportRowItem<AsprakImportDraftData>[],
  context: {
    targetLab: LabLocationDocument | null;
    courseLabs: LabLocationDocument[];
    existingMembers: LabMemberDocument[];
  }
): ImportRowItem<AsprakImportDraftData>[] {
  const labNameById = new Map(context.courseLabs.map((l) => [l.id, l.nama]));
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
    if (labError) errors.push(labError);
    else if (!resolvedLab) missingFields.push('kodeLab');

    if (nama && nama.length < 2) errors.push('Nama minimal 2 karakter.');
    if (email && !EMAIL_REGEX.test(email)) errors.push('Format email tidak valid.');
    if (nim && !NIM_IMPORT_REGEX.test(nim)) {
      errors.push('NIM opsional harus berupa 8-20 digit angka bila diisi.');
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
          const otherNames = existingEntries
            .map((e) => labNameById.get(e.labId) ?? e.labId)
            .join(', ');
          warnings.push(
            `Informasi: Asprak ini juga mengampu lab lain (${otherNames}). Multi-lab diperbolehkan.`
          );
        }
      }
    }

    let status = item.status;
    if (isDuplicate) status = 'duplicate';
    else if (errors.length > 0) status = 'error';
    else if (missingFields.length > 0) status = 'needs_input';
    else status = 'valid';

    return {
      ...item,
      status,
      missingFields,
      errors,
      warnings,
      conflictInfo: undefined,
      decision:
        status === 'valid'
          ? item.decision === 'denied'
            ? 'denied'
            : 'accepted'
          : 'denied',
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
      // Non-fatal: uid tetap null & ditautkan otomatis saat login pertama
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
  fileName?: string | null;
}): Promise<{
  savedRowNumbers: Set<number>;
  failedRowNumbers: Set<number>;
  errorByRow: Map<number, string>;
  batchId: string;
}> {
  const acceptedRows = params.rows.filter(
    (r) =>
      r.decision === 'accepted' &&
      (r.status === 'valid' || (r.status === 'conflict' && r.conflictInfo?.resolveTransfer))
  );
  if (acceptedRows.length === 0) {
    throw new Error('Tidak ada baris praktikan yang diterima dan valid untuk disimpan.');
  }

  const emailToUid = await lookupUidsByEmails(acceptedRows.map((r) => r.data.email));
  const now = new Date().toISOString();
  const batchRef = doc(collection(db, IMPORT_BATCHES_COLLECTION));
  const savedRowNumbers = new Set<number>();
  const failedRowNumbers = new Set<number>();
  const errorByRow = new Map<number, string>();

  for (let i = 0; i < acceptedRows.length; i += IMPORT_BATCH_SIZE) {
    const chunk = acceptedRows.slice(i, i + IMPORT_BATCH_SIZE);
    const batch = writeBatch(db);

    for (const row of chunk) {
      const { lab } = resolveLabFromRow(row.data.kodeLab, params.targetLab, params.courseLabs);
      if (!lab) {
        failedRowNumbers.add(row.rowNumber);
        errorByRow.set(row.rowNumber, 'Lab tujuan tidak valid.');
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
        role: 'praktikan',
        nim,
        nama: row.data.nama.trim(),
        email: emailLower,
        emailLower,
        uid: matchedUid,
        status: 'active',
        importBatchId: batchRef.id,
        createdBy: params.actorUid,
        createdAt: now,
        updatedAt: now,
      };

      batch.set(doc(db, LAB_MEMBERS_COLLECTION, memberId), memberDoc, { merge: true });

      if (matchedUid) {
        batch.update(doc(db, USERS_COLLECTION, matchedUid), {
          labId: lab.id,
          updatedAt: now,
        });
      }

      if (row.conflictInfo?.resolveTransfer && row.conflictInfo.existingLabId !== lab.id) {
        const transferRef = doc(collection(db, LAB_TRANSFERS_COLLECTION));
        const transferLog: LabTransferDocument = {
          id: transferRef.id,
          memberId,
          role: 'praktikan',
          fromLabId: row.conflictInfo.existingLabId,
          toLabId: lab.id,
          courseId: params.course.id,
          movedBy: params.actorUid,
          reason: 'Pemindahan otomatis melalui impor praktikan',
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
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan batch praktikan.';
      chunk.forEach((r) => {
        failedRowNumbers.add(r.rowNumber);
        errorByRow.set(r.rowNumber, msg);
      });
    }
  }

  try {
    const logDoc: ImportBatchDocument = {
      id: batchRef.id,
      type: 'praktikan',
      courseId: params.course.id,
      ...(params.targetLab ? { targetLabId: params.targetLab.id } : {}),
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
    // non-fatal
  }

  return { savedRowNumbers, failedRowNumbers, errorByRow, batchId: batchRef.id };
}

export async function commitAsprakImportBatch(params: {
  rows: ImportRowItem<AsprakImportDraftData>[];
  course: CourseDocument;
  targetLab: LabLocationDocument | null;
  courseLabs: LabLocationDocument[];
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
    throw new Error('Tidak ada baris asprak yang diterima dan valid untuk disimpan.');
  }

  const emailToUid = await lookupUidsByEmails(acceptedRows.map((r) => r.data.email));
  const now = new Date().toISOString();
  const batchRef = doc(collection(db, IMPORT_BATCHES_COLLECTION));
  const savedRowNumbers = new Set<number>();
  const failedRowNumbers = new Set<number>();
  const errorByRow = new Map<number, string>();

  for (let i = 0; i < acceptedRows.length; i += IMPORT_BATCH_SIZE) {
    const chunk = acceptedRows.slice(i, i + IMPORT_BATCH_SIZE);
    const batch = writeBatch(db);

    for (const row of chunk) {
      const { lab } = resolveLabFromRow(row.data.kodeLab, params.targetLab, params.courseLabs);
      if (!lab) {
        failedRowNumbers.add(row.rowNumber);
        errorByRow.set(row.rowNumber, 'Lab tujuan tidak valid.');
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
        role: 'asprak',
        ...(nim ? { nim } : {}),
        nama: row.data.nama.trim(),
        email: emailLower,
        emailLower,
        uid: matchedUid,
        status: 'active',
        importBatchId: batchRef.id,
        createdBy: params.actorUid,
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
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan batch asprak.';
      chunk.forEach((r) => {
        failedRowNumbers.add(r.rowNumber);
        errorByRow.set(r.rowNumber, msg);
      });
    }
  }

  try {
    const logDoc: ImportBatchDocument = {
      id: batchRef.id,
      type: 'asprak',
      courseId: params.course.id,
      ...(params.targetLab ? { targetLabId: params.targetLab.id } : {}),
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
    // non-fatal
  }

  return { savedRowNumbers, failedRowNumbers, errorByRow, batchId: batchRef.id };
}
