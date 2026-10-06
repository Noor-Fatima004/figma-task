import { v2 as cloudinary } from "cloudinary";
import { Readable } from "node:stream";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIME_FORMATS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type CloudinaryImage = {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

type ImageInput = File | {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
};

type ImageOptions = {
  publicId?: string;
};

export function requireCloudinaryConfig() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = process.env.CLOUDINARY_API_KEY?.trim();
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();
  const missing = [
    ["CLOUDINARY_CLOUD_NAME", cloud_name],
    ["CLOUDINARY_API_KEY", api_key],
    ["CLOUDINARY_API_SECRET", api_secret],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required Cloudinary environment variables: ${missing.join(", ")}`);
  }

  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  return { cloud_name: cloud_name!, api_key: api_key!, api_secret: api_secret! };
}

function getImageBytes(input: ImageInput) {
  if (input instanceof File) {
    return {
      buffer: Buffer.from([]),
      fileName: input.name,
      mimeType: input.type,
      size: input.size,
      read: async () => Buffer.from(await input.arrayBuffer()),
    };
  }

  return {
    buffer: input.buffer,
    fileName: input.fileName,
    mimeType: input.mimeType,
    size: input.buffer.length,
    read: async () => input.buffer,
  };
}

export function validateImageBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName = "upload"
): string {
  const format = MIME_FORMATS[mimeType.toLowerCase()];
  if (!format) {
    throw new Error("Only JPG, PNG, WEBP, and GIF images are allowed");
  }
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Image must be larger than 0 bytes and no larger than 5MB");
  }

  const signatures: Record<string, boolean> = {
    jpg: buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
    png: buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    webp:
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP",
    gif: /^GIF8[79]a$/.test(buffer.toString("ascii", 0, 6)),
  };
  const extension = fileName.split(".").pop()?.toLowerCase();
  const compatibleExtension =
    !extension || extension === fileName.toLowerCase()
      ? true
      : extension === format ||
        (format === "jpg" && ["jpeg", "jfif"].includes(extension));

  if (!signatures[format] || !compatibleExtension) {
    throw new Error("Image contents do not match the selected file type");
  }
  return format;
}

export async function uploadImage(
  file: ImageInput,
  folder: string,
  options: ImageOptions = {}
): Promise<CloudinaryImage> {
  requireCloudinaryConfig();
  const input = getImageBytes(file);
  const buffer = await input.read();
  validateImageBuffer(buffer, input.mimeType, input.fileName);
  if (input.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be no larger than 5MB");
  }

  const rootFolder = process.env.CLOUDINARY_FOLDER?.trim() || "nextcent";
  const normalizedFolder = folder
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
  const fullFolder = normalizedFolder.startsWith(`${rootFolder}/`) ||
    normalizedFolder === rootFolder
    ? normalizedFolder
    : `${rootFolder}/${normalizedFolder}`;
  const requestedPublicId = options.publicId?.replace(/^\/+|\/+$/g, "");
  const publicId = requestedPublicId?.startsWith(`${fullFolder}/`)
    ? requestedPublicId.slice(fullFolder.length + 1)
    : requestedPublicId;

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: fullFolder,
        resource_type: "image",
        allowed_formats: Object.values(MIME_FORMATS),
        ...(publicId ? { public_id: publicId, overwrite: false } : {}),
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
          return;
        }
        if (!result?.secure_url || !result.public_id) {
          reject(new Error("Cloudinary upload returned incomplete image metadata"));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );
    Readable.from(buffer).pipe(upload);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  requireCloudinaryConfig();
  if (!publicId.trim()) throw new Error("Cloudinary public ID is required");
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(`Cloudinary deletion failed for ${publicId}: ${result.result}`);
  }
}

export async function imageExists(publicId: string): Promise<boolean> {
  requireCloudinaryConfig();
  try {
    await cloudinary.api.resource(publicId, { resource_type: "image" });
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "http_code" in error &&
      error.http_code === 404
    ) {
      return false;
    }
    throw error;
  }
}

export function cloudinaryImageUrl(publicId: string): string {
  const { cloud_name } = requireCloudinaryConfig();
  return cloudinary.url(publicId, {
    cloud_name,
    secure: true,
    resource_type: "image",
  });
}

export function siteAssetPublicId(fileName: string): string {
  const rootFolder = process.env.CLOUDINARY_FOLDER?.trim() || "nextcent";
  const baseName = fileName
    .replace(/^.*[\\/]/, "")
    .replace(/\.[^.]+$/, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "");
  if (!baseName) throw new Error(`Invalid public image filename: ${fileName}`);
  return `${rootFolder}/site-assets/${baseName}`;
}

export function siteAssetUrl(fileName: string): string {
  return cloudinaryImageUrl(siteAssetPublicId(fileName));
}

export { MAX_IMAGE_BYTES };
