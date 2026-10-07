import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, authStore } from '../../lib/auth-store';
import { api, Report } from '../../lib/api';

const GH_RED   = '#CE1126';
const GH_GOLD  = '#FCD116';
const GH_GREEN = '#006B3F';
const GH_BLACK = '#1A1A1A';

const STATUS_COLORS: Record<Report['status'], string> = {
  PENDING: '#64748b',
  VERIFIED: GH_GOLD,
  IN_PROGRESS: GH_RED,
  COMPLETED: GH_GREEN,
};

const STATUS_LABELS: Record<Report['status'], string> = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  IN_PROGRESS: 'IN PROGRESS',
  COMPLETED: 'COMPLETED',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingReports(true);
    setReportsError(null);
    api.reports
      .mine()
      .then(data => setReports(data))
      .catch((err: any) => setReportsError(err?.message ?? 'Failed to load reports.'))
      .finally(() => setLoadingReports(false));
  }, [isAuthenticated]);

  function handleSignOut() {
    authStore.signOut();
    router.replace('/auth' as any);
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="person-circle-outline" size={80} color="#cbd5e1" />
        <Text style={styles.notSignedInText}>You are not signed in.</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/auth' as any)}>
          <Text style={styles.signInBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile header */}
      <View style={styles.header}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#fff" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name ?? '—'}</Text>
            <Text style={styles.userEmail}>{user?.email ?? '—'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={16} color="#dc2626" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Settings menu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <View style={styles.settingsMenu}>
          {['Notifications', 'Change Password', 'Help & Support'].map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.menuItem}>
              <Text style={styles.menuText}>{item}</Text>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Report History */}
      <View style={styles.section}>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>My Report History</Text>
          {!loadingReports && (
            <Text style={styles.historyCount}>{reports.length}</Text>
          )}
        </View>

        {loadingReports ? (
          <ActivityIndicator size="large" color="#0f172a" style={styles.spinner} />
        ) : reportsError ? (
          <Text style={styles.errorText}>{reportsError}</Text>
        ) : reports.length === 0 ? (
          <Text style={styles.emptyText}>No reports yet. Submit your first one!</Text>
        ) : (
          reports.map((report, idx) => (
            <View key={report.id} style={styles.historyCard}>
              <View style={styles.historyInfo}>
                <Text style={styles.historyTitle}>
                  {idx + 1}) {report.title}
                </Text>
                <Text style={styles.historyDesc}>
                  {report.category ?? 'General'} •{' '}
                  {new Date(report.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: STATUS_COLORS[report.status] ?? '#64748b' },
                ]}
              >
                <Text style={styles.statusText}>{STATUS_LABELS[report.status]}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centeredContainer: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: 32 },
  notSignedInText: { fontSize: 18, color: '#64748b', marginTop: 16, marginBottom: 24 },
  signInBtn: { backgroundColor: GH_GREEN, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 12 },
  signInBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  header: { padding: 20, backgroundColor: '#fff', marginBottom: 15, borderBottomWidth: 3, borderBottomColor: GH_RED },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: GH_GREEN, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  userInfo: { flex: 1 },
  userName: { fontSize: 20, fontWeight: 'bold', color: GH_BLACK },
  userEmail: { fontSize: 14, color: '#64748b', marginTop: 4 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: GH_RED, paddingVertical: 10, borderRadius: 8 },
  signOutText: { color: GH_RED, fontWeight: 'bold', marginLeft: 6 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: GH_BLACK, marginBottom: 15 },
  settingsMenu: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  menuText: { fontSize: 16, color: '#334155' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  historyCount: { fontSize: 16, color: '#64748b' },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
      default: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    }),
  },
  historyInfo: { flex: 1, paddingRight: 10 },
  historyTitle: { fontSize: 14, fontWeight: 'bold', color: GH_BLACK, marginBottom: 4 },
  historyDesc: { fontSize: 12, color: '#64748b' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  spinner: { marginVertical: 24 },
  errorText: { color: GH_RED, fontSize: 14, textAlign: 'center', marginTop: 8 },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 16 },
});
