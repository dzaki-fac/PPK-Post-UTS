import QRCode from 'qrcode';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SessionQRCodeProps {
  value: string;
  size?: number;
}

/**
 * Komponen QR Code murni berbasis matriks View (ISO-18004 via `qrcode`).
 * Kompatibel penuh di Android, iOS, dan Web tanpa memerlukan dependensi SVG native.
 */
export function SessionQRCode({ value, size = 180 }: SessionQRCodeProps) {
  const matrix = useMemo(() => {
    if (!value.trim()) return null;
    try {
      const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
      const count = qr.modules.size;
      const rows: boolean[][] = [];
      for (let r = 0; r < count; r++) {
        const row: boolean[] = [];
        for (let c = 0; c < count; c++) {
          row.push(Boolean(qr.modules.get(r, c)));
        }
        rows.push(row);
      }
      return { count, rows };
    } catch {
      return null;
    }
  }, [value]);

  if (!matrix) {
    return (
      <View style={[styles.fallbackBox, { width: size, height: size }]}>
        <Text style={styles.fallbackText}>QR Code tidak tersedia</Text>
      </View>
    );
  }

  const padding = 12;
  const innerSize = size - padding * 2;
  const cellSize = innerSize / matrix.count;

  return (
    <View style={[styles.frame, { width: size, height: size, padding }]}>
      <View style={{ width: innerSize, height: innerSize }}>
        {matrix.rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.qrRow}>
            {row.map((isDark, colIdx) => (
              <View
                key={colIdx}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrRow: {
    flexDirection: 'row',
  },
  fallbackBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  fallbackText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
  },
});
