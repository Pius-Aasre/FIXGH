import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Camera,
  CheckCircle,
  Image as ImageIcon,
  Images,
  Lock,
  Megaphone,
  Navigation,
  Sparkles,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { GH_GOLD, GH_GREEN, GH_RED } from '@/lib/format';
import { FlagBar, InlineError } from '@/components/ui';

/** Longest edge (px) allowed for an uploaded evidence photo — mirrors the mobile app. */
const MAX_IMAGE_DIMENSION = 1600;
/** JPEG compression applied to the downscaled photo — mirrors the mobile app. */
const IMAGE_COMPRESSION = 0.72;

/**
 * Downscale and re-encode a picked photo so it fits the backend's 5 MB limit.
 * Mirrors `prepareImageForUpload` in frontend/mobile/src/app/(tabs)/report.tsx.
 */
async function prepareImageForUpload(file: File): Promise<{ blob: Blob; fileName: string }> {
  const bitmap = await createImageBitmap(file);
  const longestEdge = Math.max(bitmap.width, bitmap.height);
  const scale = longestEdge > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / longestEdge : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process the image.');
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', IMAGE_COMPRESSION)
  );
  if (!blob) throw new Error('Could not process the image.');

  return { blob, fileName: `report-${Date.now()}.jpg` };
}

type ImageUploadStatus = 'none' | 'uploading' | 'done' | 'failed';
type GpsStatus = 'idle' | 'fetching' | 'got' | 'denied';

