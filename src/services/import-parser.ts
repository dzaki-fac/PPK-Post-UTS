import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import Papa from 'papaparse';
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

export interface ParsedSpreadsheetResult {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
}

export function normalizeHeaderKey(rawHeader: string): string {
  return rawHeader
    .replace(/^\uFEFF/, '')
    .replace(/\*/g, '')
    .replace(/\(opsional\)/gi, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function cleanRowObject(raw: Record<string, unknown>): Record<string, string> {
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const normKey = normalizeHeaderKey(k);
    if (!normKey) continue;
    cleaned[normKey] = v === null || v === undefined ? '' : String(v).trim();
  }
  return cleaned;
}

function isEmptyOrCommentRow(row: Record<string, string>): boolean {
  const values = Object.values(row);
  if (values.every((v) => !v.trim())) return true;
  const firstNonEmpty = values.find((v) => v.trim().length > 0) ?? '';
  return firstNonEmpty.trim().startsWith('#');
}

export function parseCsvText(csvText: string, fileName = 'data.csv'): ParsedSpreadsheetResult {
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const parsed = Papa.parse<Record<string, unknown>>(cleanText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => normalizeHeaderKey(h),
  });

  const headers = (parsed.meta.fields ?? []).map(normalizeHeaderKey).filter(Boolean);
  const rows = parsed.data.map(cleanRowObject).filter((row) => !isEmptyOrCommentRow(row));
  return { fileName, headers, rows };
}

export function parseWorkbookArrayBuffer(
  buffer: ArrayBuffer,
  fileName = 'data.xlsx'
): ParsedSpreadsheetResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { fileName, headers: [], rows: [] };
  }
  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  const headerSet = new Set<string>();
  const rows = rawRows
    .map((raw) => {
      const cleaned = cleanRowObject(raw);
      Object.keys(cleaned).forEach((k) => headerSet.add(k));
      return cleaned;
    })
    .filter((row) => !isEmptyOrCommentRow(row));

  return { fileName, headers: Array.from(headerSet), rows };
}

/**
 * Membuka pemilih dokumen sistem (.csv / .xlsx / .xls) dan mem-parsing datanya lintas platform.
 */
export async function pickAndParseSpreadsheet(): Promise<ParsedSpreadsheetResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'text/csv',
      'text/comma-separated-values',
      'application/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const fileName = asset.name || 'impor-data';
  const lowerName = fileName.toLowerCase();
  const isExcel =
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls') ||
    (asset.mimeType ?? '').includes('spreadsheetml') ||
    (asset.mimeType ?? '').includes('ms-excel');

  if (Platform.OS === 'web') {
    const webFile = (asset as { file?: Blob }).file;
    if (isExcel) {
      const buf = webFile
        ? await webFile.arrayBuffer()
        : await (await fetch(asset.uri)).arrayBuffer();
      return parseWorkbookArrayBuffer(buf, fileName);
    }
    const text = webFile ? await webFile.text() : await (await fetch(asset.uri)).text();
    return parseCsvText(text, fileName);
  }

  const nativeFile = new File(asset.uri);
  if (isExcel) {
    const buffer = await nativeFile.arrayBuffer();
    return parseWorkbookArrayBuffer(buffer, fileName);
  }

  const text = await nativeFile.text();
  return parseCsvText(text, fileName);
}
