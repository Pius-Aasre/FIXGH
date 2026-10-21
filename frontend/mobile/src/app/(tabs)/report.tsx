import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { api } from '../../lib/api';
import { authStore } from '../../lib/auth-store';

// Ghana flag colours
const GH_RED   = '#CE1126';
const GH_GOLD  = '#FCD116';
const GH_GREEN = '#006B3F';
const GH_BLACK = '#1A1A1A';

/** Longest edge (px) allowed for an uploaded evidence photo. */
const MAX_IMAGE_DIMENSION = 1600;
/** JPEG compression applied to the downscaled photo. */
const IMAGE_COMPRESSION = 0.72;

/**
 * Downscale and re-encode a picked photo so it fits the backend's 5 MB limit.
 *
 * Phone cameras produce 4000px+ images which exceed the upload limit and
 * waste bandwidth — the report is saved even if the photo cannot be, so this
 * keeps the common case fast and lossless enough for evidence.
 */
async function prepareImageForUpload(uri: string): Promise<{ uri: string; mimeType: string; fileName: string }> {
  const probeContext = ImageManipulator.manipulate(uri);
  const probe = await probeContext.renderAsync();

  let rendered = probe;
  const longestEdge = Math.max(probe.width, probe.height);

  if (longestEdge > MAX_IMAGE_DIMENSION) {
    const scale = MAX_IMAGE_DIMENSION / longestEdge;
    const resizedContext = ImageManipulator.manipulate(uri);
    rendered = await resizedContext.resize({
      width: Math.round(probe.width * scale),
      height: Math.round(probe.height * scale),
    }).renderAsync();
  }

  const result = await rendered.saveAsync({
    compress: IMAGE_COMPRESSION,
    format: SaveFormat.JPEG,
  });

  return {
    uri: result.uri,
    mimeType: 'image/jpeg',
    fileName: `report-${Date.now()}.jpg`,
  };
}

