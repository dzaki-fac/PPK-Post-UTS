import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type {
  LabLocationDocument,
  LabMemberDocument,
  LabMemberRole,
  LabTransferDocument,
  UserDocument,
} from '@/types/praktikum';
import { normalizeEmailLower, normalizeNim, sanitizeDocKey } from '@/utils/format';

export const LAB_MEMBERS_COLLECTION = 'lab_members';
export const LAB_TRANSFERS_COLLECTION = 'lab_transfers';
export const USERS_COLLECTION = 'users';

export function buildPraktikanMemberId(courseId: string, nim: string): string {
  return `${sanitizeDocKey(courseId)}_praktikan_${sanitizeDocKey(normalizeNim(nim))}`;
}

export function buildAsprakMemberId(labId: string, email: string): string {
  return `${sanitizeDocKey(labId)}_asprak_${sanitizeDocKey(normalizeEmailLower(email))}`;
}

/**
 * Menautkan dokumen `lab_members` yang memiliki `emailLower` sama dan `uid == null`
 * saat login pertama, lalu menyinkronkan `users.labId` (praktikan) atau `users.labIds` (asprak).
 * Kegagalan penautan bersifat non-fatal dan tidak menggagalkan proses login (FR-P1-01.3).
 */
export async function linkLabMembersOnLogin(params: {
  uid: string;
  email?: string | null;
  currentUserDoc?: UserDocument | null;
}): Promise<void> {
  const emailLower = normalizeEmailLower(params.email ?? '');
  if (!params.uid || !emailLower) {
    return;
  }

  try {
    const q = query(
      collection(db, LAB_MEMBERS_COLLECTION),
      where('emailLower', '==', emailLower),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      return;
    }

    const now = new Date().toISOString();
    const batch = writeBatch(db);
    let hasMemberUpdates = false;

    let praktikanLabId: string | undefined;
    let praktikanNim: string | undefined;
    const asprakLabIds: string[] = [];

    for (const d of snap.docs) {
      const data = d.data() as LabMemberDocument;
      if (data.uid == null) {
        batch.update(d.ref, { uid: params.uid, updatedAt: now });
        hasMemberUpdates = true;
      }

      if (data.role === 'praktikan') {
        praktikanLabId = data.labId;
        if (data.nim) praktikanNim = data.nim;
      } else if (data.role === 'asprak' && data.labId) {
        asprakLabIds.push(data.labId);
      }
    }

    if (hasMemberUpdates) {
      await batch.commit();
    }

    const userRef = doc(db, USERS_COLLECTION, params.uid);
    const existingSnap = params.currentUserDoc ? null : await getDoc(userRef);
    const currentData =
      params.currentUserDoc ??
      (existingSnap?.exists() ? (existingSnap.data() as UserDocument) : null);

    if (!currentData) {
      return;
    }

    const userUpdates: Record<string, unknown> = {
      emailLower,
      updatedAt: now,
    };
    let needsUserUpdate = currentData.emailLower !== emailLower;

    if (praktikanLabId && currentData.labId !== praktikanLabId) {
      userUpdates.labId = praktikanLabId;
      needsUserUpdate = true;
    }
    if (praktikanNim && !currentData.nim) {
      userUpdates.nim = praktikanNim;
      needsUserUpdate = true;
    }
    if (asprakLabIds.length > 0) {
      const existingLabIds = new Set(currentData.labIds ?? []);
      if (asprakLabIds.some((id) => !existingLabIds.has(id))) {
        userUpdates.labIds = arrayUnion(...asprakLabIds);
        needsUserUpdate = true;
      }
    }

    if (needsUserUpdate) {
      await updateDoc(userRef, userUpdates);
    }
  } catch (error) {
    console.warn('Penautan lab_members saat login dilewati (non-fatal):', error);
  }
}

