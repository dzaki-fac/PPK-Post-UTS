import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  DUMMY_ASISTEN,
  DUMMY_PRAKTIKAN,
  DUMMY_PRESENSI_AWAL,
  DUMMY_SESI,
} from '@/data/dummy';
import { IdentitasPengguna, Peran } from '@/data/types';
import { Asisten, Praktikan, Presensi, RiwayatItem, Sesi } from '@/types/praktikum';

interface PraktikumContextType {
  role: Peran;
  currentPraktikan: Praktikan | null;
  currentAsisten: Asisten | null;
  sesiList: Sesi[];
  presensiList: Presensi[];
  allPraktikan: Praktikan[];
  allAsisten: Asisten[];
  setRole: (role: Peran) => void;
  setCurrentPraktikan: (praktikan: Praktikan | null) => void;
  setCurrentAsisten: (asisten: Asisten | null) => void;

  pengguna: IdentitasPengguna;
  daftarPraktikan: Praktikan[];
  daftarAsisten: Asisten[];
  tambahPraktikan: (data: Omit<Praktikan, 'id'>) => Praktikan;
  editPraktikan: (id: string, updates: Partial<Omit<Praktikan, 'id'>>) => boolean;
  hapusPraktikan: (id: string) => boolean;
  bukaSesi: (sesiId: string) => boolean;
  tutupSesi: (sesiId: string) => boolean;
  bukaKembaliSesi: (sesiId: string) => boolean;
  tambahSesi: (data: Omit<Sesi, 'id'>) => Sesi;
  editSesi: (sesiId: string, updates: Partial<Omit<Sesi, 'id'>>) => boolean;
  hapusSesi: (sesiId: string) => boolean;
  getSesiById: (id: string) => Sesi | undefined;
  tandaiPresensi: (
    sesiId: string,
    praktikanId: string,
    kodeInput?: string
  ) => { success: boolean; message: string };
  isSudahPresensi: (sesiId: string, praktikanId: string) => boolean;
  sudahPresensi: (sesiId: string, praktikanId: string) => boolean;
  getRiwayatPraktikan: (praktikanId: string) => RiwayatItem[];
  getPresensiForSesi: (sesiId: string) => Presensi[];
  getPresensiBySesi: (sesiId: string) => Presensi[];
  getPresensiByPraktikan: (praktikanId: string) => Presensi[];
  setPengguna: (pengguna: IdentitasPengguna) => void;
  logout: () => void;
  resetData: () => void;
}

const PraktikumContext = createContext<PraktikumContextType | undefined>(undefined);