export default function Report() {
  const { isAuthenticated } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState('');
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('fetching');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploadStatus, setImageUploadStatus] = useState<ImageUploadStatus>('none');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sentModalVisible, setSentModalVisible] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [authorityNotified, setAuthorityNotified] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Try to auto-detect GPS in the background — purely optional, same as mobile.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGpsStatus('got');
      },
      () => setGpsStatus('denied'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Revoke the object URL when the preview changes or the component unmounts.
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const selectFile = useCallback((file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Only image files can be attached.');
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageUploadStatus('none');
    setError(null);
  }, [imagePreview]);

  function resetForm() {
    setTitle('');
    setDescription('');
    setLocationText('');
    setImageFile(null);
    setImagePreview(null);
    setError(null);
    setImageUploadStatus('none');
    setPhotoFailed(false);
    setAuthorityNotified(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!isAuthenticated) {
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

    const hasImage = !!imageFile;

    setError(null);
    setLoading(true);
    setPhotoFailed(false);
    if (hasImage) setImageUploadStatus('uploading');

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('locationText', locationText.trim());
      if (gpsCoords) {
        formData.append('latitude', String(gpsCoords.latitude));
        formData.append('longitude', String(gpsCoords.longitude));
      }
      if (imageFile) {
        // Downscale before uploading so the photo fits the backend's 5 MB cap.
        const prepared = await prepareImageForUpload(imageFile);
        formData.append('image', prepared.blob, prepared.fileName);
      }

      const result = await api.reports.submit(formData);

      resetForm();

      if (result.imageUploadFailed) {
        setImageUploadStatus('failed');
        setPhotoFailed(true);
      } else if (hasImage) {
        setImageUploadStatus('done');
      }

      setAuthorityNotified(!!result.authorityNotified);
      setSentModalVisible(true);
    } catch (err) {
      setImageUploadStatus('none');
      setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in bg-[#fafafa]">
      {/* Sent overlay */}
      {sentModalVisible ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Report sent"
        >
          <div className="animate-pop-in w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <FlagBar />

            <div className="px-6 py-7 text-center">
              <CheckCircle size={80} color={GH_GREEN} className="mx-auto" />

              <h2 className="mt-3 text-xl font-black text-gh-black">Report Sent! 🇬🇭</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Your report has been submitted successfully.
                <br />
                Our AI will categorise it and notify the relevant authorities.
              </p>

              <div className="my-4 h-px bg-slate-100" />

              <div className="space-y-2.5 text-left">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} color={GH_GOLD} />
                  <span className="text-sm text-slate-600">AI categorisation in progress…</span>
                </div>
                <div className="flex items-center gap-2">
                  {authorityNotified ? (
                    <CheckCircle size={16} color={GH_GREEN} />
                  ) : (
                    <AlertCircle size={16} color={GH_GREEN} />
                  )}
                  <span className="text-sm text-slate-600">
                    {authorityNotified
                      ? 'Authority alerted by email'
                      : 'Authorities will be notified shortly'}
                  </span>
                </div>

                {photoFailed && (
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} color={GH_RED} />
                    <span className="text-sm text-gh-red">
                      Photo could not be uploaded — report saved without it
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSentModalVisible(false)}
                className="mt-6 w-full rounded-xl bg-secondary py-3.5 text-base font-bold text-white transition hover:bg-slate-800"
              >
                Submit Another Report
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Header banner with Ghana stripe */}
      <div className="border-b border-slate-200 bg-white pb-3.5">
        <FlagBar className="h-[5px]" />
        <div className="flex items-center px-5 pt-3.5 md:px-8">
          <Megaphone size={28} color={GH_RED} />
          <div className="ml-3">
            <h1 className="text-[22px] font-extrabold tracking-tight text-gh-black">Report an Issue</h1>
            <p className="mt-0.5 text-[13px] text-slate-500">Help fix Ghana&apos;s infrastructure</p>
          </div>
        </div>
      </div>

      <form className="px-5 py-5 md:px-8" onSubmit={handleSubmit}>
        {/* Auth warning */}
        {!isAuthenticated && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-50 px-3 py-2.5">
            <Lock size={18} color="#92400e" />
            <p className="text-sm text-amber-900">
              Please log in to submit a report.{' '}
              <Link to="/auth" className="font-bold underline">
                Sign in
              </Link>
            </p>
          </div>
        )}

        {/* Issue Title */}
        <label className="mt-2.5 block text-[15px] font-bold text-gh-black">Issue Title *</label>
        <p className="mb-2 text-xs text-slate-500">A short summary of the problem</p>
        <input
          className="mb-3.5 w-full rounded-xl border-[1.5px] border-slate-200 bg-white px-3.5 py-3 text-[15px] text-gh-black outline-none transition focus:border-gh-green"
          placeholder="e.g. Deep pothole on main road"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Location */}
        <label className="mt-2.5 block text-[15px] font-bold text-gh-black">Location *</label>
        <p className="mb-2 text-xs text-slate-500">Type the area, road or landmark</p>
        <div className="mb-1.5 flex items-center rounded-xl border-[1.5px] border-gh-red bg-white px-3">
          <Navigation size={20} color={GH_RED} className="mr-2 shrink-0" />
          <input
            className="w-full py-3 text-[15px] text-gh-black outline-none"
            placeholder="e.g. Spintex Road, near Accra Mall"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
          />
        </div>
        <div className="mb-3.5 flex items-center">
          {gpsStatus === 'got' ? (
            <Navigation size={14} color={GH_GREEN} />
          ) : (
            <Navigation size={14} color="#94a3b8" />
          )}
          <span
            className={`ml-1 text-[11px] ${
              gpsStatus === 'got' ? 'font-semibold text-gh-green' : 'text-slate-400'
            }`}
          >
            {gpsStatus === 'fetching'
              ? 'Detecting GPS…'
              : gpsStatus === 'got' && gpsCoords
                ? `GPS attached (${gpsCoords.latitude.toFixed(4)}, ${gpsCoords.longitude.toFixed(4)})`
                : 'GPS unavailable — location text only'}
          </span>
        </div>

        {/* Description */}
        <label className="mt-2.5 block text-[15px] font-bold text-gh-black">Description *</label>
        <p className="mb-2 text-xs text-slate-500">
          Describe the problem in detail — our AI will assign the right category automatically
        </p>
        <textarea
          className="mb-2.5 h-[110px] w-full resize-none rounded-xl border-[1.5px] border-slate-200 bg-white px-3.5 py-3.5 text-[15px] text-gh-black outline-none transition focus:border-gh-green"
          placeholder="e.g. Large pothole causing vehicles to swerve, dangerous at night."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* AI Category notice */}
        <div className="mb-1 flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2.5">
          <Sparkles size={16} color={GH_GOLD} />
          <span className="text-[13px] text-slate-700">
            Category assigned automatically by AI after submission
          </span>
        </div>

        {/* Photo attachment */}
        <label className="mt-5 block text-[15px] font-bold text-gh-black">Attach Photo (optional)</label>

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => selectFile(e.target.files?.[0])}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => selectFile(e.target.files?.[0])}
        />

        {imagePreview ? (
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
            <img src={imagePreview} alt="Attached evidence" className="h-56 w-full object-cover" />

            {imageUploadStatus === 'uploading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55">
                <span className="text-sm font-bold text-white">Uploading photo…</span>
              </div>
            )}
            {imageUploadStatus === 'done' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gh-green/70">
                <CheckCircle size={36} color="#fff" />
                <span className="mt-1 text-sm font-bold text-white">Photo uploaded!</span>
              </div>
            )}
            {imageUploadStatus === 'failed' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gh-red/70">
                <AlertCircle size={36} color="#fff" />
                <span className="mt-1 text-sm font-bold text-white">Photo not uploaded</span>
              </div>
            )}
            {imageUploadStatus === 'none' && (
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="absolute right-2 top-2 rounded-full bg-white/90 p-1 shadow"
                aria-label="Remove photo"
              >
                <X size={26} color={GH_RED} />
              </button>
            )}
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 transition hover:border-gh-green"
            >
              <Images size={22} color={GH_GREEN} />
              <span className="text-sm font-bold text-slate-700">Gallery</span>
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 transition hover:border-gh-red"
            >
              <Camera size={22} color={GH_RED} />
              <span className="text-sm font-bold text-slate-700">Camera</span>
            </button>
          </div>
        )}

        {imagePreview && imageUploadStatus === 'none' && (
          <div className="mt-2 flex items-center gap-1.5">
            <ImageIcon size={14} color={GH_GREEN} />
            <span className="text-[11px] text-gh-green">Photo ready to attach</span>
          </div>
        )}

        {/* Error */}
        {error ? (
          <div className="mt-4">
            <InlineError message={error} />
          </div>
        ) : null}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-secondary py-4 text-base font-bold text-white shadow-md transition hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? 'Submitting…' : 'Submit Report  🇬🇭'}
        </button>
      </form>
    </div>
  );
}
