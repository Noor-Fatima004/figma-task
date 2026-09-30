import  connectDB  from "@/lib/mongodb";
import GalleryImage from "@/app/models/GalleryImage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const img = await GalleryImage.findById(id).select("data contentType");
  if (!img) return new Response("Not found", { status: 404 });

  return new Response(img.data, {
    headers: {
      "Content-Type": img.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}