export function subscribeMembersByCourse(
  courseId: string,
  onData: (members: LabMemberDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, LAB_MEMBERS_COLLECTION),
    where('courseId', '==', courseId),
    where('status', '==', 'active')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        ...(d.data() as LabMemberDocument),
        id: d.id,
      }));
      list.sort((a, b) => a.nama.localeCompare(b.nama));
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export function subscribeAllActiveMembers(
  onData: (members: LabMemberDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, LAB_MEMBERS_COLLECTION),
    where('status', '==', 'active')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        ...(d.data() as LabMemberDocument),
        id: d.id,
      }));
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export async function updateLabMemberProfile(
  memberId: string,
  updates: { nama: string; email: string }
): Promise<void> {
  const cleanNama = updates.nama.trim();
  const cleanEmail = normalizeEmailLower(updates.email);
  if (cleanNama.length < 2) {
    throw new Error('Nama anggota wajib diisi minimal 2 karakter.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Format email anggota tidak valid.');
  }

  await updateDoc(doc(db, LAB_MEMBERS_COLLECTION, memberId), {
    nama: cleanNama,
    email: cleanEmail,
    emailLower: cleanEmail,
    updatedAt: new Date().toISOString(),
  });
}

export async function softRemoveLabMember(member: LabMemberDocument): Promise<void> {
  const now = new Date().toISOString();
  await updateDoc(doc(db, LAB_MEMBERS_COLLECTION, member.id), {
    status: 'removed',
    updatedAt: now,
  });

  if (member.uid) {
    try {
      const userRef = doc(db, USERS_COLLECTION, member.uid);
      if (member.role === 'praktikan') {
        await updateDoc(userRef, {
          labId: '',
          updatedAt: now,
        });
      } else {
        await updateDoc(userRef, {
          labIds: arrayRemove(member.labId),
          updatedAt: now,
        });
      }
    } catch (error) {
      console.warn('Sinkronisasi penghapusan lab di /users dilewati:', error);
    }
  }
}

/**
 * Memindahkan satu atau banyak praktikan/asprak ke laboratorium lain pada mata kuliah yang sama.
 * Jadwal praktikum tidak dipindahkan (FR-P1-08.3). Mencatat audit ke `/lab_transfers`
 * dan menyinkronkan `users.labId` / `users.labIds`.
 */
export async function transferLabMembers(params: {
  members: LabMemberDocument[];
  targetLab: LabLocationDocument;
  reason?: string;
  movedBy: string;
}): Promise<number> {
  const { members, targetLab, reason, movedBy } = params;
  const eligible = members.filter(
    (m) => m.status === 'active' && m.labId !== targetLab.id
  );
  if (eligible.length === 0) {
    throw new Error('Pilih minimal satu anggota yang berada di lab berbeda dari lab tujuan.');
  }

  for (const m of eligible) {
    if (targetLab.courseId && m.courseId !== targetLab.courseId) {
      throw new Error(
        `Anggota ${m.nama} terdaftar pada mata kuliah berbeda sehingga tidak dapat dipindahkan ke ${targetLab.nama}.`
      );
    }
  }

  const now = new Date().toISOString();
  const CHUNK_LIMIT = 80;
  let transferredCount = 0;

  for (let i = 0; i < eligible.length; i += CHUNK_LIMIT) {
    const chunk = eligible.slice(i, i + CHUNK_LIMIT);
    const batch = writeBatch(db);

    for (const member of chunk) {
      const fromLabId = member.labId;
      let nextMemberId = member.id;

      if (member.role === 'asprak') {
        nextMemberId = buildAsprakMemberId(targetLab.id, member.emailLower);
        if (nextMemberId !== member.id) {
          batch.update(doc(db, LAB_MEMBERS_COLLECTION, member.id), {
            status: 'removed',
            updatedAt: now,
          });
          const nextDoc: LabMemberDocument = {
            ...member,
            id: nextMemberId,
            labId: targetLab.id,
            status: 'active',
            updatedAt: now,
          };
          batch.set(doc(db, LAB_MEMBERS_COLLECTION, nextMemberId), nextDoc, { merge: true });
        } else {
          batch.update(doc(db, LAB_MEMBERS_COLLECTION, member.id), {
            labId: targetLab.id,
            updatedAt: now,
          });
        }
      } else {
        batch.update(doc(db, LAB_MEMBERS_COLLECTION, member.id), {
          labId: targetLab.id,
          updatedAt: now,
        });
      }

      const transferRef = doc(collection(db, LAB_TRANSFERS_COLLECTION));
      const transferLog: LabTransferDocument = {
        id: transferRef.id,
        memberId: nextMemberId,
        role: member.role,
        fromLabId,
        toLabId: targetLab.id,
        courseId: member.courseId,
        movedBy,
        ...(reason?.trim() ? { reason: reason.trim() } : {}),
        createdAt: now,
      };
      batch.set(transferRef, transferLog);

      if (member.uid) {
        const userRef = doc(db, USERS_COLLECTION, member.uid);
        if (member.role === 'praktikan') {
          batch.update(userRef, {
            labId: targetLab.id,
            updatedAt: now,
          });
        } else {
          batch.update(userRef, {
            labIds: arrayUnion(targetLab.id),
            updatedAt: now,
          });
        }
      }

      transferredCount += 1;
    }

    await batch.commit();

    // Lepas labId asal dari users.labIds asprak pada operasi terpisah
    for (const member of chunk) {
      if (member.role === 'asprak' && member.uid && member.labId !== targetLab.id) {
        try {
          await updateDoc(doc(db, USERS_COLLECTION, member.uid), {
            labIds: arrayRemove(member.labId),
            updatedAt: now,
          });
        } catch (err) {
          console.warn('Gagal melepas labIds lama asprak:', err);
        }
      }
    }
  }

  return transferredCount;
}