export function PraktikumProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Peran>('praktikan');
  const [currentPraktikan, setCurrentPraktikan] = useState<Praktikan | null>(
    DUMMY_PRAKTIKAN[0]
  );
  const [currentAsisten, setCurrentAsisten] = useState<Asisten | null>(
    DUMMY_ASISTEN[0]
  );
  const [sesiList, setSesiList] = useState<Sesi[]>(DUMMY_SESI);
  const [presensiList, setPresensiList] = useState<Presensi[]>(DUMMY_PRESENSI_AWAL);
  const [praktikanList, setPraktikanList] = useState<Praktikan[]>(DUMMY_PRAKTIKAN);

  const tambahPraktikan = useCallback((data: Omit<Praktikan, 'id'>): Praktikan => {
    const newPraktikan: Praktikan = {
      id: `mhs-${Date.now()}`,
      nama: data.nama.trim(),
      nim: data.nim.trim(),
      kelas: data.kelas.trim(),
    };
    setPraktikanList((prev) => [newPraktikan, ...prev]);
    return newPraktikan;
  }, []);

  const editPraktikan = useCallback(
    (id: string, updates: Partial<Omit<Praktikan, 'id'>>): boolean => {
      let success = false;
      setPraktikanList((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            success = true;
            return {
              ...p,
              ...(updates.nama !== undefined ? { nama: updates.nama.trim() } : {}),
              ...(updates.nim !== undefined ? { nim: updates.nim.trim() } : {}),
              ...(updates.kelas !== undefined ? { kelas: updates.kelas.trim() } : {}),
            };
          }
          return p;
        })
      );
      setCurrentPraktikan((prev) =>
        prev && prev.id === id ? { ...prev, ...updates } : prev
      );
      return success;
    },
    []
  );

  const hapusPraktikan = useCallback((id: string): boolean => {
    let success = false;
    setPraktikanList((prev) => {
      if (prev.some((p) => p.id === id)) {
        success = true;
        return prev.filter((p) => p.id !== id);
      }
      return prev;
    });
    if (success) {
      setPresensiList((prev) => prev.filter((p) => p.praktikanId !== id));
      setCurrentPraktikan((prev) => (prev && prev.id === id ? null : prev));
    }
    return success;
  }, []);

  const bukaSesi = useCallback((sesiId: string): boolean => {
    let success = false;
    setSesiList((prev) =>
      prev.map((s) => {
        if (s.id === sesiId && s.status === 'belum-dibuka') {
          success = true;
          return { ...s, status: 'dibuka' as const };
        }
        return s;
      })
    );
    return success;
  }, []);

  const tutupSesi = useCallback((sesiId: string): boolean => {
    let success = false;
    setSesiList((prev) =>
      prev.map((s) => {
        if (s.id === sesiId && s.status === 'dibuka') {
          success = true;
          return { ...s, status: 'ditutup' as const };
        }
        return s;
      })
    );
    return success;
  }, []);

  const bukaKembaliSesi = useCallback((sesiId: string): boolean => {
    let success = false;
    setSesiList((prev) =>
      prev.map((s) => {
        if (s.id === sesiId && s.status === 'ditutup') {
          success = true;
          return { ...s, status: 'dibuka' as const };
        }
        return s;
      })
    );
    return success;
  }, []);

  const tambahSesi = useCallback((data: Omit<Sesi, 'id'>): Sesi => {
    const randomCode = String(Math.floor(1000 + Math.random() * 9000));
    const newSesi: Sesi = {
      ...data,
      id: `sesi-${Date.now()}`,
      kodeSesi: data.kodeSesi || randomCode,
    };
    setSesiList((prev) => [newSesi, ...prev]);
    return newSesi;
  }, []);

  const editSesi = useCallback(
    (sesiId: string, updates: Partial<Omit<Sesi, 'id'>>): boolean => {
      let success = false;
      setSesiList((prev) =>
        prev.map((s) => {
          if (s.id === sesiId) {
            success = true;
            return { ...s, ...updates };
          }
          return s;
        })
      );
      return success;
    },
    []
  );

  const hapusSesi = useCallback((sesiId: string): boolean => {
    let success = false;
    setSesiList((prev) => {
      const exists = prev.some((s) => s.id === sesiId);
      if (exists) {
        success = true;
        return prev.filter((s) => s.id !== sesiId);
      }
      return prev;
    });
    if (success) {
      setPresensiList((prev) => prev.filter((p) => p.sesiId !== sesiId));
    }
    return success;
  }, []);

  const getSesiById = useCallback(
    (id: string): Sesi | undefined => {
      return sesiList.find((s) => s.id === id);
    },
    [sesiList]
  );

  const isSudahPresensi = useCallback(
    (sesiId: string, praktikanId: string) => {
      return presensiList.some(
        (p) => p.sesiId === sesiId && p.praktikanId === praktikanId
      );
    },
    [presensiList]
  );

  const tandaiPresensi = useCallback(
    (sesiId: string, praktikanId: string, kodeInput?: string) => {
      const sesi = sesiList.find((s) => s.id === sesiId);
      if (!sesi) {
        return { success: false, message: 'Sesi praktikum tidak ditemukan.' };
      }

      if (sesi.status !== 'dibuka') {
        return {
          success: false,
          message:
            sesi.status === 'ditutup'
              ? 'Sesi praktikum ini telah ditutup.'
              : 'Sesi praktikum ini belum dibuka oleh asisten.',
        };
      }

      // Validasi kesesuaian kelas praktikan vs kelas sesi
      const praktikan = praktikanList.find((p) => p.id === praktikanId);
      if (praktikan && sesi.kelas) {
        const kodeKelas = sesi.kelas.replace(/[^A-Za-z]/g, '').slice(-1);
        if (kodeKelas && praktikan.kelas.toUpperCase() !== kodeKelas.toUpperCase()) {
          return {
            success: false,
            message: `Presensi ditolak. Sesi ini khusus untuk ${sesi.kelas}, sedangkan Anda terdaftar di Kelas ${praktikan.kelas}.`,
          };
        }
      }

      const sudah = presensiList.some(
        (p) => p.sesiId === sesiId && p.praktikanId === praktikanId
      );

      if (sudah) {
        return {
          success: false,
          message: 'Anda sudah melakukan presensi pada sesi ini.',
        };
      }

      // Validasi kode sesi 4 digit
      if (sesi.kodeSesi) {
        if (!kodeInput || kodeInput.trim() !== sesi.kodeSesi) {
          return {
            success: false,
            message: 'Kode sesi presensi tidak sesuai. Silakan masukkan 4 digit kode yang diberikan oleh asisten di ruang lab.',
          };
        }
      }

      const now = new Date();
      const jam = String(now.getHours()).padStart(2, '0');
      const menit = String(now.getMinutes()).padStart(2, '0');
      const detik = String(now.getSeconds()).padStart(2, '0');
      const tanggalFormat = `${sesi.tanggal}, ${jam}:${menit}:${detik} WIB`;

      const newPresensi: Presensi = {
        id: `pres-${Date.now()}`,
        sesiId,
        praktikanId,
        waktuKehadiran: tanggalFormat,
      };

      setPresensiList((prev) => [newPresensi, ...prev]);

      return {
        success: true,
        message: 'Presensi berhasil dicatat! Kehadiran Anda telah terverifikasi.',
      };
    },
    [sesiList, presensiList, praktikanList]
  );

  const getRiwayatPraktikan = useCallback(
    (praktikanId: string): RiwayatItem[] => {
      const records = presensiList.filter((p) => p.praktikanId === praktikanId);
      return records.map((rec) => ({
        ...rec,
        sesi: sesiList.find((s) => s.id === rec.sesiId),
      }));
    },
    [presensiList, sesiList]
  );

  const getPresensiForSesi = useCallback(
    (sesiId: string) => {
      return presensiList.filter((p) => p.sesiId === sesiId);
    },
    [presensiList]
  );

  const getPresensiByPraktikan = useCallback(
    (praktikanId: string): Presensi[] => {
      return presensiList.filter((p) => p.praktikanId === praktikanId);
    },
    [presensiList]
  );

  const setPengguna = useCallback((user: IdentitasPengguna) => {
    if (!user) {
      setRole(null);
      setCurrentPraktikan(null);
      setCurrentAsisten(null);
      return;
    }
    setRole(user.peran);
    if (user.peran === 'praktikan') {
      setCurrentPraktikan(user.data);
      setCurrentAsisten(null);
    } else {
      setCurrentAsisten(user.data);
      setCurrentPraktikan(null);
    }
  }, []);

  const logout = useCallback(() => {
    setRole(null);
    setCurrentPraktikan(null);
    setCurrentAsisten(null);
  }, []);

  const resetData = useCallback(() => {
    setSesiList(DUMMY_SESI);
    setPresensiList(DUMMY_PRESENSI_AWAL);
    setPraktikanList(DUMMY_PRAKTIKAN);
  }, []);

  const pengguna = useMemo<IdentitasPengguna>(() => {
    if (role === 'praktikan' && currentPraktikan) {
      return { peran: 'praktikan', data: currentPraktikan };
    }
    if (role === 'asisten' && currentAsisten) {
      return { peran: 'asisten', data: currentAsisten };
    }
    return null;
  }, [role, currentPraktikan, currentAsisten]);

  const value = useMemo(
    () => ({
      role,
      currentPraktikan,
      currentAsisten,
      sesiList,
      presensiList,
      allPraktikan: praktikanList,
      allAsisten: DUMMY_ASISTEN,
      daftarPraktikan: praktikanList,
      daftarAsisten: DUMMY_ASISTEN,
      setRole,
      setCurrentPraktikan,
      setCurrentAsisten,
      tambahPraktikan,
      editPraktikan,
      hapusPraktikan,
      bukaSesi,
      tutupSesi,
      bukaKembaliSesi,
      tambahSesi,
      editSesi,
      hapusSesi,
      getSesiById,
      tandaiPresensi,
      isSudahPresensi,
      sudahPresensi: isSudahPresensi,
      getRiwayatPraktikan,
      getPresensiForSesi,
      getPresensiBySesi: getPresensiForSesi,
      getPresensiByPraktikan,
      setPengguna,
      logout,
      resetData,
      pengguna,
    }),
    [
      role,
      currentPraktikan,
      currentAsisten,
      sesiList,
      presensiList,
      praktikanList,
      tambahPraktikan,
      editPraktikan,
      hapusPraktikan,
      bukaSesi,
      tutupSesi,
      bukaKembaliSesi,
      tambahSesi,
      editSesi,
      hapusSesi,
      getSesiById,
      tandaiPresensi,
      isSudahPresensi,
      getRiwayatPraktikan,
      getPresensiForSesi,
      getPresensiByPraktikan,
      setPengguna,
      logout,
      resetData,
      pengguna,
    ]
  );

  return (
    <PraktikumContext.Provider value={value}>{children}</PraktikumContext.Provider>
  );
}

export function usePraktikum() {
  const context = useContext(PraktikumContext);
  if (!context) {
    throw new Error('usePraktikum harus digunakan di dalam PraktikumProvider');
  }
  return context;
}
