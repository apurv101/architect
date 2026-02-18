import type { ImageAttachment } from "./types";

export const SUPPORTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

type SupportedMediaType = (typeof SUPPORTED_IMAGE_TYPES)[number];

/** Maximum file size in bytes (10 MB) */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/**
 * Read a File object as a base64-encoded ImageAttachment.
 * Validates file type and size before reading.
 */
export function fileToBase64(file: File): Promise<ImageAttachment> {
  return new Promise((resolve, reject) => {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type as SupportedMediaType)) {
      reject(
        new Error(
          `Unsupported image type: ${file.type}. Supported: PNG, JPG, WEBP, GIF`
        )
      );
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      reject(
        new Error(
          `Image too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: 10MB`
        )
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve({
        data: base64,
        mediaType: file.type as ImageAttachment["mediaType"],
      });
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}