export function subscribeRecentTransfers(
  courseId: string,
  onData: (transfers: LabTransferDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, LAB_TRANSFERS_COLLECTION),
    where('courseId', '==', courseId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        ...(d.data() as LabTransferDocument),
        id: d.id,
      }));
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(items.slice(0, 20));
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export async function upsertSingleLabMember(params: {
  courseId: string;
  lab: LabLocationDocument;
  role: LabMemberRole;
  nama: string;
  email: string;
  nim?: string;
  createdBy: string;
}): Promise<LabMemberDocument> {
  const cleanNama = params.nama.trim();
  const emailLower = normalizeEmailLower(params.email);
  const cleanNim = params.nim ? normalizeNim(params.nim) : undefined;

  if (cleanNama.length < 2) {
    throw new Error('Nama anggota wajib diisi minimal 2 karakter.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
    throw new Error('Format email tidak valid.');
  }
  if (params.role === 'praktikan' && (!cleanNim || !/^\d{8,20}$/.test(cleanNim))) {
    throw new Error('NIM praktikan wajib berupa 8-20 digit angka.');
  }

  let matchedUid: string | null = null;
  try {
    const userSnap = await getDocs(
      query(collection(db, USERS_COLLECTION), where('email', '==', emailLower))
    );
    if (!userSnap.empty) {
      matchedUid = userSnap.docs[0].id;
    }
  } catch {
    matchedUid = null;
  }

  const now = new Date().toISOString();
  const id =
    params.role === 'praktikan'
      ? buildPraktikanMemberId(params.courseId, cleanNim!)
      : buildAsprakMemberId(params.lab.id, emailLower);

  const payload: LabMemberDocument = {
    id,
    courseId: params.courseId,
    labId: params.lab.id,
    role: params.role,
    ...(cleanNim ? { nim: cleanNim } : {}),
    nama: cleanNama,
    email: emailLower,
    emailLower,
    uid: matchedUid,
    status: 'active',
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, LAB_MEMBERS_COLLECTION, id), payload, { merge: true });

  if (matchedUid) {
    try {
      if (params.role === 'praktikan') {
        await updateDoc(doc(db, USERS_COLLECTION, matchedUid), {
          labId: params.lab.id,
          updatedAt: now,
        });
      } else {
        await updateDoc(doc(db, USERS_COLLECTION, matchedUid), {
          labIds: arrayUnion(params.lab.id),
          updatedAt: now,
        });
      }
    } catch {
      // non-fatal
    }
  }

  return payload;
}
