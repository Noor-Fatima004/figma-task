import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import ProductBrand from "@/app/models/ProductBrand";
import "@/app/models/GalleryImage";
import { uniqueBrandSlug } from "@/lib/brandSlug";

const SORT_FIELDS = ["createdAt", "name", "slug", "status"];
type PopulatedGalleryImage = { _id: mongoose.Types.ObjectId; url: string };

// GET /api/admin/product-brands?q=&page=1&limit=10&sort=createdAt&order=asc
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const sp = req.nextUrl.searchParams;

    const q = (sp.get("q") ?? "").trim();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "10", 10) || 10));
    let page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);

    const sortField = SORT_FIELDS.includes(sp.get("sort") ?? "")
      ? (sp.get("sort") as string)
      : "createdAt";
    const order = sp.get("order") === "desc" ? -1 : 1;

    const filter = escaped
      ? {
          $or: [
            { name: { $regex: escaped, $options: "i" } },
            { slug: { $regex: escaped, $options: "i" } },
          ],
        }
      : {};

    const total = await ProductBrand.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    page = Math.min(page, totalPages);

    const docs = await ProductBrand.find(filter)
      .populate<{ image: PopulatedGalleryImage | null }>("image", "url")
      .sort({ [sortField]: order, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const items = docs.map((d) => ({
      _id: d._id.toString(),
      name: d.name,
      slug: d.slug,
      status: d.status,
      image: d.image?._id ? d.image._id.toString() : d.image ? d.image.toString() : "",
      imageUrl: d.image?.url ?? "",
    }));

    return NextResponse.json({ items, total, page, totalPages });
  } catch (err) {
    console.error("GET product-brands:", err);
    return NextResponse.json({ error: "Failed to load brands" }, { status: 500 });
  }
}

// POST /api/admin/product-brands  { name, status, image }
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const status = body.status === "inactive" ? "inactive" : "active";
    const image = mongoose.isValidObjectId(body.image) ? body.image : null;

    if (!name) {
      return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
    }

    const slug = await uniqueBrandSlug(name);
    const brand = await ProductBrand.create({ name, slug, status, image });

    return NextResponse.json(
      {
        _id: brand._id.toString(),
        name: brand.name,
        slug: brand.slug,
        status: brand.status,
        image: brand.image ? brand.image.toString() : "",
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === 11000) {
      return NextResponse.json({ error: "This brand already exists" }, { status: 409 });
    }
    console.error("POST product-brands:", err);
    return NextResponse.json({ error: "Failed to create brand" }, { status: 500 });
  }
}