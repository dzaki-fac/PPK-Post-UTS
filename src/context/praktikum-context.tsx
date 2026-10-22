import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  DUMMY_ASISTEN,
  DUMMY_PRAKTIKAN,
  DUMMY_PRESENSI_AWAL,
  DUMMY_SESI,
} from '@/data/dummy';
import { Asisten, Praktikan, Presensi, RiwayatItem, Sesi } from '@/types/praktikum';

type UserRole = 'praktikan' | 'asisten' | null;

interface PraktikumContextType {
  role: UserRole;
  currentPraktikan: Praktikan | null;
  currentAsisten: Asisten | null;
  sesiList: Sesi[];
  presensiList: Presensi[];
  allPraktikan: Praktikan[];
  allAsisten: Asisten[];
  setRole: (role: UserRole) => void;
  setCurrentPraktikan: (praktikan: Praktikan | null) => void;
  setCurrentAsisten: (asisten: Asisten | null) => void;
  bukaSesi: (sesiId: string) => { success: boolean; message: string };
  tutupSesi: (sesiId: string) => { success: boolean; message: string };
  tandaiPresensi: (
    sesiId: string,
    praktikanId: string
  ) => { success: boolean; message: string };
  isSudahPresensi: (sesiId: string, praktikanId: string) => boolean;
  getRiwayatPraktikan: (praktikanId: string) => RiwayatItem[];
  getPresensiForSesi: (sesiId: string) => Presensi[];
  resetData: () => void;
}

const PraktikumContext = createContext<PraktikumContextType | undefined>(undefined);

export function PraktikumProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>('praktikan');
  const [currentPraktikan, setCurrentPraktikan] = useState<Praktikan | null>(
    DUMMY_PRAKTIKAN[0]
  );
  const [currentAsisten, setCurrentAsisten] = useState<Asisten | null>(
    DUMMY_ASISTEN[0]
  );
  const [sesiList, setSesiList] = useState<Sesi[]>(DUMMY_SESI);
  const [presensiList, setPresensiList] = useState<Presensi[]>(DUMMY_PRESENSI_AWAL);

  const isSudahPresensi = useCallback(
    (sesiId: string, praktikanId: string) => {
      return presensiList.some(
        (p) => p.sesiId === sesiId && p.praktikanId === praktikanId
      );
    },
    [presensiList]
  );

  const tandaiPresensi = useCallback(
    (sesiId: string, praktikanId: string) => {
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

      const sudah = presensiList.some(
        (p) => p.sesiId === sesiId && p.praktikanId === praktikanId
      );

      if (sudah) {
        return {
          success: false,
          message: 'Anda sudah melakukan presensi pada sesi ini.',
        };
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
    [sesiList, presensiList]
  );

  const bukaSesi = useCallback((sesiId: string) => {
    let result = { success: false, message: 'Sesi tidak ditemukan.' };
    setSesiList((prev) =>
      prev.map((s) => {
        if (s.id === sesiId) {
          if (s.status === 'ditutup') {
            result = {
              success: false,
              message: 'Sesi yang sudah ditutup tidak dapat dibuka kembali.',
            };
            return s;
          }
          result = { success: true, message: `Sesi "${s.praktikum}" berhasil dibuka.` };
          return { ...s, status: 'dibuka' as const };
        }
        return s;
      })
    );
    return result;
  }, []);

  const tutupSesi = useCallback((sesiId: string) => {
    let result = { success: false, message: 'Sesi tidak ditemukan.' };
    setSesiList((prev) =>
      prev.map((s) => {
        if (s.id === sesiId) {
          result = { success: true, message: `Sesi "${s.praktikum}" berhasil ditutup.` };
          return { ...s, status: 'ditutup' as const };
        }
        return s;
      })
    );
    return result;
  }, []);

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

  const resetData = useCallback(() => {
    setSesiList(DUMMY_SESI);
    setPresensiList(DUMMY_PRESENSI_AWAL);
  }, []);

  const value = useMemo(
    () => ({
      role,
      currentPraktikan,
      currentAsisten,
      sesiList,
      presensiList,
      allPraktikan: DUMMY_PRAKTIKAN,
      allAsisten: DUMMY_ASISTEN,
      setRole,
      setCurrentPraktikan,
      setCurrentAsisten,
      bukaSesi,
      tutupSesi,
      tandaiPresensi,
      isSudahPresensi,
      getRiwayatPraktikan,
      getPresensiForSesi,
      resetData,
    }),
    [
      role,
      currentPraktikan,
      currentAsisten,
      sesiList,
      presensiList,
      bukaSesi,
      tutupSesi,
      tandaiPresensi,
      isSudahPresensi,
      getRiwayatPraktikan,
      getPresensiForSesi,
      resetData,
    ]
  );

  return (
    <PraktikumContext.Provider value={value}>{children}</PraktikumContext.Provider>
  );
}

export function usePraktikum() {
  const context = useContext(PraktikumContext);
  if (!context) {
    throw new Error('usePraktikum must be used within a PraktikumProvider');
  }
  return context;
}
