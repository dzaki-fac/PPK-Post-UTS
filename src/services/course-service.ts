import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';

import {
  DEFAULT_COURSE_ID,
  DEFAULT_COURSE_KODE,
  DEFAULT_COURSE_NAMA,
  DEFAULT_COURSE_SEMESTER,
} from '@/constants/praktikum-config';
import { db } from '@/lib/firebase';
import type { CourseDocument } from '@/types/praktikum';

export const COURSES_COLLECTION = 'courses';

function filterCoursesForAslab(
  courses: CourseDocument[],
  aslabUid: string,
  managedCourseIds?: string[]
): CourseDocument[] {
  if (managedCourseIds && managedCourseIds.length > 0) {
    const allowed = new Set(managedCourseIds);
    const matched = courses.filter((c) => allowed.has(c.id));
    if (matched.length > 0) return matched;
  }
  const byAslabField = courses.filter((c) => c.aslabIds?.includes(aslabUid));
  return byAslabField.length > 0 ? byAslabField : courses;
}

/**
 * Memastikan minimal satu mata kuliah default tersedia di Firestore saat Aslab membuka panel.
 */
export async function ensureDefaultCourse(aslabUid: string): Promise<CourseDocument> {
  const now = new Date().toISOString();
  const snap = await getDocs(collection(db, COURSES_COLLECTION));
  if (!snap.empty) {
    const existing = snap.docs[0];
    return {
      ...(existing.data() as CourseDocument),
      id: existing.id,
    };
  }

  const defaultCourse: CourseDocument = {
    id: DEFAULT_COURSE_ID,
    kode: DEFAULT_COURSE_KODE,
    nama: DEFAULT_COURSE_NAMA,
    semester: DEFAULT_COURSE_SEMESTER,
    aslabIds: [aslabUid],
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, COURSES_COLLECTION, defaultCourse.id), defaultCourse, { merge: true });
  return defaultCourse;
}

/**
 * Mengambil daftar mata kuliah yang dikelola oleh Aslab (sekali baca).
 */
export async function getManagedCourses(
  aslabUid: string,
  managedCourseIds?: string[]
): Promise<CourseDocument[]> {
  const snap = await getDocs(collection(db, COURSES_COLLECTION));
  const list = snap.docs.map((d) => ({
    ...(d.data() as CourseDocument),
    id: d.id,
  }));
  list.sort((a, b) => a.nama.localeCompare(b.nama));
  return filterCoursesForAslab(list, aslabUid, managedCourseIds);
}

/**
 * Listener real-time daftar mata kuliah yang dapat dikelola Aslab.
 */
export function subscribeManagedCourses(
  aslabUid: string,
  managedCourseIds: string[] | undefined,
  onData: (courses: CourseDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COURSES_COLLECTION),
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        ...(d.data() as CourseDocument),
        id: d.id,
      }));
      list.sort((a, b) => a.nama.localeCompare(b.nama));
      onData(filterCoursesForAslab(list, aslabUid, managedCourseIds));
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

/**
 * Membuat mata kuliah baru oleh Aslab.
 */
export async function createCourse(input: {
  kode: string;
  nama: string;
  semester: string;
  aslabUid: string;
}): Promise<CourseDocument> {
  const kode = input.kode.trim().toUpperCase();
  const nama = input.nama.trim();
  const semester = input.semester.trim();
  if (!kode || !nama) {
    throw new Error('Kode dan nama mata kuliah wajib diisi.');
  }

  const now = new Date().toISOString();
  const ref = doc(collection(db, COURSES_COLLECTION));
  const course: CourseDocument = {
    id: ref.id,
    kode,
    nama,
    semester: semester || DEFAULT_COURSE_SEMESTER,
    aslabIds: [input.aslabUid],
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, course);
  return course;
}
