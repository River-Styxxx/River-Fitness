/**
 * Photo capture, client side only for now.
 *
 * Nothing here touches the network. A picked file is decoded, downscaled and
 * re-encoded to JPEG through a canvas, which also drops EXIF (including GPS)
 * as a side effect of re-encoding — the spec requires stripping it before a
 * photo ever leaves the device.
 *
 * Web implementation only. Native needs expo-image-picker, which isn't a
 * dependency yet; `pickPhoto` throws a clear error there rather than failing
 * silently at runtime.
 */
import { Platform } from 'react-native';

export type PickedPhoto = {
  /** displayable in <Image source={{ uri }} /> */
  uri: string;
  /** the re-encoded bytes, ready to upload once a bucket exists */
  blob: Blob;
  /**
   * A ~240px copy, made here rather than on a server later.
   *
   * The full-size photo is deleted after two weeks; this outlives it, so a
   * review from six months ago still shows something when a note is tapped.
   * Making it at capture time costs one extra canvas pass and means the purge
   * job never has to download, decode and re-upload anything — it only deletes.
   */
  thumb: Blob;
  width: number;
  height: number;
  bytes: number;
};

/**
 * Two profiles, because the two kinds of photo are answering different questions.
 *
 * A meal shot is a question for the estimator: how much food is on this plate.
 * 1024px answers that as well as 1600 did — the plate, the utensil for scale and
 * the label text all survive — at roughly a third of the bytes. Since every one
 * of these is deleted inside two weeks anyway, paying for resolution nobody will
 * ever look at is paying twice.
 *
 * A progress photo is the opposite: it IS the data, it is kept for the whole
 * program, and the compare view is someone looking closely at small changes. So
 * it keeps its native resolution and only gets re-encoded, which is what strips
 * the EXIF (GPS included) on the way through.
 */
export type PhotoProfile = 'meal' | 'progress';

const PROFILE: Record<PhotoProfile, { maxEdge: number | null; quality: number }> = {
  meal: { maxEdge: 1024, quality: 0.75 },
  progress: { maxEdge: null, quality: 0.92 },
};

const THUMB_EDGE = 240;
const THUMB_QUALITY = 0.7;

export function photosSupported(): boolean {
  return Platform.OS === 'web';
}

/** Opens the OS picker (camera on mobile browsers) and returns one processed photo. */
export async function pickPhoto(profile: PhotoProfile = 'meal'): Promise<PickedPhoto | null> {
  if (Platform.OS !== 'web') {
    throw new Error('Photo capture on native needs expo-image-picker — not installed yet.');
  }

  const file = await chooseFile();
  if (!file) return null;
  return downscale(file, profile);
}

function chooseFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    // hints mobile browsers to offer the camera directly
    input.setAttribute('capture', 'environment');
    input.style.display = 'none';
    input.addEventListener('change', () => {
      resolve(input.files?.[0] ?? null);
      input.remove();
    });
    // a cancelled picker fires no change event; clean up when focus returns
    window.addEventListener(
      'focus',
      () => setTimeout(() => { if (!input.files?.length) { resolve(null); input.remove(); } }, 500),
      { once: true }
    );
    document.body.appendChild(input);
    input.click();
  });
}

/** one canvas pass: draw the bitmap at a target size and hand back JPEG bytes */
function encode(bitmap: ImageBitmap, edge: number | null, quality: number): Promise<Blob> {
  const scale = edge == null ? 1 : Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', quality)
  );
}

async function downscale(file: File, profile: PhotoProfile = 'meal'): Promise<PickedPhoto> {
  const { maxEdge, quality } = PROFILE[profile];
  const bitmap = await createImageBitmap(file);
  // a null cap means native size — re-encoded anyway, which is what drops the EXIF
  const scale = maxEdge == null ? 1 : Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const [blob, thumb] = await Promise.all([
    encode(bitmap, maxEdge, quality),
    encode(bitmap, THUMB_EDGE, THUMB_QUALITY),
  ]);
  bitmap.close();

  return { uri: URL.createObjectURL(blob), blob, thumb, width, height, bytes: blob.size };
}
