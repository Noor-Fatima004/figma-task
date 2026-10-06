import  connectDB  from "@/lib/mongodb";
import GalleryImageModel from "@/app/models/GalleryImage";

export default async function GalleryImage({ id, className }: { id: string; className?: string }) {
  await connectDB();
  const img = await GalleryImageModel.findById(id).select("alt width height url").lean();
  if (!img) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={img.url || `/api/gallery/image/${id}`}
      alt={img.alt}
      width={img.width}
      height={img.height}
      className={className}
    />
  );
}