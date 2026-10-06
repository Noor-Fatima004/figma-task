import mongoose from "mongoose";
import GalleryImage from "@/app/models/GalleryImage";

export function isCloudinaryImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

export async function resolveMediaPublicIds(media: string[]): Promise<string[]> {
  const ids = media.filter((value) => mongoose.isValidObjectId(value));
  const urls = media.filter(isCloudinaryImageUrl);
  const images = await GalleryImage.find({
    $or: [
      ...(ids.length > 0 ? [{ _id: { $in: ids } }] : []),
      ...(urls.length > 0 ? [{ url: { $in: urls } }] : []),
    ],
  })
    .select("_id url publicId")
    .lean();
  const byId = new Map(images.map((image) => [image._id.toString(), image.publicId]));
  const byUrl = new Map(images.map((image) => [image.url, image.publicId]));

  return media.map((value) => {
    if (mongoose.isValidObjectId(value)) return byId.get(value) ?? "";
    if (byUrl.has(value)) return byUrl.get(value) ?? "";
    return cloudinaryPublicIdFromUrl(value) ?? "";
  });
}

export function cloudinaryPublicIdFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.hostname !== "res.cloudinary.com") return null;
    const [, , , ...path] = url.pathname.split("/");
    const uploadIndex = path.indexOf("upload");
    if (uploadIndex < 0) return null;
    const segments = path.slice(uploadIndex + 1);
    if (segments[0]?.startsWith("v") && /^v\d+$/.test(segments[0])) {
      segments.shift();
    }
    const publicId = segments.map(decodeURIComponent).join("/").replace(/\.[^.]+$/, "");
    return publicId || null;
  } catch {
    return null;
  }
}
