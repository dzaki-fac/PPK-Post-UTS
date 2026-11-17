import React from 'react';
import { ColorValue, StyleSheet, View } from 'react-native';

interface TabIconProps {
  color: ColorValue | string;
  focused: boolean;
  size?: number;
}

/**
 * TabCalendarIcon — Ikon Kalender Jadwal Praktikum
 */
export function TabCalendarIcon({ color, focused }: TabIconProps) {
  return (
    <View style={styles.iconContainer}>
      {/* Top ring binders */}
      <View style={styles.calendarBindersRow}>
        <View style={[styles.binder, { backgroundColor: color }]} />
        <View style={[styles.binder, { backgroundColor: color }]} />
      </View>
      {/* Calendar body */}
      <View
        style={[
          styles.calendarBody,
          {
            borderColor: color,
            borderWidth: focused ? 2 : 1.6,
          },
        ]}>
        {/* Header stripe */}
        <View
          style={[
            styles.calendarHeader,
            {
              backgroundColor: focused ? color : 'transparent',
              borderBottomColor: color,
              borderBottomWidth: focused ? 0 : 1.2,
            },
          ]}
        />
        {/* Inner grid dots */}
        <View style={styles.calendarGrid}>
          <View style={[styles.calDot, { backgroundColor: color }]} />
          <View style={[styles.calDot, { backgroundColor: color }]} />
          <View style={[styles.calDot, { backgroundColor: color }]} />
          <View style={[styles.calDot, { backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

/**
 * TabDocumentIcon — Ikon Formulir Pengajuan Izin
 */
export function TabDocumentIcon({ color, focused }: TabIconProps) {
  return (
    <View style={styles.iconContainer}>
      <View
        style={[
          styles.documentBody,
          {
            borderColor: color,
            borderWidth: focused ? 2 : 1.6,
          },
        ]}>
        {/* Document lines */}
        <View style={[styles.docLine, { backgroundColor: color, width: 9 }]} />
        <View style={[styles.docLine, { backgroundColor: color, width: 11 }]} />
        <View style={[styles.docLine, { backgroundColor: color, width: 7 }]} />
      </View>
      {/* Tiny badge dot */}
      {focused && (
        <View
          style={[
            styles.badgeDot,
            { backgroundColor: color, borderColor: '#FFFFFF' },
          ]}
        />
      )}
    </View>
  );
}

/**
 * TabHistoryIcon — Ikon Riwayat Presensi Praktikan
 */
export function TabHistoryIcon({ color, focused }: TabIconProps) {
  return (
    <View style={styles.iconContainer}>
      <View
        style={[
          styles.historyCircle,
          {
            borderColor: color,
            borderWidth: focused ? 2 : 1.6,
          },
        ]}>
        {/* Clock Hands */}
        <View style={[styles.clockCenter, { backgroundColor: color }]} />
        <View style={[styles.clockHour, { backgroundColor: color }]} />
        <View style={[styles.clockMinute, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

/**
 * TabModerationIcon — Ikon Moderasi Izin Asisten (Shield / Verifikasi)
 */
export function TabModerationIcon({ color, focused }: TabIconProps) {
  return (
    <View style={styles.iconContainer}>
      <View
        style={[
          styles.moderationShield,
          {
            borderColor: color,
            borderWidth: focused ? 2 : 1.6,
          },
        ]}>
        {/* Inner check accent */}
        <View style={[styles.shieldCheckStem, { backgroundColor: color }]} />
        <View style={[styles.shieldCheckBase, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

/**
 * TabChartIcon — Ikon Rekapitulasi Presensi Kelas (Barchart)
 */
export function TabChartIcon({ color, focused }: TabIconProps) {
  return (
    <View style={styles.iconContainer}>
      <View
        style={[
          styles.chartFrame,
          {
            borderColor: color,
            borderWidth: focused ? 2 : 1.6,
          },
        ]}>
        {/* 3 Bar charts */}
        <View style={[styles.bar, { backgroundColor: color, height: 6 }]} />
        <View style={[styles.bar, { backgroundColor: color, height: 11 }]} />
        <View style={[styles.bar, { backgroundColor: color, height: 8 }]} />
      </View>
    </View>
  );
}

/**
 * TabUsersIcon — Ikon Pengguna / Mahasiswa (Profile Group)
 */
export function TabUsersIcon({ color, focused }: TabIconProps) {
  return (
    <View style={styles.iconContainer}>
      {/* Head */}
      <View
        style={[
          styles.userHead,
          {
            borderColor: color,
            borderWidth: focused ? 2 : 1.6,
            backgroundColor: focused ? color : 'transparent',
          },
        ]}
      />
      {/* Shoulder */}
      <View
        style={[
          styles.userShoulder,
          {
            borderColor: color,
            borderWidth: focused ? 2 : 1.6,
            borderBottomWidth: 0,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 26,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  /* Calendar */
  calendarBindersRow: {
    flexDirection: 'row',
    width: 14,
    justifyContent: 'space-between',
    position: 'absolute',
    top: 0,
    zIndex: 2,
  },
  binder: {
    width: 2.2,
    height: 3.5,
    borderRadius: 1,
  },
  calendarBody: {
    width: 21,
    height: 19,
    borderRadius: 4.5,
    marginTop: 2,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  calendarHeader: {
    height: 4.5,
    width: '100%',
  },
  calendarGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 2.5,
    gap: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calDot: {
    width: 2.2,
    height: 2.2,
    borderRadius: 0.8,
  },
  /* Document */
  documentBody: {
    width: 18,
    height: 21,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
    paddingVertical: 3.5,
    paddingHorizontal: 2.5,
    gap: 2.5,
    justifyContent: 'center',
  },
  docLine: {
    height: 1.8,
    borderRadius: 1,
  },
  badgeDot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
  },
  /* History Clock */
  historyCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  clockCenter: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
  },
  clockHour: {
    position: 'absolute',
    top: 5,
    width: 1.8,
    height: 5,
    borderRadius: 1,
  },
  clockMinute: {
    position: 'absolute',
    right: 4.5,
    width: 5,
    height: 1.8,
    borderRadius: 1,
  },
  /* Moderation Shield */
  moderationShield: {
    width: 20,
    height: 21,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  shieldCheckStem: {
    position: 'absolute',
    width: 1.8,
    height: 7,
    borderRadius: 1,
    transform: [{ rotate: '35deg' }],
    left: 9.5,
    top: 6,
  },
  shieldCheckBase: {
    position: 'absolute',
    width: 4,
    height: 1.8,
    borderRadius: 1,
    transform: [{ rotate: '35deg' }],
    left: 6.5,
    top: 10.5,
  },
  /* Chart */
  chartFrame: {
    width: 21,
    height: 19,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-evenly',
    paddingBottom: 2,
  },
  bar: {
    width: 3.2,
    borderTopLeftRadius: 1.5,
    borderTopRightRadius: 1.5,
  },
  /* Users */
  userHead: {
    width: 8.5,
    height: 8.5,
    borderRadius: 4.25,
    marginBottom: 1,
  },
  userShoulder: {
    width: 18,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#FFFFFF',
  },
});
