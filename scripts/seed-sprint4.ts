/**
 * Skrip seed awal Sprint 4 untuk mata kuliah PPK, contoh laboratorium, dan akun Aslab (FR-P1-01.4).
 */

import { doc, setDoc } from 'firebase/firestore';

import {
  DEFAULT_COURSE_ID,
  DEFAULT_COURSE_KODE,
  DEFAULT_COURSE_NAMA,
  DEFAULT_COURSE_SEMESTER,
  DEFAULT_FINE_AMOUNT,
  DEFAULT_GRACE_MINUTES,
  DEFAULT_RADIUS_METER,
} from '@/constants/praktikum-config';
import { db } from '@/lib/firebase';
import type { CourseDocument, LabLocationDocument, UserDocument } from '@/types/praktikum';

export async function seedSprint4Foundation(options?: {
  aslabUid?: string;
  aslabEmail?: string;
  aslabNama?: string;
}): Promise<{
  courseId: string;
  labIds: string[];
  aslabUid: string;
}> {
  const now = new Date().toISOString();
  const aslabUid = options?.aslabUid ?? 'seed-aslab-ppk-1';
  const aslabEmail = (options?.aslabEmail ?? 'aslab.ppk@if.undip.ac.id').toLowerCase();
  const aslabNama = options?.aslabNama ?? 'Koordinator Aslab PPK';

  const course: CourseDocument = {
    id: DEFAULT_COURSE_ID,
    kode: DEFAULT_COURSE_KODE,
    nama: DEFAULT_COURSE_NAMA,
    semester: DEFAULT_COURSE_SEMESTER,
    aslabIds: [aslabUid],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'courses', course.id), course, { merge: true });

  const sampleLabs: LabLocationDocument[] = [
    {
      id: 'ppk-lab-1',
      courseId: course.id,
      courseNama: course.nama,
      nama: 'Lab Komputasi Dasar 1',
      kode: 'PPK-LAB-1',
      gedung: 'Gedung E Lt. 2 FSM UNDIP',
      latitude: -7.04912,
      longitude: 110.44082,
      radiusMeter: DEFAULT_RADIUS_METER,
      graceMinutes: DEFAULT_GRACE_MINUTES,
      fineAmount: DEFAULT_FINE_AMOUNT,
      kapasitas: 36,
      kelas: 'A',
      isActive: true,
      updatedBy: aslabUid,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ppk-lab-2',
      courseId: course.id,
      courseNama: course.nama,
      nama: 'Lab Komputasi Dasar 2',
      kode: 'PPK-LAB-2',
      gedung: 'Gedung E Lt. 2 FSM UNDIP',
      latitude: -7.04918,
      longitude: 110.44095,
      radiusMeter: DEFAULT_RADIUS_METER,
      graceMinutes: DEFAULT_GRACE_MINUTES,
      fineAmount: DEFAULT_FINE_AMOUNT,
      kapasitas: 36,
      kelas: 'B',
      isActive: true,
      updatedBy: aslabUid,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const lab of sampleLabs) {
    await setDoc(doc(db, 'labs', lab.id), lab, { merge: true });
  }

  const aslabUser: UserDocument = {
    uid: aslabUid,
    email: aslabEmail,
    emailLower: aslabEmail,
    nama: aslabNama,
    peran: 'aslab',
    peranLab: 'Koordinator Laboratorium',
    managedCourseIds: [course.id],
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'users', aslabUid), aslabUser, { merge: true });

  return {
    courseId: course.id,
    labIds: sampleLabs.map((l) => l.id),
    aslabUid,
  };
}
