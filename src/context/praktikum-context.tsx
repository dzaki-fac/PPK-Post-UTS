import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  Sesi,
  Presensi,
  Praktikan,
  Asisten,
  IdentitasPengguna,
  StatusSesi,
} from '@/data/types';
import {
  DAFTAR_SESI,
  DAFTAR_PRAKTIKAN,
  DAFTAR_ASISTEN,
  DAFTAR_PRESENSI_AWAL,
} from '@/data';

type PraktikumContextType = {
  // Data
  sesiList: Sesi[];
  presensiList: Presensi[];
  daftarPraktikan: Praktikan[];
  daftarAsisten: Asisten[];
  pengguna: IdentitasPengguna;

  // Actions - Sesi
  bukaSesi: (sesiId: string) => boolean;
  tutupSesi: (sesiId: string) => boolean;
  getSesiById: (id: string) => Sesi | undefined;

  // Actions - Presensi
  tandaiPresensi: (sesiId: string, praktikanId: string) => { success: boolean; message: string };
  sudahPresensi: (sesiId: string, praktikanId: string) => boolean;
  getPresensiBySesi: (sesiId: string) => Presensi[];
  getPresensiByPraktikan: (praktikanId: string) => Presensi[];

  // Actions - Auth
  setPengguna: (pengguna: IdentitasPengguna) => void;
  logout: () => void;
};

const PraktikumContext = createContext<PraktikumContextType | undefined>(undefined);

export function PraktikumProvider({ children }: { children: ReactNode }) {
  const [sesiList, setSesiList] = useState<Sesi[]>(DAFTAR_SESI);
  const [presensiList, setPresensiList] = useState<Presensi[]>(DAFTAR_PRESENSI_AWAL);
  const [pengguna, setPenggunaState] = useState<IdentitasPengguna>(null);

  const daftarPraktikan = DAFTAR_PRAKTIKAN;
  const daftarAsisten = DAFTAR_ASISTEN;

  // Buka sesi - hanya jika status "belum-dibuka"
  const bukaSesi = useCallback((sesiId: string): boolean => {
    let success = false;
    setSesiList((prev) =>
      prev.map((sesi) => {
        if (sesi.id === sesiId && sesi.status === 'belum-dibuka') {
          success = true;
          return { ...sesi, status: 'dibuka' as StatusSesi };
        }
        return sesi;
      })
    );
    return success;
  }, []);

  // Tutup sesi - hanya jika status "dibuka"
  const tutupSesi = useCallback((sesiId: string): boolean => {
    let success = false;
    setSesiList((prev) =>
      prev.map((sesi) => {
        if (sesi.id === sesiId && sesi.status === 'dibuka') {
          success = true;
          return { ...sesi, status: 'ditutup' as StatusSesi };
        }
        return sesi;
      })
    );
    return success;
  }, []);

  // Get sesi by ID
  const getSesiById = useCallback(
    (id: string): Sesi | undefined => {
      return sesiList.find((sesi) => sesi.id === id);
    },
    [sesiList]
  );

  // Cek apakah sudah presensi
  const sudahPresensi = useCallback(
    (sesiId: string, praktikanId: string): boolean => {
      return presensiList.some(
        (p) => p.sesiId === sesiId && p.praktikanId === praktikanId
      );
    },
    [presensiList]
  );

  // Tandai presensi dengan validasi anti presensi ganda
  const tandaiPresensi = useCallback(
    (sesiId: string, praktikanId: string): { success: boolean; message: string } => {
      // Validasi: cek sesi ada dan status "dibuka"
      const sesi = sesiList.find((s) => s.id === sesiId);
      if (!sesi) {
        return { success: false, message: 'Sesi tidak ditemukan' };
      }
      if (sesi.status !== 'dibuka') {
        return { success: false, message: 'Sesi belum dibuka atau sudah ditutup' };
      }

      // Validasi: cek praktikan ada
      const praktikan = daftarPraktikan.find((p) => p.id === praktikanId);
      if (!praktikan) {
        return { success: false, message: 'Praktikan tidak ditemukan' };
      }

      // Validasi: anti presensi ganda
      if (sudahPresensi(sesiId, praktikanId)) {
        return { success: false, message: 'Anda sudah melakukan presensi pada sesi ini' };
      }

      // Catat presensi
      const presensiBaru: Presensi = {
        id: `pres-${Date.now()}`,
        sesiId,
        praktikanId,
        waktuKehadiran: new Date().toISOString(),
      };

      setPresensiList((prev) => [...prev, presensiBaru]);
      return { success: true, message: 'Presensi berhasil dicatat' };
    },
    [sesiList, daftarPraktikan, sudahPresensi]
  );

  // Get presensi by sesi
  const getPresensiBySesi = useCallback(
    (sesiId: string): Presensi[] => {
      return presensiList.filter((p) => p.sesiId === sesiId);
    },
    [presensiList]
  );

  // Get presensi by praktikan
  const getPresensiByPraktikan = useCallback(
    (praktikanId: string): Presensi[] => {
      return presensiList.filter((p) => p.praktikanId === praktikanId);
    },
    [presensiList]
  );

  // Set pengguna
  const setPengguna = useCallback((user: IdentitasPengguna) => {
    setPenggunaState(user);
  }, []);

  // Logout
  const logout = useCallback(() => {
    setPenggunaState(null);
  }, []);

  const value: PraktikumContextType = {
    sesiList,
    presensiList,
    daftarPraktikan,
    daftarAsisten,
    pengguna,
    bukaSesi,
    tutupSesi,
    getSesiById,
    tandaiPresensi,
    sudahPresensi,
    getPresensiBySesi,
    getPresensiByPraktikan,
    setPengguna,
    logout,
  };

  return (
    <PraktikumContext.Provider value={value}>
      {children}
    </PraktikumContext.Provider>
  );
}

export function usePraktikum() {
  const context = useContext(PraktikumContext);
  if (context === undefined) {
    throw new Error('usePraktikum harus digunakan di dalam PraktikumProvider');
  }
  return context;
}
