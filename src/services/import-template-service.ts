import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

import type { ImportBatchType } from '@/types/praktikum';

export interface TemplateColumnSpec {
  key: string;
  required: boolean;
  description: string;
  example: string;
}

export interface TemplateDefinition {
  type: ImportBatchType;
  baseFileName: string;
  title: string;
  columns: TemplateColumnSpec[];
  sampleRows: Record<string, string>[];
}

export const IMPORT_TEMPLATES: Record<ImportBatchType, TemplateDefinition> = {
  lab: {
    type: 'lab',
    baseFileName: 'template-impor-lab',
    title: 'Template Impor Laboratorium',
    columns: [
      { key: 'nama_lab', required: true, description: 'Nama ruang laboratorium', example: 'Lab Komputasi 1' },
      { key: 'kode_lab', required: true, description: 'Kode unik lab per mata kuliah', example: 'PPK-LAB-1' },
      { key: 'gedung', required: true, description: 'Nama gedung / lantai', example: 'Gedung E Lt. 2 FSM UNDIP' },
      { key: 'latitude', required: true, description: 'Koordinat lintang (-90 s.d. 90)', example: '-7.049120' },
      { key: 'longitude', required: true, description: 'Koordinat bujur (-180 s.d. 180)', example: '110.440820' },
      { key: 'radius_meter', required: false, description: 'Radius presensi 15-500 m (default 50)', example: '50' },
      { key: 'grace_menit', required: false, description: 'Toleransi telat 0-120 menit (default 15)', example: '15' },
      { key: 'nominal_denda', required: false, description: 'Denda Rupiah 1000-1000000 (default 10000)', example: '10000' },
      { key: 'kapasitas', required: false, description: 'Kapasitas praktikan (opsional)', example: '36' },
      { key: 'kelas', required: false, description: 'Label kelas (opsional, mis. A/B)', example: 'A' },
    ],
    sampleRows: [
      {
        nama_lab: 'Lab Komputasi Dasar 1',
        kode_lab: 'PPK-LAB-1',
        gedung: 'Gedung E Lt. 2 FSM UNDIP',
        latitude: '-7.049120',
        longitude: '110.440820',
        radius_meter: '50',
        grace_menit: '15',
        nominal_denda: '10000',
        kapasitas: '36',
        kelas: 'A',
      },
      {
        nama_lab: 'Lab Komputasi Dasar 2',
        kode_lab: 'PPK-LAB-2',
        gedung: 'Gedung E Lt. 2 FSM UNDIP',
        latitude: '-7.049180',
        longitude: '110.440950',
        radius_meter: '50',
        grace_menit: '15',
        nominal_denda: '10000',
        kapasitas: '36',
        kelas: 'B',
      },
    ],
  },
  praktikan: {
    type: 'praktikan',
    baseFileName: 'template-impor-praktikan',
    title: 'Template Impor Praktikan',
    columns: [
      { key: 'nim', required: true, description: 'NIM mahasiswa numerik 8-20 digit (unik per mata kuliah)', example: '24060123140001' },
      { key: 'nama', required: true, description: 'Nama lengkap mahasiswa', example: 'Bima Pratama' },
      { key: 'email', required: true, description: 'Email mahasiswa (kunci auto-link akun)', example: 'bima@students.undip.ac.id' },
      { key: 'kode_lab', required: false, description: 'Opsional; jika kosong memakai lab tujuan terpilih', example: 'PPK-LAB-1' },
    ],
    sampleRows: [
      {
        nim: '24060123140001',
        nama: 'Bima Pratama',
        email: 'bima@students.undip.ac.id',
        kode_lab: 'PPK-LAB-1',
      },
      {
        nim: '24060123140002',
        nama: 'Citra Maharani',
        email: 'citra@students.undip.ac.id',
        kode_lab: '',
      },
    ],
  },
  asprak: {
    type: 'asprak',
    baseFileName: 'template-impor-asprak',
    title: 'Template Impor Asisten Praktikum',
    columns: [
      { key: 'nama', required: true, description: 'Nama lengkap Asprak', example: 'Dimas Wijaya' },
      { key: 'email', required: true, description: 'Email Asprak (kunci auto-link akun)', example: 'dimas.asprak@students.undip.ac.id' },
      { key: 'nim', required: false, description: 'NIM Asprak (opsional)', example: '24060121130011' },
      { key: 'kode_lab', required: false, description: 'Opsional; jika kosong memakai lab tujuan terpilih', example: 'PPK-LAB-1' },
    ],
    sampleRows: [
      {
        nama: 'Dimas Wijaya',
        email: 'dimas.asprak@students.undip.ac.id',
        nim: '24060121130011',
        kode_lab: 'PPK-LAB-1',
      },
      {
        nama: 'Nadia Kusuma',
        email: 'nadia.asprak@students.undip.ac.id',
        nim: '24060121130012',
        kode_lab: '',
      },
    ],
  },
};

