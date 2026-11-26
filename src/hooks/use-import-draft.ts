import { useCallback, useMemo, useState } from 'react';

import type { ImportRowDecision, ImportRowItem, ImportRowStatus } from '@/types/praktikum';

export type ImportDraftFilter = 'all' | 'accepted' | 'denied' | ImportRowStatus;

export interface ImportDraftCounts {
  total: number;
  valid: number;
  needsInput: number;
  error: number;
  duplicate: number;
  conflict: number;
  accepted: number;
  denied: number;
}

export function canAcceptDraftItem<TData>(item: ImportRowItem<TData>): boolean {
  if (item.status === 'error' || item.status === 'duplicate') {
    return false;
  }
  if (item.status === 'conflict' && !item.conflictInfo?.resolveTransfer) {
    return false;
  }
  if (item.status === 'needs_input') {
    return false;
  }
  return true;
}

/**
 * Hook pengelola draf impor interaktif dengan keputusan per baris (`accepted | denied | pending`)
 * serta revalidasi otomatis pada setiap perubahan baris (FR-P1-03).
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
        decision: 'accepted',
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
            decision: 'accepted',
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
              ? { ...item, data: updater(item.data), saveError: undefined }
              : item
          )
        )
      );
    },
    [applyValidation]
  );

  const setRowDecision = useCallback((rowNumber: number, decision: ImportRowDecision) => {
    setRows((prev) =>
      prev.map((item) => {
        if (item.rowNumber !== rowNumber) return item;
        if (decision === 'accepted' && !canAcceptDraftItem(item)) {
          return { ...item, decision: 'denied' };
        }
        return { ...item, decision };
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
              decision: resolveTransfer ? 'accepted' : 'denied',
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
          saveError: undefined,
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
        decision: canAcceptDraftItem(item) ? 'accepted' : item.decision,
      }))
    );
  }, []);

  const rejectAllErrors = useCallback(() => {
    setRows((prev) =>
      prev.map((item) =>
        !canAcceptDraftItem(item) ? { ...item, decision: 'denied' } : item
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

  const retainFailedRows = useCallback(
    (savedNumbers: Set<number>, errorByRow?: Map<number, string>) => {
      setRows((prev) =>
        applyValidation(
          prev
            .filter((item) => !savedNumbers.has(item.rowNumber))
            .map((item) => ({
              ...item,
              saveError: errorByRow?.get(item.rowNumber) ?? item.saveError,
            }))
        )
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
    let denied = 0;

    for (const r of rows) {
      if (r.status === 'valid') valid += 1;
      else if (r.status === 'needs_input') needsInput += 1;
      else if (r.status === 'error') error += 1;
      else if (r.status === 'duplicate') duplicate += 1;
      else if (r.status === 'conflict') conflict += 1;

      if (r.decision === 'accepted') accepted += 1;
      else denied += 1;
    }

    return {
      total: rows.length,
      valid,
      needsInput,
      error,
      duplicate,
      conflict,
      accepted,
      denied,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'accepted') return rows.filter((r) => r.decision === 'accepted');
    if (filter === 'denied') return rows.filter((r) => r.decision !== 'accepted');
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
    setRowDecision,
    setConflictResolveTransfer,
    deleteRow,
    duplicateRow,
    acceptAllValid,
    rejectAllErrors,
    fillAllMissing,
    retainFailedRows,
    clearDraft,
    refreshValidation,
    canAcceptItem: canAcceptDraftItem,
  };
}
