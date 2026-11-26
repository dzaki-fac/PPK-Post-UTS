import { useCallback, useMemo, useState } from 'react';

import type { ImportRowItem, ImportRowStatus } from '@/types/praktikum';

export type ImportDraftFilter = 'all' | 'accepted' | 'rejected' | ImportRowStatus;

export interface ImportDraftCounts {
  total: number;
  valid: number;
  needsInput: number;
  error: number;
  duplicate: number;
  conflict: number;
  accepted: number;
  rejected: number;
}

function canAcceptDraftItem<TData>(item: ImportRowItem<TData>): boolean {
  if (item.status === 'error' || item.status === 'duplicate') {
    return false;
  }
  if (item.status === 'conflict' && !item.conflictInfo?.resolveTransfer) {
    return false;
  }
  if (item.missingFields.length > 0 && item.status === 'needs_input') {
    return false;
  }
  return true;
}

/**
 * Hook pengelola draf impor interaktif sebelum commit batch ke Firestore (FR-P1-03).
 * Setiap perubahan baris otomatis memicu ulang fungsi validasi untuk menjaga status duplikat/konflik tetap akurat.
 */
export function useImportDraft<TData>(
  revalidateRows: (items: ImportRowItem<TData>[]) => ImportRowItem<TData>[]
) {
  const [rows, setRows] = useState<ImportRowItem<TData>[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [filter, setFilter] = useState<ImportDraftFilter>('all');

  const applyValidation = useCallback(
    (nextItems: ImportRowItem<TData>[]) => {
      const renumbered = nextItems.map((item, idx) => ({
        ...item,
        rowNumber: idx + 1,
      }));
      return revalidateRows(renumbered);
    },
    [revalidateRows]
  );

  const loadRows = useCallback(
    (entries: { raw?: Record<string, string>; data: TData }[], sourceName?: string) => {
      const initial: ImportRowItem<TData>[] = entries.map((entry, idx) => ({
        rowNumber: idx + 1,
        raw: entry.raw ?? {},
        data: entry.data,
        status: 'valid',
        accepted: true,
        missingFields: [],
        errors: [],
        warnings: [],
      }));
      setRows(applyValidation(initial));
      setFileName(sourceName ?? null);
      setFilter('all');
    },
    [applyValidation]
  );

  const appendRow = useCallback(
    (data: TData, raw: Record<string, string> = {}) => {
      setRows((prev) =>
        applyValidation([
          ...prev,
          {
            rowNumber: prev.length + 1,
            raw,
            data,
            status: 'valid',
            accepted: true,
            missingFields: [],
            errors: [],
            warnings: [],
          },
        ])
      );
    },
    [applyValidation]
  );

  const updateRow = useCallback(
    (rowNumber: number, updater: (prev: TData) => TData) => {
      setRows((prev) =>
        applyValidation(
          prev.map((item) =>
            item.rowNumber === rowNumber
              ? { ...item, data: updater(item.data) }
              : item
          )
        )
      );
    },
    [applyValidation]
  );

  const canAcceptItem = canAcceptDraftItem;

  const toggleAcceptRow = useCallback((rowNumber: number, forceValue?: boolean) => {
    setRows((prev) =>
      prev.map((item) => {
        if (item.rowNumber !== rowNumber) return item;
        const target = forceValue !== undefined ? forceValue : !item.accepted;
        if (target && !canAcceptDraftItem(item)) {
          return { ...item, accepted: false };
        }
        return { ...item, accepted: target };
      })
    );
  }, []);

  const setConflictResolveTransfer = useCallback(
    (rowNumber: number, resolveTransfer: boolean) => {
      setRows((prev) =>
        applyValidation(
          prev.map((item) => {
            if (item.rowNumber !== rowNumber || !item.conflictInfo) return item;
            return {
              ...item,
              accepted: resolveTransfer,
              conflictInfo: {
                ...item.conflictInfo,
                resolveTransfer,
              },
            };
          })
        )
      );
    },
    [applyValidation]
  );

  const deleteRow = useCallback(
    (rowNumber: number) => {
      setRows((prev) =>
        applyValidation(prev.filter((item) => item.rowNumber !== rowNumber))
      );
    },
    [applyValidation]
  );

  const duplicateRow = useCallback(
    (rowNumber: number) => {
      setRows((prev) => {
        const index = prev.findIndex((item) => item.rowNumber === rowNumber);
        if (index < 0) return prev;
        const source = prev[index];
        const copy: ImportRowItem<TData> = {
          ...source,
          data: { ...source.data },
          raw: { ...source.raw },
          conflictInfo: source.conflictInfo ? { ...source.conflictInfo } : undefined,
        };
        const next = [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
        return applyValidation(next);
      });
    },
    [applyValidation]
  );

  const acceptAllValid = useCallback(() => {
    setRows((prev) =>
      prev.map((item) => ({
        ...item,
        accepted: canAcceptDraftItem(item) ? true : item.accepted,
      }))
    );
  }, []);

  const rejectAllErrors = useCallback(() => {
    setRows((prev) =>
      prev.map((item) =>
        item.status === 'error' ||
        item.status === 'duplicate' ||
        item.status === 'needs_input' ||
        (item.status === 'conflict' && !item.conflictInfo?.resolveTransfer)
          ? { ...item, accepted: false }
          : item
      )
    );
  }, []);

  const fillAllMissing = useCallback(
    (filler: (item: ImportRowItem<TData>) => TData) => {
      setRows((prev) =>
        applyValidation(
          prev.map((item) => ({
            ...item,
            data: filler(item),
          }))
        )
      );
    },
    [applyValidation]
  );

  const removeRowsByNumbers = useCallback(
    (numbers: Set<number>) => {
      setRows((prev) =>
        applyValidation(prev.filter((item) => !numbers.has(item.rowNumber)))
      );
    },
    [applyValidation]
  );

  const clearDraft = useCallback(() => {
    setRows([]);
    setFileName(null);
    setFilter('all');
  }, []);

  const refreshValidation = useCallback(() => {
    setRows((prev) => applyValidation(prev));
  }, [applyValidation]);

  const counts: ImportDraftCounts = useMemo(() => {
    let valid = 0;
    let needsInput = 0;
    let error = 0;
    let duplicate = 0;
    let conflict = 0;
    let accepted = 0;
    let rejected = 0;

    for (const r of rows) {
      if (r.status === 'valid') valid += 1;
      else if (r.status === 'needs_input') needsInput += 1;
      else if (r.status === 'error') error += 1;
      else if (r.status === 'duplicate') duplicate += 1;
      else if (r.status === 'conflict') conflict += 1;

      if (r.accepted) accepted += 1;
      else rejected += 1;
    }

    return {
      total: rows.length,
      valid,
      needsInput,
      error,
      duplicate,
      conflict,
      accepted,
      rejected,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'accepted') return rows.filter((r) => r.accepted);
    if (filter === 'rejected') return rows.filter((r) => !r.accepted);
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  return {
    rows,
    filteredRows,
    fileName,
    filter,
    setFilter,
    counts,
    loadRows,
    appendRow,
    updateRow,
    toggleAcceptRow,
    setConflictResolveTransfer,
    deleteRow,
    duplicateRow,
    acceptAllValid,
    rejectAllErrors,
    fillAllMissing,
    removeRowsByNumbers,
    clearDraft,
    refreshValidation,
    canAcceptItem,
  };
}