function escapeCsvCell(val: string): string {
  const needsQuote = val.includes(',') || val.includes('"') || val.includes('\n');
  if (!needsQuote) return val;
  return `"${val.replace(/"/g, '""')}"`;
}

export function buildCsvTemplateContent(type: ImportBatchType): string {
  const def = IMPORT_TEMPLATES[type];
  const headerLine = def.columns.map((c) => escapeCsvCell(c.key)).join(',');
  const dataLines = def.sampleRows.map((row) =>
    def.columns.map((c) => escapeCsvCell(row[c.key] ?? '')).join(',')
  );
  return `\uFEFF${[headerLine, ...dataLines].join('\r\n')}\r\n`;
}

export function buildXlsxTemplateBytes(type: ImportBatchType): Uint8Array {
  const def = IMPORT_TEMPLATES[type];
  const headers = def.columns.map((c) => c.key);

  const templateAoA: string[][] = [
    headers,
    ...def.sampleRows.map((row) => headers.map((h) => row[h] ?? '')),
  ];

  const guideAoA: string[][] = [
    ['Kolom', 'Status', 'Keterangan', 'Contoh'],
    ...def.columns.map((c) => [
      c.key,
      c.required ? 'Wajib' : 'Opsional',
      c.description,
      c.example,
    ]),
  ];

  const wb = XLSX.utils.book_new();
  const wsData = XLSX.utils.aoa_to_sheet(templateAoA);
  const wsGuide = XLSX.utils.aoa_to_sheet(guideAoA);
  XLSX.utils.book_append_sheet(wb, wsData, 'Template');
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan');

  const rawArray = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer | number[];
  return new Uint8Array(rawArray);
}

/**
 * Mengunduh / membagikan file template .csv (UTF-8 BOM) atau .xlsx pada Android, iOS, dan Web (FR-P1-04).
 */
export async function downloadImportTemplate(
  type: ImportBatchType,
  format: 'csv' | 'xlsx'
): Promise<string> {
  const def = IMPORT_TEMPLATES[type];
  const fileName = `${def.baseFileName}.${format}`;

  if (Platform.OS === 'web') {
    let blob: Blob;
    if (format === 'csv') {
      blob = new Blob([buildCsvTemplateContent(type)], { type: 'text/csv;charset=utf-8;' });
    } else {
      const bytes = buildXlsxTemplateBytes(type);
      const copy = new Uint8Array(bytes).buffer;
      blob = new Blob([copy], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return fileName;
  }

  const targetFile = new File(Paths.cache, fileName);
  targetFile.create({ overwrite: true });

  if (format === 'csv') {
    targetFile.write(buildCsvTemplateContent(type));
  } else {
    targetFile.write(buildXlsxTemplateBytes(type));
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Fitur bagikan/simpan berkas tidak tersedia pada perangkat ini.');
  }

  await Sharing.shareAsync(targetFile.uri, {
    dialogTitle: `Simpan ${def.title}`,
    mimeType:
      format === 'csv'
        ? 'text/csv'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return fileName;
}
