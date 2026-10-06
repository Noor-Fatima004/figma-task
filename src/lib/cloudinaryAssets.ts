export function siteAssetUrl(fileName: string): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error(
      "Missing CLOUDINARY_CLOUD_NAME: add it to .env.local and restart the Next.js server"
    );
  }

  const rootFolder = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || "nextcent";
  const baseName = fileName
    .replace(/^.*[\\/]/, "")
    .replace(/\.[^.]+$/, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "");
  if (!baseName) throw new Error(`Invalid public image filename: ${fileName}`);

  const publicId = `${rootFolder}/site-assets/${baseName}`;
  const encodedPath = publicId.split("/").map(encodeURIComponent).join("/");
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/upload/${encodedPath}`;
}
