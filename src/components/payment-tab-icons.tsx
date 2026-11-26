/**
 * Ikon vektor murni bottom tab Tagihan & Pembayaran (Sprint 4 / Programmer 3).
 * Dipisah dari tab-icons.tsx agar tidak bentrok dengan perubahan Programmer 1/2.
 */

import React from 'react';
import { ColorValue, StyleSheet, View } from 'react-native';

interface TabIconProps {
  color: ColorValue | string;
  focused: boolean;
}

/** Ikon tagihan: kartu dengan garis magnet dan nominal. */
export function TabBillIcon({ color, focused }: TabIconProps) {
  const borderWidth = focused ? 2 : 1.6;
  return (
    <View style={styles.container}>
      <View style={[styles.card, { borderColor: color, borderWidth }]}>
        <View style={[styles.stripe, { backgroundColor: color }]} />
        <View style={[styles.cardLine, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

/** Ikon riwayat pembayaran: struk dengan garis baris transaksi. */
export function TabReceiptIcon({ color, focused }: TabIconProps) {
  const borderWidth = focused ? 2 : 1.6;
  return (
    <View style={styles.container}>
      <View style={[styles.receipt, { borderColor: color, borderWidth }]}>
        <View style={[styles.receiptLine, { backgroundColor: color, width: 10 }]} />
        <View style={[styles.receiptLine, { backgroundColor: color, width: 7 }]} />
        <View style={[styles.receiptLine, { backgroundColor: color, width: 10 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  card: {
    width: 24,
    height: 17,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  stripe: { height: 4, marginTop: 3, width: '100%' },
  cardLine: { height: 2, width: 8, marginTop: 3, marginLeft: 3, borderRadius: 1 },
  receipt: {
    width: 18,
    height: 23,
    borderRadius: 3,
    paddingTop: 4,
    paddingHorizontal: 3,
    gap: 3,
    alignItems: 'flex-start',
  },
  receiptLine: { height: 2, borderRadius: 1 },
});
