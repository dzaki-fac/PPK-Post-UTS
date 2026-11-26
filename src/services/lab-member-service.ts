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
 * Menautkan anggota lab pra-terdaftar (`lab_members` dengan `uid == null`)
 * saat pengguna masuk atau mendaftar dengan email yang sama, dan menyinkronkan
 * `users.labId` / `users.labIds` serta `courseId`. Kegagalan tidak memblokir login.
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
    let praktikanCourseId: string | undefined;
    let praktikanNim: string | undefined;
    const asprakLabIds: string[] = [];

    for (const d of snap.docs) {
      const data = d.data() as LabMemberDocument;
      if (data.uid !== params.uid) {
        if (data.uid == null) {
          batch.update(d.ref, { uid: params.uid, updatedAt: now });
          hasMemberUpdates = true;
        }
      }

      if (data.role === 'praktikan') {
        praktikanLabId = data.labId;
        praktikanCourseId = data.courseId;
        if (data.nim) {
          praktikanNim = data.nim;
        }
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
    if (praktikanCourseId && currentData.courseId !== praktikanCourseId) {
      userUpdates.courseId = praktikanCourseId;
      needsUserUpdate = true;
    }
    if (praktikanNim && !currentData.nim) {
      userUpdates.nim = praktikanNim;
      needsUserUpdate = true;
    }

    if (asprakLabIds.length > 0) {
      const existingLabIds = new Set(currentData.labIds ?? []);
      const hasNewLab = asprakLabIds.some((id) => !existingLabIds.has(id));
      if (hasNewLab) {
        userUpdates.labIds = arrayUnion(...asprakLabIds);
        needsUserUpdate = true;
      }
    }

    if (needsUserUpdate) {
      await updateDoc(userRef, userUpdates);
    }
  } catch (error) {
    console.warn('Sinkronisasi lab_members saat login dilewati (non-fatal):', error);
  }
}

/**
 * Listener real-time anggota aktif untuk suatu mata kuliah (filter opsional berdasarkan peran & lab).
 */
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
      list.sort((a, b) => {
        const labCmp = a.labNama.localeCompare(b.labNama);
        if (labCmp !== 0) return labCmp;
        return a.nama.localeCompare(b.nama);
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

/**
 * Mengambil seluruh anggota aktif untuk satu mata kuliah (sekali baca).
 */
export async function getActiveMembersByCourse(
  courseId: string
): Promise<LabMemberDocument[]> {
  const q = query(
    collection(db, LAB_MEMBERS_COLLECTION),
    where('courseId', '==', courseId),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    ...(d.data() as LabMemberDocument),
    id: d.id,
  }));
}

/**
 * Memeriksa apakah lab masih memiliki anggota aktif.
 */
