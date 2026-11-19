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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LabActivitySheet } from '@/components/lab-activity-sheet';
import { LabMapView, UserLocationState } from '@/components/lab-map-view';
import { subscribeLabActivities } from '@/services/lab-activity-service';
import { LabWithActivity } from '@/types/praktikum';

export default function AsistenPetaLabScreen() {
  const insets = useSafeAreaInsets();
  const [activities, setActivities] = useState<LabWithActivity[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userLocation, setUserLocation] = useState<UserLocationState | null>(null);

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

  // Metrik ringkasan untuk asisten
  const totalLabs = activities.length;
  const activeSessionsCount = activities.filter((a) => Boolean(a.ongoingSession)).length;
  const idleLabsCount = totalLabs - activeSessionsCount;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.centerContainer}>
        {/* Top Header & Breadcrumb */}
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
                router.replace('/asisten/jadwal');
              }
            }}>
            <Text style={styles.breadcrumbText}>← Kembali ke Kelola Sesi</Text>
          </Pressable>

          <View style={styles.headerTitleRow}>
            <View>
              <Text style={styles.screenTitle}>Monitoring Peta Laboratorium</Text>
              <Text style={styles.screenSubtitle}>
                Departemen Informatika FSM UNDIP • Status Real-Time Ruang & Sesi
              </Text>
            </View>

            <View style={styles.liveIndicatorBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>PANEL ASISTEN</Text>
            </View>
          </View>

          {/* Metrics Overview Bar */}
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
              <Text style={styles.metricLabel}>Praktikum Aktif</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: '#64748B' }]}>
                {idleLabsCount}
              </Text>
              <Text style={styles.metricLabel}>Lab Idle</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text
                style={[
                  styles.metricValue,
                  { fontSize: 13, color: userLocation ? '#0D9488' : '#64748B' },
                ]}>
                {userLocation ? 'Terkunci' : 'Mencari'}
              </Text>
              <Text style={styles.metricLabel}>GPS Live</Text>
            </View>
          </View>
        </View>

        {/* Map Area */}
        <View style={styles.mapArea}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0D9488" />
              <Text style={styles.loadingText}>Menghubungkan ke data spasial laboratorium...</Text>
            </View>
          ) : (
            <LabMapView
              activities={activities}
              selectedLabId={selectedLabId}
              onSelectLab={handleSelectLab}
              accentColor="#0D9488"
              onUserLocationChange={handleUserLocationChange}
            />
          )}

          {/* Bottom Sheet Detail */}
          {selectedActivity && (
            <View style={styles.sheetOverlay}>
              <LabActivitySheet
                activity={selectedActivity}
                role="asisten"
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
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  breadcrumbPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
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
    color: '#0D9488',
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#99F6E4',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0D9488',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F766E',
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
