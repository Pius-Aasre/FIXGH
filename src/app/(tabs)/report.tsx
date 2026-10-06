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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { api } from '../../lib/api';
import { authStore } from '../../lib/auth-store';

// Ghana flag colours
const GH_RED   = '#CE1126';
const GH_GOLD  = '#FCD116';
const GH_GREEN = '#006B3F';
const GH_BLACK = '#1A1A1A';

export default function ReportScreen() {
  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [locationText, setLocationText] = useState('');
  const [gpsCoords, setGpsCoords]       = useState<{ latitude: number; longitude: number } | null>(null);
  const [image, setImage]               = useState<ImagePicker.ImagePickerResult | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [success, setSuccess]           = useState(false);
  const [gpsStatus, setGpsStatus]       = useState<'idle' | 'fetching' | 'got' | 'denied'>('idle');

  // Try to auto-detect GPS in the background — purely optional
  useEffect(() => {
    setGpsStatus('fetching');
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
    setSuccess(false);
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

    setError(null);
    setLoading(true);
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
      if (image && !image.canceled && image.assets?.[0]) {
        formData.append('image', {
          uri: image.assets[0].uri,
          type: 'image/jpeg',
          name: 'report.jpg',
        } as any);
      }

      await api.reports.submit(formData);
      setSuccess(true);
      resetForm();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const selectedImageUri = image && !image.canceled ? image.assets?.[0]?.uri : null;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header banner with Ghana stripe */}
      <View style={styles.header}>
        <View style={styles.flagStripe} />
        <View style={styles.headerContent}>
          <Ionicons name="megaphone" size={28} color={GH_RED} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Report an Issue</Text>
            <Text style={styles.subtitle}>Help fix Ghana's infrastructure</Text>
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

        {/* Success message */}
        {success && (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={22} color={GH_GREEN} />
            <View style={{ flex: 1 }}>
              <Text style={styles.successTitle}>Report Submitted! 🇬🇭</Text>
              <Text style={styles.successText}>Our AI has categorised your complaint. Authorities will be notified.</Text>
            </View>
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

        {/* Image */}
        <Text style={styles.label}>Attach Photo (optional)</Text>
        {selectedImageUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: selectedImageUri }} style={styles.previewImage} />
            <TouchableOpacity style={styles.removeImage} onPress={() => setImage(null)}>
              <Ionicons name="close-circle" size={28} color={GH_RED} />
            </TouchableOpacity>
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
  previewContainer: { position: 'relative', marginBottom: 18 },
  previewImage: { width: '100%', height: 180, borderRadius: 12, resizeMode: 'cover' },
  removeImage: { position: 'absolute', top: 8, right: 8 },

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
});
