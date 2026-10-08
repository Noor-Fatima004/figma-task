import mongoose from "mongoose";
import { cookies } from "next/headers";
import GalleryImage from "@/app/models/GalleryImage";
import User from "@/app/models/User";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/jwt";

export const LOW_STOCK_THRESHOLD = 5;

export async function resolveMediaUrlLists(
  mediaLists: string[][]
): Promise<string[][]> {
  const galleryIds = [
    ...new Set(
      mediaLists
        .flat()
        .filter((value) => mongoose.isValidObjectId(value))
    ),
  ];
  const images = galleryIds.length
    ? await GalleryImage.find({ _id: { $in: galleryIds } })
        .select("_id url")
        .lean()
    : [];
  const urls = new Map(
    images.map((image) => [
      image._id.toString(),
      image.url || `/api/gallery/image/${image._id.toString()}`,
    ])
  );

  return mediaLists.map((media) =>
    media.map((value) => {
      if (mongoose.isValidObjectId(value)) {
        return urls.get(value) ?? "";
      }
      try {
        const url = new URL(value);
        return url.protocol === "https:" ? value : "";
      } catch {
        return "";
      }
    })
  );
}

export async function resolveMediaUrls(media: string[]): Promise<string[]> {
  const [urls] = await resolveMediaUrlLists([media]);
  return urls ?? [];
}

export async function getAuthenticatedCustomer() {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "user") return null;
  await connectDB();
  return User.findById(payload.userId).select("name email role").lean();
}
