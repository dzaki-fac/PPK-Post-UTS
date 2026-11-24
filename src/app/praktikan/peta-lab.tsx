import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LabActivitySheet } from '@/components/lab-activity-sheet';
import { LabMapView, UserLocationState } from '@/components/lab-map-view';
import { useAuth } from '@/context/auth-context';
import { subscribeLabActivities } from '@/services/lab-activity-service';
import { LabWithActivity } from '@/types/praktikum';

export default function PraktikanPetaLabScreen() {
  const { userDoc } = useAuth();
  const [activities, setActivities] = useState<LabWithActivity[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userLocation, setUserLocation] = useState<UserLocationState | null>(null);

  // Ref untuk user coords agar callback subscribeLabActivities selalu membaca nilai terbaru
  const userCoordsRef = useRef<UserLocationState | null>(null);

  const handleUserLocationChange = useCallback((loc: UserLocationState | null) => {
    userCoordsRef.current = loc;
    setUserLocation(loc);
  }, []);

  // Subscribe real-time aktivitas laboratorium dari Firestore
  useEffect(() => {
    const unsub = subscribeLabActivities(
      (data) => {
        setActivities(data);
        setLoading(false);
      },
      () => userCoordsRef.current,
      () => {
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handleSelectLab = useCallback((activity: LabWithActivity) => {
    setSelectedLabId(activity.lab.id);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedLabId(null);
  }, []);

  const selectedActivity = useMemo(() => {
    return activities.find((a) => a.lab.id === selectedLabId) || null;
  }, [activities, selectedLabId]);

  // Metrik ringkasan untuk header
  const totalLabs = activities.length;
  const activeSessionsCount = activities.filter((a) => Boolean(a.ongoingSession)).length;
  const insideRadiusCount = activities.filter((a) => Boolean(a.isUserInsideRadius)).length;

  const userClass = userDoc?.kelas;

  return (
    <View style={styles.root}>
      <View style={styles.centerContainer}>
        {/* Top Breadcrumb & Title */}
        <View style={styles.topHeader}>
          <Pressable
            style={({ pressed }) => [
              styles.breadcrumbPill,
              pressed && styles.breadcrumbPressed,
            ]}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/praktikan/jadwal');
              }
            }}>
            <Text style={styles.breadcrumbText}>← Kembali ke Jadwal</Text>
          </Pressable>

          <View style={styles.headerTitleRow}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.screenTitle}>Peta Laboratorium</Text>
              <Text style={styles.screenSubtitle}>
                Departemen Informatika FSM UNDIP • Pantau Sesi & Posisi Fisik
              </Text>
            </View>

            <View style={styles.liveIndicatorBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE TRACKING</Text>
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.metricsBar}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{totalLabs}</Text>
              <Text style={styles.metricLabel}>Total Lab</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: '#16A34A' }]}>
                {activeSessionsCount}
              </Text>
              <Text style={styles.metricLabel}>Sesi Aktif</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text
                style={[
                  styles.metricValue,
                  { color: insideRadiusCount > 0 ? '#16A34A' : '#EA580C' },
                ]}>
                {insideRadiusCount}
              </Text>
              <Text style={styles.metricLabel}>Dalam Radius</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text
                style={[
                  styles.metricValue,
                  { fontSize: 13, color: userLocation ? '#16A34A' : '#64748B' },
                ]}>
                {userLocation ? 'Terkunci' : 'Mencari'}
              </Text>
              <Text style={styles.metricLabel}>GPS Live</Text>
            </View>
          </View>
        </View>

        {/* Map View Area */}
        <View style={styles.mapArea}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#EA580C" />
              <Text style={styles.loadingText}>Memuat peta & aktivitas laboratorium...</Text>
            </View>
          ) : (
            <LabMapView
              activities={activities}
              selectedLabId={selectedLabId}
              onSelectLab={handleSelectLab}
              accentColor="#EA580C"
              onUserLocationChange={handleUserLocationChange}
            />
          )}

          {/* Bottom Sheet Detail saat sebuah Lab dipilih */}
          {selectedActivity && (
            <View style={styles.sheetOverlay}>
              <LabActivitySheet
                activity={selectedActivity}
                role="praktikan"
                userClass={userClass}
                onClose={handleCloseSheet}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  topHeader: {
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  breadcrumbPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  breadcrumbPressed: {
    opacity: 0.7,
  },
  breadcrumbText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#EA580C',
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  headerTitleCol: {
    flex: 1,
    minWidth: 0,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  liveIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.4,
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#CBD5E1',
  },
  mapArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  sheetOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
});