export async function countActiveMembersByLab(labId: string): Promise<number> {
  const q = query(
    collection(db, LAB_MEMBERS_COLLECTION),
    where('labId', '==', labId),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  return snap.size;
}

/**
 * Memperbarui informasi anggota lab (nama / email) tanpa mengubah riwayat presensi/denda.
 */
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

  const ref = doc(db, LAB_MEMBERS_COLLECTION, memberId);
  await updateDoc(ref, {
    nama: cleanNama,
    email: cleanEmail,
    emailLower: cleanEmail,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Soft delete anggota lab (mengubah status menjadi 'removed' & melepas assignment lab pada /users).
 */
export async function softRemoveLabMember(member: LabMemberDocument): Promise<void> {
  const now = new Date().toISOString();
  const ref = doc(db, LAB_MEMBERS_COLLECTION, member.id);
  await updateDoc(ref, {
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
      console.warn('Gagal menyinkronkan penghapusan lab di /users (non-fatal):', error);
    }
  }
}

/**
 * Memindahkan 1 atau banyak anggota lab ke lab tujuan pada mata kuliah yang sama.
 * Jadwal sesi yang sudah dibuat tidak dipindahkan (sesuai aturan SRS4 FR-P1-08).
 * Mencatat audit trail ke `/lab_transfers` dan menyinkronkan `/users`.
 */
export async function transferLabMembers(params: {
  members: LabMemberDocument[];
  targetLab: LabLocationDocument;
  alasan?: string;
  actorUid: string;
  actorNama: string;
}): Promise<number> {
  const { members, targetLab, alasan, actorUid, actorNama } = params;
  const eligible = members.filter(
    (m) => m.status === 'active' && m.labId !== targetLab.id
  );
  if (eligible.length === 0) {
    throw new Error('Pilih minimal satu anggota yang berada di lab berbeda dari lab tujuan.');
  }

  for (const m of eligible) {
    if (targetLab.courseId && m.courseId !== targetLab.courseId) {
      throw new Error(
        `Anggota ${m.nama} berada pada mata kuliah berbeda sehingga tidak dapat dipindahkan ke ${targetLab.nama}.`
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
      const fromLabNama = member.labNama;
      let nextMemberId = member.id;

      if (member.role === 'asprak') {
        // Dokumen asprak menggunakan ID deterministik `${labId}_asprak_${emailKey}`
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
            labNama: targetLab.nama,
            status: 'active',
            updatedAt: now,
          };
          batch.set(doc(db, LAB_MEMBERS_COLLECTION, nextMemberId), nextDoc, { merge: true });
        } else {
          batch.update(doc(db, LAB_MEMBERS_COLLECTION, member.id), {
            labId: targetLab.id,
            labNama: targetLab.nama,
            updatedAt: now,
          });
        }
      } else {
        // Dokumen praktikan ID `${courseId}_praktikan_${nim}` tetap sama, cukup update labId & labNama
        batch.update(doc(db, LAB_MEMBERS_COLLECTION, member.id), {
          labId: targetLab.id,
          labNama: targetLab.nama,
          updatedAt: now,
        });
      }

      const transferRef = doc(collection(db, LAB_TRANSFERS_COLLECTION));
      const transferLog: LabTransferDocument = {
        id: transferRef.id,
        courseId: member.courseId,
        memberId: member.uid ?? nextMemberId,
        memberNama: member.nama,
        memberRole: member.role,
        ...(member.nim ? { nim: member.nim } : {}),
        fromLabId,
        fromLabNama,
        toLabId: targetLab.id,
        toLabNama: targetLab.nama,
        ...(alasan?.trim() ? { alasan: alasan.trim() } : {}),
        transferredBy: actorUid,
        transferredByNama: actorNama,
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

    // Bersihkan labId lama asprak dari users.labIds pada langkah terpisah (Firestore melarang arrayUnion + arrayRemove di field yang sama dalam satu update)
    for (const member of chunk) {
      if (member.role === 'asprak' && member.uid && member.labId !== targetLab.id) {
        try {
          await updateDoc(doc(db, USERS_COLLECTION, member.uid), {
            labIds: arrayRemove(member.labId),
            updatedAt: now,
          });
        } catch (err) {
          console.warn('Gagal membersihkan labIds lama asprak:', err);
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

/**
 * Menyimpan atau memperbarui satu anggota lab secara manual.
 */
export async function upsertSingleLabMember(params: {
  courseId: string;
  lab: LabLocationDocument;
  role: LabMemberRole;
  nama: string;
  email: string;
  nim?: string;
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
  if (params.role === 'praktikan' && (!cleanNim || cleanNim.length < 6)) {
    throw new Error('NIM praktikan wajib diisi.');
  }

  // Cari apakah email sudah punya akun /users agar langsung tertaut uid
  let matchedUid: string | null = null;
  try {
    const userQuery = query(
      collection(db, USERS_COLLECTION),
      where('email', '==', emailLower)
    );
    const userSnap = await getDocs(userQuery);
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
    labNama: params.lab.nama,
    role: params.role,
    uid: matchedUid,
    ...(cleanNim ? { nim: cleanNim } : {}),
    nama: cleanNama,
    email: emailLower,
    emailLower,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, LAB_MEMBERS_COLLECTION, id), payload, { merge: true });

  if (matchedUid) {
    try {
      if (params.role === 'praktikan') {
        await updateDoc(doc(db, USERS_COLLECTION, matchedUid), {
          labId: params.lab.id,
          courseId: params.courseId,
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