export default function ReportScreen() {
  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [locationText, setLocationText] = useState('');
  const [gpsCoords, setGpsCoords]       = useState<{ latitude: number; longitude: number } | null>(null);
  const [image, setImage]               = useState<ImagePicker.ImagePickerResult | null>(null);
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [sentModalVisible, setSentModalVisible] = useState(false);
  const [imageUploadStatus, setImageUploadStatus] = useState<'none' | 'uploading' | 'done' | 'failed'>('none');
  const [gpsStatus, setGpsStatus]               = useState<'idle' | 'fetching' | 'got' | 'denied'>('fetching');
  const [photoFailed, setPhotoFailed]           = useState(false);
  const [authorityNotified, setAuthorityNotified] = useState(false);

  // Animation values for the sent overlay.
  // `useState` with an initialiser avoids re-creating the Animated.Value on
  // every render, which the react-hooks/refs rule flags.
  const [checkScale]   = useState(() => new Animated.Value(0));
  const [modalOpacity] = useState(() => new Animated.Value(0));

  function showSentModal() {
    setSentModalVisible(true);
    checkScale.setValue(0);
    modalOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(modalOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function closeSentModal() {
    Animated.timing(modalOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setSentModalVisible(false);
    });
  }

  // Try to auto-detect GPS in the background — purely optional
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setGpsStatus('denied');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setGpsCoords(loc.coords);
        setGpsStatus('got');
      } catch {
        setGpsStatus('denied');
      }
    })();
  }, []);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Media library access is needed to attach photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.7,
    });
    if (!result.canceled) setImage(result);
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.7 });
    if (!result.canceled) setImage(result);
  }, []);

  function resetForm() {
    setTitle('');
    setDescription('');
    setLocationText('');
    setImage(null);
    setError(null);
    setImageUploadStatus('none');
    setPhotoFailed(false);
    setAuthorityNotified(false);
  }

  async function handleSubmit() {
    if (!authStore.isAuthenticated()) {
      setError('Please log in to submit a report.');
      return;
    }
    if (!title.trim()) {
      setError('Issue title is required.');
      return;
    }
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }
    if (!locationText.trim()) {
      setError('Please enter a location (e.g. "Spintex Road, Accra").');
      return;
    }

    const hasImage = !!(image && !image.canceled && image.assets?.[0]);

    setError(null);
    setLoading(true);
    setPhotoFailed(false);
    if (hasImage) setImageUploadStatus('uploading');
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('locationText', locationText.trim());
      // Send GPS if available — backend stores it alongside the text
      if (gpsCoords) {
        formData.append('latitude', String(gpsCoords.latitude));
        formData.append('longitude', String(gpsCoords.longitude));
      }
      if (hasImage) {
        const asset = image!.assets![0];
        // Downscale before uploading so the photo fits the backend's 5 MB cap
        const prepared = await prepareImageForUpload(asset.uri);
        formData.append('image', {
          uri: prepared.uri,
          type: prepared.mimeType,
          name: prepared.fileName,
        } as any);
      }

      const result = await api.reports.submit(formData);

      // Reset first — resetForm() clears the notification flags
      resetForm();

      if (result.imageUploadFailed) {
        // The report was saved, but the photo could not be stored.
        setImageUploadStatus('failed');
        setPhotoFailed(true);
      } else if (hasImage) {
        setImageUploadStatus('done');
      }

      setAuthorityNotified(!!result.authorityNotified);
      showSentModal();
    } catch (err: any) {
      setImageUploadStatus('none');
      setError(err?.message ?? 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const selectedImageUri = image && !image.canceled ? image.assets?.[0]?.uri : null;

  return (
    <>
      {/* ── Full-screen "Sent" success overlay ── */}
      <Modal
        visible={sentModalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeSentModal}
      >
        <Animated.View style={[styles.sentOverlay, { opacity: modalOpacity }]}>
          <View style={styles.sentCard}>
            {/* Ghana flag stripe trio at top of card */}
            <View style={styles.sentFlagBar}>
              <View style={[styles.sentStripe, { backgroundColor: GH_RED }]} />
              <View style={[styles.sentStripe, { backgroundColor: GH_GOLD }]} />
              <View style={[styles.sentStripe, { backgroundColor: GH_GREEN }]} />
            </View>

            {/* Animated check circle */}
            <Animated.View style={[styles.sentCheckWrap, { transform: [{ scale: checkScale }] }]}>
              <Ionicons name="checkmark-circle" size={80} color={GH_GREEN} />
            </Animated.View>

            <Text style={styles.sentHeading}>Report Sent! 🇬🇭</Text>
            <Text style={styles.sentBody}>
              Your report has been submitted successfully.{'\n'}
              Our AI will categorise it and notify the relevant authorities.
            </Text>

            {/* Divider */}
            <View style={styles.sentDivider} />

            {/* Info rows */}
            <View style={styles.sentInfoRow}>
              <Ionicons name="sparkles" size={16} color={GH_GOLD} />
              <Text style={styles.sentInfoText}>AI categorisation in progress…</Text>
            </View>
            <View style={styles.sentInfoRow}>
              <Ionicons
                name={authorityNotified ? 'notifications' : 'notifications-outline'}
                size={16}
                color={GH_GREEN}
              />
              <Text style={styles.sentInfoText}>
                {authorityNotified ? 'Authority alerted by email' : 'Authorities will be notified shortly'}
              </Text>
            </View>

            {/* The report is always saved — a failed photo must not look like a failed report */}
            {photoFailed && (
              <View style={styles.sentInfoRow}>
                <Ionicons name="alert-circle-outline" size={16} color={GH_RED} />
                <Text style={[styles.sentInfoText, { color: GH_RED }]}>
                  Photo could not be uploaded — report saved without it
                </Text>
              </View>
            )}

            {/* CTA */}
            <TouchableOpacity style={styles.sentBtn} onPress={closeSentModal} activeOpacity={0.85}>
              <Text style={styles.sentBtnText}>Submit Another Report</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>

      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header banner with Ghana stripe */}
        <View style={styles.header}>
          <View style={styles.flagStripe} />
          <View style={styles.headerContent}>
            <Ionicons name="megaphone" size={28} color={GH_RED} />
            <View style={styles.headerText}>
              <Text style={styles.title}>Report an Issue</Text>
              <Text style={styles.subtitle}>Help fix Ghana&apos;s infrastructure</Text>
            </View>
          </View>
        </View>

        <View style={styles.formContainer}>
          {/* Auth warning */}
          {!authStore.isAuthenticated() && (
            <View style={styles.warningBox}>
              <Ionicons name="lock-closed-outline" size={18} color="#92400e" />
              <Text style={styles.warningText}>Please log in to submit a report.</Text>
            </View>
          )}

          {/* Issue Title */}
          <Text style={styles.label}>Issue Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Deep pothole on main road"
            placeholderTextColor="#94a3b8"
            value={title}
            onChangeText={setTitle}
          />

          {/* Location — text input */}
          <Text style={styles.label}>Location *</Text>
          <Text style={styles.hint}>Type the area, road or landmark</Text>
          <View style={styles.locationWrapper}>
            <Ionicons name="location" size={20} color={GH_RED} style={styles.locationIcon} />
            <TextInput
              style={styles.locationInput}
              placeholder="e.g. Spintex Road, near Accra Mall"
              placeholderTextColor="#94a3b8"
              value={locationText}
              onChangeText={setLocationText}
              returnKeyType="done"
            />
          </View>
          {/* GPS badge */}
          <View style={styles.gpsBadge}>
            <Ionicons
              name={gpsStatus === 'got' ? 'navigate-circle' : 'navigate-circle-outline'}
              size={14}
              color={gpsStatus === 'got' ? GH_GREEN : '#94a3b8'}
            />
            <Text style={[styles.gpsText, gpsStatus === 'got' && styles.gpsTextActive]}>
              {gpsStatus === 'fetching' ? 'Detecting GPS…'
                : gpsStatus === 'got'    ? `GPS attached (${gpsCoords!.latitude.toFixed(4)}, ${gpsCoords!.longitude.toFixed(4)})`
                : 'GPS unavailable — location text only'}
            </Text>
          </View>

          {/* Description */}
          <Text style={styles.label}>Description *</Text>
          <Text style={styles.hint}>Describe the problem in detail — our AI will assign the right category automatically</Text>
          <TextInput
            style={styles.textArea}
            multiline
            placeholder="e.g. Large pothole causing vehicles to swerve, dangerous at night."
            placeholderTextColor="#94a3b8"
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />

          {/* AI Category notice */}
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={16} color={GH_GOLD} />
            <Text style={styles.aiText}>Category assigned automatically by AI after submission</Text>
          </View>

          {/* ── Photo attachment ── */}
          <Text style={styles.label}>Attach Photo (optional)</Text>
          {selectedImageUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedImageUri }} style={styles.previewImage} />
              {/* Upload status overlay on the preview */}
              {imageUploadStatus === 'uploading' && (
                <View style={styles.imageUploadOverlay}>
                  <ActivityIndicator color="#fff" size="large" />
                  <Text style={styles.imageUploadOverlayText}>Uploading photo…</Text>
                </View>
              )}
              {imageUploadStatus === 'done' && (
                <View style={[styles.imageUploadOverlay, styles.imageUploadOverlayDone]}>
                  <Ionicons name="checkmark-circle" size={36} color="#fff" />
                  <Text style={styles.imageUploadOverlayText}>Photo uploaded!</Text>
                </View>
              )}
              {imageUploadStatus === 'failed' && (
                <View style={[styles.imageUploadOverlay, styles.imageUploadOverlayFailed]}>
                  <Ionicons name="alert-circle-outline" size={36} color="#fff" />
                  <Text style={styles.imageUploadOverlayText}>Photo not uploaded</Text>
                </View>
              )}
              {imageUploadStatus === 'none' && (
                <TouchableOpacity style={styles.removeImage} onPress={() => setImage(null)}>
                  <Ionicons name="close-circle" size={28} color={GH_RED} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.imageButtons}>
              <TouchableOpacity style={styles.imgBtn} onPress={pickImage}>
                <Ionicons name="images-outline" size={22} color={GH_GREEN} />
                <Text style={styles.imgBtnText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imgBtn} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={22} color={GH_RED} />
                <Text style={styles.imgBtnText}>Camera</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Image status badge (below the preview, once selected) */}
          {selectedImageUri && imageUploadStatus === 'none' && (
            <View style={styles.imgStatusBadge}>
              <Ionicons name="image-outline" size={14} color={GH_GREEN} />
              <Text style={styles.imgStatusText}>Photo ready to attach</Text>
            </View>
          )}

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={GH_RED} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Report  🇬🇭</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },

  // Header
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 14,
    overflow: 'hidden',
  },
  flagStripe: {
    height: 5,
    backgroundColor: GH_RED,
    // Simulate Ghana flag stripe trio
    borderBottomWidth: 5,
    borderBottomColor: GH_GOLD,
    // Additional green stripe via shadow hack (decorative)
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  headerText: { marginLeft: 12 },
  title: { fontSize: 22, fontWeight: '800', color: GH_BLACK, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },

  // Form
  formContainer: { padding: 20 },
  label: { fontSize: 15, fontWeight: '700', color: GH_BLACK, marginBottom: 4, marginTop: 10 },
  hint: { fontSize: 12, color: '#64748b', marginBottom: 8 },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: GH_BLACK,
    marginBottom: 14,
  },

  // Location
  locationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: GH_RED,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  locationIcon: { marginRight: 8 },
  locationInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: GH_BLACK,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  gpsText: { fontSize: 11, color: '#94a3b8', marginLeft: 4 },
  gpsTextActive: { color: GH_GREEN, fontWeight: '600' },

  // Description
  textArea: {
    backgroundColor: '#fff',
    height: 110,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginBottom: 10,
    color: GH_BLACK,
  },

  // AI badge
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: GH_GOLD,
    borderRadius: 8,
    padding: 10,
    marginBottom: 18,
  },
  aiText: { fontSize: 12, color: '#92400e', marginLeft: 6, flex: 1 },

  // Image
  imageButtons: { flexDirection: 'row', marginBottom: 18 },
  imgBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 14,
    marginRight: 8,
  },
  imgBtnText: { fontSize: 14, fontWeight: '600', color: GH_BLACK, marginLeft: 6 },
  previewContainer: { position: 'relative', marginBottom: 4 },
  previewImage: { width: '100%', height: 180, borderRadius: 12, resizeMode: 'cover' },
  removeImage: { position: 'absolute', top: 8, right: 8 },

  // Image upload overlay (shown while uploading / after done)
  imageUploadOverlay: {
    position: 'absolute',
    inset: 0,
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imageUploadOverlayDone: { backgroundColor: 'rgba(0,107,63,0.72)' },
  imageUploadOverlayFailed: { backgroundColor: 'rgba(206,17,38,0.72)' },
  imageUploadOverlayText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    marginTop: 6,
  },

  // "Photo ready" badge below preview
  imgStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 6,
  },
  imgStatusText: { fontSize: 12, color: GH_GREEN, fontWeight: '600', marginLeft: 5 },

  // Alerts
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: GH_GOLD,
  },
  warningText: { color: '#92400e', fontSize: 14, flex: 1, marginLeft: 8 },

  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: GH_GREEN,
  },
  successTitle: { fontSize: 14, fontWeight: '700', color: GH_GREEN, marginLeft: 10 },
  successText: { fontSize: 12, color: '#166534', marginLeft: 10, marginTop: 2 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: GH_RED,
  },
  errorText: { color: GH_RED, fontSize: 14, flex: 1, marginLeft: 8 },

  // Submit
  submitBtn: {
    backgroundColor: GH_GREEN,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
    ...Platform.select({
      ios: { shadowColor: GH_GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },

  // ── Sent overlay (full-screen modal) ──
  sentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sentCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  },
  sentFlagBar: { flexDirection: 'row', height: 6 },
  sentStripe: { flex: 1 },
  sentCheckWrap: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 8,
  },
  sentHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: GH_BLACK,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  sentBody: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sentDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  sentInfoText: { fontSize: 13, color: '#475569', marginLeft: 8 },
  sentBtn: {
    margin: 20,
    backgroundColor: GH_GREEN,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: GH_GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  sentBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

