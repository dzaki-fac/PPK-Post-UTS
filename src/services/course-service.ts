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
  const activeOnly = courses.filter((c) => c.isActive !== false);
  if (managedCourseIds && managedCourseIds.length > 0) {
    const allowed = new Set(managedCourseIds);
    const matched = activeOnly.filter((c) => allowed.has(c.id));
    if (matched.length > 0) return matched;
  }
  const byAslab = activeOnly.filter((c) => c.aslabIds?.includes(aslabUid));
  return byAslab.length > 0 ? byAslab : activeOnly;
}

export async function ensureDefaultCourse(aslabUid: string): Promise<CourseDocument> {
  const now = new Date().toISOString();
  const snap = await getDocs(collection(db, COURSES_COLLECTION));
  if (!snap.empty) {
    const first = snap.docs[0];
    return {
      ...(first.data() as CourseDocument),
      id: first.id,
      isActive: (first.data() as CourseDocument).isActive ?? true,
    };
  }

  const defaultCourse: CourseDocument = {
    id: DEFAULT_COURSE_ID,
    kode: DEFAULT_COURSE_KODE,
    nama: DEFAULT_COURSE_NAMA,
    semester: DEFAULT_COURSE_SEMESTER,
    aslabIds: [aslabUid],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, COURSES_COLLECTION, defaultCourse.id), defaultCourse, { merge: true });
  return defaultCourse;
}

export function subscribeManagedCourses(
  aslabUid: string,
  managedCourseIds: string[] | undefined,
  onData: (courses: CourseDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COURSES_COLLECTION),
    (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const raw = d.data() as CourseDocument;
        return {
          ...raw,
          id: d.id,
          isActive: raw.isActive ?? true,
        };
      });
      list.sort((a, b) => a.nama.localeCompare(b.nama));
      onData(filterCoursesForAslab(list, aslabUid, managedCourseIds));
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export async function createCourse(input: {
  kode: string;
  nama: string;
  semester?: string;
  aslabUid: string;
}): Promise<CourseDocument> {
  const kode = input.kode.trim().toUpperCase();
  const nama = input.nama.trim();
  if (!kode || !nama) {
    throw new Error('Kode dan nama mata kuliah wajib diisi.');
  }

  const now = new Date().toISOString();
  const ref = doc(collection(db, COURSES_COLLECTION));
  const course: CourseDocument = {
    id: ref.id,
    kode,
    nama,
    semester: input.semester?.trim() || DEFAULT_COURSE_SEMESTER,
    aslabIds: [input.aslabUid],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, course);
  return course;
}
