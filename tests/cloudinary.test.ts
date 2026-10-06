import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { Writable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import type {
  UploadApiOptions,
  UploadApiResponse,
  UploadResponseCallback,
  UploadStream,
} from "cloudinary";
import {
  siteAssetPublicId,
  uploadImage,
  validateImageBuffer,
} from "../src/lib/cloudinary";

const originalUploadStream = cloudinary.uploader.upload_stream;
const originalEnvironment = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  folder: process.env.CLOUDINARY_FOLDER,
};

afterEach(() => {
  cloudinary.uploader.upload_stream = originalUploadStream;
  for (const [key, value] of Object.entries({
    CLOUDINARY_CLOUD_NAME: originalEnvironment.cloudName,
    CLOUDINARY_API_KEY: originalEnvironment.apiKey,
    CLOUDINARY_API_SECRET: originalEnvironment.apiSecret,
    CLOUDINARY_FOLDER: originalEnvironment.folder,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("uploadImage sends validated bytes to the configured Cloudinary folder", async () => {
  process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  process.env.CLOUDINARY_API_KEY = "test-key";
  process.env.CLOUDINARY_API_SECRET = "test-secret";
  process.env.CLOUDINARY_FOLDER = "nextcent";

  let capturedFolder = "";
  cloudinary.uploader.upload_stream = ((
    options: UploadApiOptions,
    callback?: UploadResponseCallback
  ) => {
    capturedFolder = options.folder ?? "";
    return new Writable({
      write(_chunk, _encoding, done) {
        done();
      },
      final(done) {
        callback?.(undefined, {
          secure_url: "https://res.cloudinary.com/test-cloud/image/upload/nextcent/gallery/test",
          public_id: "nextcent/gallery/test",
          width: 32,
          height: 32,
          format: "png",
          bytes: 8,
        } as UploadApiResponse);
        done();
      },
    }) as UploadStream;
  }) as typeof originalUploadStream;

  const image = await uploadImage(
    {
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      fileName: "tiny.png",
      mimeType: "image/png",
    },
    "gallery"
  );

  assert.equal(capturedFolder, "nextcent/gallery");
  assert.equal(image.url.startsWith("https://res.cloudinary.com/"), true);
  assert.equal(image.publicId, "nextcent/gallery/test");
  assert.deepEqual(
    [image.width, image.height, image.format, image.bytes],
    [32, 32, "png", 8]
  );
});

test("validateImageBuffer rejects unsupported types and mismatched file contents", () => {
  assert.throws(
    () => validateImageBuffer(Buffer.from("not image"), "image/svg+xml", "bad.svg"),
    /Only JPG, PNG, WEBP, and GIF/
  );
  assert.throws(
    () => validateImageBuffer(Buffer.from("not png"), "image/png", "bad.png"),
    /contents do not match/
  );
});

test("site asset public IDs are stable for repeatable migration", () => {
  process.env.CLOUDINARY_FOLDER = "nextcent";
  assert.equal(siteAssetPublicId("Logo (1).png"), "nextcent/site-assets/Logo-1");
  assert.equal(siteAssetPublicId("Logo (1).png"), "nextcent/site-assets/Logo-1");
});
