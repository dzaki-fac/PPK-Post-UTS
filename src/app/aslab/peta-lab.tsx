import { router, type Href } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DeviceStatusBanner } from '@/components/device-status-banner';
import { LabActivitySheet } from '@/components/lab-activity-sheet';
import { LabMapView, UserLocationState } from '@/components/lab-map-view';
import { Colors } from '@/constants/theme';
import { useDeviceResilience } from '@/hooks/use-device-resilience';
import { subscribeLabActivities } from '@/services/lab-activity-service';
import { calculateDistanceMeters } from '@/services/location-service';
import { LabWithActivity } from '@/types/praktikum';

export default function AslabPetaLabScreen() {
  const device = useDeviceResilience({ checkLocation: false });
  const [activities, setActivities] = useState<LabWithActivity[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userLocation, setUserLocation] = useState<UserLocationState | null>(null);

  const userCoordsRef = useRef<UserLocationState | null>(null);

  const handleUserLocationChange = useCallback((loc: UserLocationState | null) => {
    userCoordsRef.current = loc;
    setUserLocation(loc);
  }, []);

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

  const activitiesWithDistance = useMemo(() => {
    if (!userLocation) return activities;
    return activities.map((item) => {
      const distanceMeters = calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        item.lab.latitude,
        item.lab.longitude
      );
      return {
        ...item,
        distanceMeters,
        isUserInsideRadius: distanceMeters <= item.lab.radiusMeter,
      };
    });
  }, [activities, userLocation]);

  const selectedActivity = useMemo(() => {
    return activitiesWithDistance.find((a) => a.lab.id === selectedLabId) || null;
  }, [activitiesWithDistance, selectedLabId]);

  const totalLabs = activitiesWithDistance.length;
  const activeSessionsCount = activitiesWithDistance.filter((a) => Boolean(a.ongoingSession)).length;
  const idleLabsCount = totalLabs - activeSessionsCount;

  return (
    <View style={styles.root}>
      <View style={styles.centerContainer}>
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
                router.replace('/aslab/dashboard' as Href);
              }
            }}>
            <Text style={styles.breadcrumbText}>← Kembali ke Dashboard Aslab</Text>
          </Pressable>

          <View style={styles.headerTitleRow}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.screenTitle}>Peta Laboratorium Aslab</Text>
              <Text style={styles.screenSubtitle}>
                Departemen Informatika FSM UNDIP • Pantauan Persebaran & Aktivitas Real-Time
              </Text>
            </View>

            <View style={styles.liveIndicatorBadge}>
              <Text style={styles.liveText}>PANEL ASLAB</Text>
            </View>
          </View>

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
                  { fontSize: 13, color: userLocation ? Colors.aslabPrimary : '#64748B' },
                ]}>
                {userLocation ? 'Aktif' : 'Mencari'}
              </Text>
              <Text style={styles.metricLabel}>GPS Live</Text>
            </View>
          </View>
        </View>

        <View style={styles.mapArea}>
          {!device.isOnline ? (
            <View style={{ paddingTop: 4 }}>
              <DeviceStatusBanner type="offline" onRetry={device.refresh} />
            </View>
          ) : null}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.aslabPrimary} />
              <Text style={styles.loadingText}>Memuat data spasial laboratorium...</Text>
            </View>
          ) : (
            <LabMapView
              activities={activitiesWithDistance}
              selectedLabId={selectedLabId}
              onSelectLab={handleSelectLab}
              accentColor={Colors.aslabPrimary}
              onUserLocationChange={handleUserLocationChange}
            />
          )}

          {selectedActivity && (
            <View style={styles.sheetOverlay}>
              <LabActivitySheet
                activity={selectedActivity}
                role="aslab"
                onClose={handleCloseSheet}
                onNavigateToSession={() => router.push('/aslab/jadwal' as Href)}
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
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 14,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'web' ? 92 : 10,
  },
  topHeader: {
    marginBottom: 10,
  },
  breadcrumbPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 8,
  },
  breadcrumbPressed: {
    opacity: 0.75,
  },
  breadcrumbText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.aslabPrimary,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  headerTitleCol: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  liveIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.aslabTint,
    borderWidth: 1,
    borderColor: Colors.aslabBorder,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.aslabPrimary,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.aslabPrimary,
    letterSpacing: 0.5,
  },
  metricsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
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
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  mapArea: {
    flex: 1,
    position: 'relative',
    minHeight: 360,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  sheetOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    zIndex: 20,
  },
});
