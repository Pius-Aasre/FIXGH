import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Linking,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, NewsItem, NewsSource } from '../../lib/api';

// Ghana flag colours
const GH_RED   = '#CE1126';
const GH_GOLD  = '#FCD116';
const GH_GREEN = '#006B3F';
const GH_BLACK = '#1A1A1A';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Bulletproof date parser that never throws on Hermes or Android
 */
function timeAgo(iso?: string | null): string {
  if (!iso || typeof iso !== 'string') return 'Recent';
  try {
    const timestamp = Date.parse(iso);
    if (isNaN(timestamp)) return 'Recent';

    const diffMs = Date.now() - timestamp;
    if (isNaN(diffMs) || diffMs < 0) return 'Just now';

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return 'Recent';
    const day = d.getDate();
    const month = MONTH_NAMES[d.getMonth()] || '';
    return `${day} ${month}`;
  } catch {
    return 'Recent';
  }
}

/**
 * Validates that an image URI is safe for Android Fresco image loader
 */
function isValidImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    (trimmed.startsWith('http://') || trimmed.startsWith('https://')) &&
    !trimmed.includes('<') &&
    !trimmed.includes('>')
  );
}

export default function NewsScreen() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch sources list once
  useEffect(() => {
    let mounted = true;
    api.news.sources()
      .then(srcs => {
        if (mounted && Array.isArray(srcs)) setSources(srcs);
      })
      .catch(() => {
        if (mounted) {
          setSources([
            { key: 'myjoyonline', name: 'MyJoyOnline', color: '#dc2626' },
            { key: 'citinewsroom', name: 'Citi Newsroom', color: '#0284c7' },
            { key: 'ghanaiantimes', name: 'Ghanaian Times', color: '#16a34a' },
            { key: 'graphiconline', name: 'Graphic Online', color: '#ea580c' },
            { key: 'modernghana', name: 'Modern Ghana', color: '#d97706' },
            { key: 'ghanaweb', name: 'GhanaWeb', color: '#2563eb' },
            { key: 'peacefm', name: 'Peace FM', color: '#9333ea' },
            { key: 'adomonline', name: 'Adom Online', color: '#e11d48' },
            { key: 'accramail', name: 'Accra Mail', color: '#0d9488' },
          ]);
        }
      });
    return () => { mounted = false; };
  }, []);

  const loadArticles = useCallback(async (sourceKey = selectedSource, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const items = await api.news.list(sourceKey === 'all' ? undefined : sourceKey, isRefresh);
      setNews(Array.isArray(items) ? items : []);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to connect to live news stream.');
      setNews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSource]);

  useEffect(() => {
    loadArticles(selectedSource, false);
  }, [selectedSource, loadArticles]);

  const onRefresh = () => {
    setRefreshing(true);
    loadArticles(selectedSource, true);
  };

  const openArticle = (url?: string) => {
    if (!url || typeof url !== 'string') return;
    try {
      Linking.openURL(url).catch((err) => {
        console.warn('Cannot open link:', url, err?.message);
      });
    } catch (e: any) {
      console.warn('Link open exception:', e?.message);
    }
  };

  const renderHeader = () => (
    <View style={styles.topSection}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Ghana News Desk</Text>
          <Text style={styles.subtitle}>Live updates & infrastructure coverage</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshIconBtn}
            onPress={onRefresh}
            activeOpacity={0.7}
            disabled={refreshing || loading}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color={refreshing ? '#94a3b8' : '#0f172a'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Source filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        <TouchableOpacity
          style={[
            styles.chip,
            selectedSource === 'all' && styles.chipActive,
          ]}
          onPress={() => setSelectedSource('all')}
        >
          <Text
            style={[
              styles.chipText,
              selectedSource === 'all' && styles.chipTextActive,
            ]}
          >
            All Outlets
          </Text>
        </TouchableOpacity>

        {sources.map((s) => {
          const isSelected = selectedSource === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[
                styles.chip,
                isSelected && { backgroundColor: s.color, borderColor: s.color },
              ]}
              onPress={() => setSelectedSource(s.key)}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextActive,
                ]}
              >
                {s.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderArticle = useCallback(({ item }: { item: NewsItem }) => {
    if (!item) return null;
    const safeTitle = typeof item.title === 'string' ? item.title : 'Incident update';
    const safeSource = typeof item.source === 'string' ? item.source : 'Ghana News';
    const safeDesc = typeof item.description === 'string' ? item.description : '';
    const hasValidImage = isValidImageUrl(item.imageUrl);
    const sourceColor = typeof item.sourceColor === 'string' ? item.sourceColor : '#0284c7';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => openArticle(item.link)}
      >
        {hasValidImage ? (
          <Image
            source={{ uri: item.imageUrl as string }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.cardImage, styles.placeholderImage]}>
            <Ionicons name="newspaper-outline" size={40} color="#94a3b8" />
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.cardMeta}>
            <View
              style={[
                styles.sourceBadge,
                { backgroundColor: '#e2e8f0' },
              ]}
            >
              <Text
                style={[
                  styles.sourceBadgeText,
                  { color: sourceColor },
                ]}
              >
                {safeSource}
              </Text>
            </View>
            <Text style={styles.timeAgo}>{timeAgo(item.publishedAt)}</Text>
          </View>

          <Text style={styles.cardTitle} numberOfLines={3}>
            {safeTitle}
          </Text>

          {safeDesc ? (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {safeDesc}
            </Text>
          ) : null}

          <View style={styles.cardFooter}>
            <Text style={styles.readMoreText}>Read full story</Text>
            <Ionicons name="open-outline" size={14} color="#0f172a" />
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [openArticle]);

  return (
    <View style={styles.container}>
      {renderHeader()}

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0f172a" />
          <Text style={styles.loadingText}>Fetching live Ghana feeds...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadArticles(selectedSource, true)}
          >
            <Text style={styles.retryBtnText}>Tap to Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (!news || news.length === 0) ? (
        <View style={styles.centerContainer}>
          <Ionicons name="documents-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyText}>No news articles found for this source.</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => setSelectedSource('all')}
          >
            <Text style={styles.retryBtnText}>View All Outlets</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={Array.isArray(news) ? news : []}
          keyExtractor={(item, index) => (item?.id ? String(item.id) : String(index))}
          renderItem={renderArticle}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          extraData={selectedSource}
          refreshControl={
            Platform.OS !== 'web' ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#0f172a']}
                tintColor="#0f172a"
              />
            ) : undefined
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topSection: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 3,
    borderBottomColor: GH_RED,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: GH_BLACK,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GH_RED,
    marginRight: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GH_RED,
    marginRight: 4,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: GH_RED,
    letterSpacing: 0.5,
  },
  refreshIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: GH_GREEN,
  },
  filterScroll: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: GH_GREEN,
    borderColor: GH_GREEN,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  separator: {
    height: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...Platform.select({
      web: {
        boxShadow: '0 3px 8px rgba(0, 107, 63, 0.08)',
      },
      default: {
        shadowColor: GH_BLACK,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#e2e8f0',
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
  },
  cardContent: {
    padding: 16,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timeAgo: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: GH_BLACK,
    lineHeight: 22,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0fdf4',
    marginTop: 4,
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: GH_GREEN,
    marginRight: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: GH_RED,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: GH_GREEN,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
