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
  width: number;
  height: number;
  bytes: number;
};

const MAX_EDGE = 1600; // plenty for macro estimation, small enough to upload on cell data
const QUALITY = 0.82;

export function photosSupported(): boolean {
  return Platform.OS === 'web';
}

/** Opens the OS picker (camera on mobile browsers) and returns one processed photo. */
export async function pickPhoto(): Promise<PickedPhoto | null> {
  if (Platform.OS !== 'web') {
    throw new Error('Photo capture on native needs expo-image-picker — not installed yet.');
  }

  const file = await chooseFile();
  if (!file) return null;
  return downscale(file);
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

async function downscale(file: File): Promise<PickedPhoto> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', QUALITY)
  );

  return { uri: URL.createObjectURL(blob), blob, width, height, bytes: blob.size };
}
