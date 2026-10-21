import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { api, Report } from '../../lib/api';
import { useAuth } from '../../lib/auth-store';

const GH_RED   = '#CE1126';
const GH_GOLD  = '#FCD116';
const GH_GREEN = '#006B3F';
const GH_BLACK = '#1A1A1A';

const SAMPLE_ALERTS = [
  { title: 'Burst Water Pipe', location: 'Spintex Road, Accra', time: 'Reported: 1 hr ago', priority: 'EMERGENCY', color: GH_RED },
  { title: 'Open Manhole', location: 'Liberation Road, Airport City', time: 'Reported: 2 hrs ago', priority: 'HIGH', color: GH_GOLD },
  { title: 'Streetlight Out', location: 'Tema Motorway, Accra', time: 'Reported: 4 hrs ago', priority: 'MEDIUM', color: GH_GREEN },
];

const PRIORITY_COLORS: Record<string, string> = {
  EMERGENCY: GH_RED,
  CRITICAL: GH_RED,
  HIGH: GH_GOLD,
  URGENT: GH_GOLD,
  MEDIUM: GH_GREEN,
};

/** Mirrors the web dashboard (frontend/web/src/lib/format.ts). */
function summarise(reports: Report[]) {
  const now = new Date();
  const thisMonth = reports.filter((r) => {
    const d = new Date(r.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  return {
    reported: thisMonth.length,
    resolved: thisMonth.filter((r) => r.status === 'COMPLETED').length,
    inProgress: thisMonth.filter((r) => r.status === 'IN_PROGRESS' || r.status === 'VERIFIED').length,
  };
}

export default function HomeScreen() {
  const { isAuthenticated } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);

  // The tab bar keeps this screen mounted, so refetch whenever it regains
  // focus — otherwise the counters stay stale after filing a report.
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        setReports([]);
        return;
      }
      let cancelled = false;
      api.reports
        .mine()
        .then((data) => {
          if (!cancelled) setReports(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (!cancelled) setReports([]);
        });
      return () => {
        cancelled = true;
      };
    }, [isAuthenticated])
  );

  const stats = summarise(reports);
  const alerts = [...reports]
    .filter((r) => r.filterStatus !== 'SPAM')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.flagBar}>
          <View style={[styles.flagStrip, { backgroundColor: GH_RED }]} />
          <View style={[styles.flagStrip, { backgroundColor: GH_GOLD }]} />
          <View style={[styles.flagStrip, { backgroundColor: GH_GREEN }]} />
        </View>
        <View style={styles.headerBody}>
          <Text style={styles.title}>FixGH 🇬🇭</Text>
          <Text style={styles.subtitle}>Report. Track. Fix Ghana&apos;s Infrastructure.</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { borderTopColor: GH_GREEN }]}>
          <Ionicons name="alert-circle-outline" size={22} color={GH_GREEN} />
          <Text style={[styles.statValue, { color: GH_GREEN }]}>
            {isAuthenticated ? stats.reported : 148}
          </Text>
          <Text style={styles.statTitle}>Issues Reported</Text>
          <Text style={styles.statDesc}>This Month</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: GH_RED }]}>
          <Ionicons name="checkmark-circle-outline" size={22} color={GH_RED} />
          <Text style={[styles.statValue, { color: GH_RED }]}>
            {isAuthenticated ? stats.resolved : 112}
          </Text>
          <Text style={styles.statTitle}>Issues Resolved</Text>
          <Text style={styles.statDesc}>This Month</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: GH_GOLD }]}>
          <Ionicons name="time-outline" size={22} color={GH_GOLD} />
          <Text style={[styles.statValue, { color: GH_GOLD }]}>
            {isAuthenticated ? stats.inProgress : 36}
          </Text>
          <Text style={styles.statTitle}>In Progress</Text>
          <Text style={styles.statDesc}>Active</Text>
        </View>
      </View>

      {/* Map placeholder */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Nearby Issues</Text>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={40} color="#94a3b8" />
          <Text style={styles.placeholderText}>Map view coming soon</Text>
        </View>
      </View>

      {/* Recent Alerts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Recent High-Priority Alerts</Text>

        {alerts.length > 0 ? (
          alerts.map((report) => (
            <View key={report.id} style={styles.alertCard}>
              <View
                style={[
                  styles.alertPriority,
                  { backgroundColor: PRIORITY_COLORS[report.aiPriorityScore || 'MEDIUM'] ?? GH_GREEN },
                ]}
              >
                <Text
                  style={[
                    styles.alertPriorityText,
                    { color: (PRIORITY_COLORS[report.aiPriorityScore || 'MEDIUM'] ?? GH_GREEN) === GH_GOLD ? GH_BLACK : '#fff' },
                  ]}
                >
                  {(report.aiPriorityScore || 'MEDIUM').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.alertTitle}>{report.title}</Text>
              <Text style={styles.alertLocation}>📍 {report.locationText || 'Location pending'}</Text>
              <Text style={styles.alertTime}>Reported: {new Date(report.createdAt).toLocaleString()}</Text>
            </View>
          ))
        ) : (
          SAMPLE_ALERTS.map((alert) => (
            <View key={alert.title} style={styles.alertCard}>
              <View style={[styles.alertPriority, { backgroundColor: alert.color }]}>
                <Text
                  style={[
                    styles.alertPriorityText,
                    { color: alert.color === GH_GOLD ? GH_BLACK : '#fff' },
                  ]}
                >
                  {alert.priority}
                </Text>
              </View>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertLocation}>📍 {alert.location}</Text>
              <Text style={styles.alertTime}>{alert.time}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  // Header
  header: { backgroundColor: '#fff', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  flagBar: { flexDirection: 'row', height: 6 },
  flagStrip: { flex: 1 },
  headerBody: { padding: 20, paddingTop: 14 },
  title: { fontSize: 26, fontWeight: '900', color: GH_BLACK, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },

  // Stats
  statsContainer: { flexDirection: 'row', padding: 16, paddingBottom: 8 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginHorizontal: 4,
    borderTopWidth: 3,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
      default: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    }),
  },
  statValue: { fontSize: 26, fontWeight: '900', marginTop: 6 },
  statTitle: { fontSize: 11, fontWeight: '700', color: GH_BLACK, marginTop: 2, textAlign: 'center' },
  statDesc: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },

  // Sections
  section: { padding: 16, paddingTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: GH_BLACK, marginBottom: 12 },

  // Map
  mapPlaceholder: {
    height: 160,
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderStyle: 'dashed',
  },
  placeholderText: { color: '#94a3b8', marginTop: 8, fontSize: 13 },

  // Alert cards
  alertCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
      default: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    }),
  },
  alertPriority: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 8,
  },
  alertPriorityText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  alertTitle: { fontSize: 16, fontWeight: '700', color: GH_BLACK },
  alertLocation: { fontSize: 13, color: '#64748b', marginTop: 4 },
  alertTime: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
});
