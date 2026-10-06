import { config as loadDotEnv } from "dotenv";
import mongoose from "mongoose";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import GalleryImage from "../src/app/models/GalleryImage";
import Product from "../src/app/models/Product";
import User from "../src/app/models/User";
import {
  imageExists,
  cloudinaryImageUrl,
  requireCloudinaryConfig,
  siteAssetPublicId,
  siteAssetUrl,
  uploadImage,
} from "../src/lib/cloudinary";
import { cloudinaryPublicIdFromUrl } from "../src/lib/galleryMedia";

loadDotEnv({ path: path.join(process.cwd(), ".env.local") });
const CLOUDINARY_ROOT = process.env.CLOUDINARY_FOLDER?.trim() || "nextcent";

const DRY_RUN = process.argv.includes("--dry-run");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const IMAGE_MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function normalizedPath(value: string): string {
  let localPath = value;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (!["localhost", "127.0.0.1"].includes(url.hostname)) return "";
      localPath = url.pathname;
    } catch {
      return "";
    }
  }
  return localPath.replace(/\\/g, "/").replace(/^\/+/, "").replace(/^public\//i, "");
}

async function migrate() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is required to migrate database images");
  if (!DRY_RUN) requireCloudinaryConfig();
  await mongoose.connect(mongoUri);

  try {
    const files = (await readdir(PUBLIC_DIR, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && IMAGE_MIME_TYPES[path.extname(entry.name).toLowerCase()])
      .map((entry) => entry.name);
    const assetUrls = new Map<string, { url: string; publicId: string }>();

    console.log(`${DRY_RUN ? "[dry-run] " : ""}Public image assets: ${files.length}`);
    for (const fileName of files) {
      try {
        const publicId = siteAssetPublicId(fileName);
        if (DRY_RUN) {
          console.log(`[dry-run] Upload public/${fileName} -> ${publicId}`);
          assetUrls.set(normalizedPath(fileName).toLowerCase(), {
            url: "",
            publicId,
          });
          continue;
        }

        if (await imageExists(publicId)) {
          console.log(`Already on Cloudinary: ${publicId}`);
          assetUrls.set(normalizedPath(fileName).toLowerCase(), {
            url: siteAssetUrl(fileName),
            publicId,
          });
          continue;
        }

        const buffer = await readFile(path.join(PUBLIC_DIR, fileName));
        const uploaded = await uploadImage(
          {
            buffer,
            fileName,
            mimeType: IMAGE_MIME_TYPES[path.extname(fileName).toLowerCase()],
          },
          "site-assets",
          { publicId }
        );
        assetUrls.set(normalizedPath(fileName).toLowerCase(), {
          url: uploaded.url,
          publicId: uploaded.publicId,
        });
        console.log(`Uploaded public/${fileName} -> ${uploaded.publicId}`);
      } catch (error) {
        console.error(`Failed to migrate public/${fileName}:`, error);
      }
    }

    const oldGalleryImages = await GalleryImage.find({
      data: { $exists: true, $ne: null },
    });
    for (const image of oldGalleryImages) {
      if (image.url && image.publicId) {
        if (!DRY_RUN) await GalleryImage.updateOne({ _id: image._id }, { $unset: { data: "" } });
        console.log(`Already migrated gallery image: ${image._id}`);
        continue;
      }
      if (DRY_RUN) {
        console.log(`[dry-run] Upload gallery image ${image._id} (${image.name})`);
        continue;
      }

      try {
        if (!image.data) throw new Error("Legacy gallery record contains no image data");
        const buffer = Buffer.isBuffer(image.data)
          ? image.data
          : Buffer.from(image.data as unknown as Uint8Array);
        const publicId = `${CLOUDINARY_ROOT}/gallery/gallery-${image._id}`;
        const uploaded = await imageExists(publicId)
          ? {
              url: cloudinaryImageUrl(publicId),
              publicId,
              width: image.width,
              height: image.height,
              format: image.contentType.split("/")[1],
              bytes: buffer.length,
            }
          : await uploadImage(
              {
                buffer,
                fileName: image.name || `gallery-${image._id}.${image.contentType.split("/")[1]}`,
                mimeType: image.contentType,
              },
              "gallery",
              { publicId: `gallery-${image._id}` }
            );
        await GalleryImage.updateOne(
          { _id: image._id },
          {
            $set: {
              url: uploaded.url,
              publicId: uploaded.publicId,
              width: uploaded.width || image.width,
              height: uploaded.height || image.height,
              format: uploaded.format,
              bytes: uploaded.bytes,
            },
            $unset: { data: "" },
          }
        );
        console.log(`Migrated gallery image: ${image._id} -> ${uploaded.publicId}`);
      } catch (error) {
        console.error(`Failed to migrate gallery image ${image._id}:`, error);
      }
    }

    const galleryImages = await GalleryImage.find({ publicId: { $ne: "" } })
      .select("_id url publicId")
      .lean();
    const galleryById = new Map(
      galleryImages.map((image) => [image._id.toString(), image])
    );

    const users = await User.find({
      image: { $nin: ["", null] },
    });
    for (const user of users) {
      if (user.imagePublicId) {
        console.log(`Already migrated user avatar: ${user._id}`);
        continue;
      }

      const dataUri = /^data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/=]+)$/i.exec(
        user.image
      );
      if (dataUri) {
        if (DRY_RUN) {
          console.log(`[dry-run] Upload user avatar ${user._id}`);
          continue;
        }
        try {
          const extension = dataUri[1].toLowerCase();
          const mimeType = `image/${extension}`;
          const publicId = `${CLOUDINARY_ROOT}/users/user-${user._id}`;
          const avatarBuffer = Buffer.from(dataUri[2], "base64");
          const uploaded = await imageExists(publicId)
            ? {
                url: cloudinaryImageUrl(publicId),
                publicId,
              }
            : await uploadImage(
                {
                  buffer: avatarBuffer,
                  fileName: `avatar.${extension}`,
                  mimeType,
                },
                "users",
                { publicId: `user-${user._id}` }
              );
          user.image = uploaded.url;
          user.imagePublicId = uploaded.publicId;
          await user.save();
          console.log(`Migrated user avatar: ${user._id} -> ${uploaded.publicId}`);
        } catch (error) {
          console.error(`Failed to migrate user avatar ${user._id}:`, error);
        }
        continue;
      }

      const existingPublicId = cloudinaryPublicIdFromUrl(user.image);
      if (existingPublicId) {
        if (!DRY_RUN) {
          user.imagePublicId = existingPublicId;
          await user.save();
        }
        console.log(`${DRY_RUN ? "[dry-run] " : ""}Linked Cloudinary user avatar ${user._id}`);
        continue;
      }

      const asset = assetUrls.get(normalizedPath(user.image).toLowerCase());
      if (asset) {
        if (!DRY_RUN) {
          user.image = asset.url;
          user.imagePublicId = asset.publicId;
          await user.save();
        }
        console.log(`${DRY_RUN ? "[dry-run] " : ""}Linked local user avatar ${user._id}`);
      } else {
        console.warn(`Unrecognized legacy user image on ${user._id}; left unchanged`);
      }
    }

    const products = await Product.find({ media: { $exists: true, $ne: [] } });
    for (const product of products) {
      let changed = false;
      const publicIds: string[] = [];
      const media = product.media.map((value) => {
        const pathValue = normalizedPath(value);
        const imageId =
          mongoose.isValidObjectId(value) ? value :
          /\/api\/gallery\/image\/([a-f\d]{24})/i.exec(value)?.[1];
        const galleryImage = imageId ? galleryById.get(imageId) : undefined;
        if (galleryImage?.url && galleryImage.publicId) {
          publicIds.push(galleryImage.publicId);
          if (value !== galleryImage.url) changed = true;
          return galleryImage.url;
        }

        const asset = assetUrls.get(pathValue.toLowerCase());
        if (asset) {
          publicIds.push(asset.publicId);
          if (value !== asset.url) changed = true;
          return asset.url || value;
        }

        const cloudPublicId = cloudinaryPublicIdFromUrl(value);
        publicIds.push(cloudPublicId ?? product.mediaPublicIds[publicIds.length] ?? "");
        if (!cloudPublicId && !galleryById.has(value)) {
          const kind = value.startsWith("data:")
            ? "data URI"
            : /^https?:\/\//i.test(value)
              ? "non-Cloudinary URL"
              : mongoose.isValidObjectId(value)
                ? `unresolved gallery reference (${value.length} characters)`
              : path.extname(value)
                ? `local path (${path.extname(value)})`
                : "unrecognized reference";
          console.warn(
            `Unrecognized product media (${kind}) on ${product._id}; left unchanged`
          );
        }
        return value;
      });

      if (!changed && product.mediaPublicIds.length === publicIds.length &&
          product.mediaPublicIds.every((id, index) => id === publicIds[index])) {
        continue;
      }
      if (DRY_RUN) {
        console.log(`[dry-run] Update product media references: ${product._id}`);
      } else {
        product.media = media;
        product.mediaPublicIds = publicIds;
        await product.save();
        console.log(`Updated product media references: ${product._id}`);
      }
    }
  } finally {
    await mongoose.disconnect();
  }
}

migrate().catch((error: unknown) => {
  console.error("Cloudinary image migration failed:", error);
  process.exitCode = 1;
});
