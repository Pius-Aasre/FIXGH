import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GH_RED   = '#CE1126';
const GH_GOLD  = '#FCD116';
const GH_GREEN = '#006B3F';
const GH_BLACK = '#1A1A1A';

export default function HomeScreen() {
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
          <Text style={styles.subtitle}>Report. Track. Fix Ghana's Infrastructure.</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { borderTopColor: GH_GREEN }]}>
          <Ionicons name="alert-circle-outline" size={22} color={GH_GREEN} />
          <Text style={[styles.statValue, { color: GH_GREEN }]}>148</Text>
          <Text style={styles.statTitle}>Issues Reported</Text>
          <Text style={styles.statDesc}>This Month</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: GH_RED }]}>
          <Ionicons name="checkmark-circle-outline" size={22} color={GH_RED} />
          <Text style={[styles.statValue, { color: GH_RED }]}>112</Text>
          <Text style={styles.statTitle}>Issues Resolved</Text>
          <Text style={styles.statDesc}>This Month</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: GH_GOLD }]}>
          <Ionicons name="time-outline" size={22} color={GH_GOLD} />
          <Text style={[styles.statValue, { color: GH_GOLD }]}>36</Text>
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

        <View style={styles.alertCard}>
          <View style={[styles.alertPriority, { backgroundColor: GH_RED }]}>
            <Text style={styles.alertPriorityText}>EMERGENCY</Text>
          </View>
          <Text style={styles.alertTitle}>Burst Water Pipe</Text>
          <Text style={styles.alertLocation}>📍 Spintex Road, Accra</Text>
          <Text style={styles.alertTime}>Reported: 1 hr ago</Text>
        </View>

        <View style={styles.alertCard}>
          <View style={[styles.alertPriority, { backgroundColor: GH_GOLD }]}>
            <Text style={[styles.alertPriorityText, { color: GH_BLACK }]}>HIGH</Text>
          </View>
          <Text style={styles.alertTitle}>Open Manhole</Text>
          <Text style={styles.alertLocation}>📍 Liberation Road, Airport City</Text>
          <Text style={styles.alertTime}>Reported: 2 hrs ago</Text>
        </View>

        <View style={styles.alertCard}>
          <View style={[styles.alertPriority, { backgroundColor: GH_GREEN }]}>
            <Text style={styles.alertPriorityText}>MEDIUM</Text>
          </View>
          <Text style={styles.alertTitle}>Streetlight Out</Text>
          <Text style={styles.alertLocation}>📍 Tema Motorway, Accra</Text>
          <Text style={styles.alertTime}>Reported: 4 hrs ago</Text>
        </View>
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
