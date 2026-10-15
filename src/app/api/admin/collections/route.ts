import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Collection from "@/app/models/Collection";
import "@/app/models/GalleryImage";
import "@/app/models/Product";
import { slugify } from "@/lib/slugify";
import { requireAdmin } from "@/lib/requireAdmin";

const oid = (v: unknown) => (mongoose.isValidObjectId(v) ? String(v) : null);

const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// GET /api/admin/collections?q=
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();

  try {
    await connectDB();
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter = escaped ? { name: { $regex: escaped, $options: "i" } } : {};

    const docs = await Collection.find(filter)
      .populate("image", "url")
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return NextResponse.json(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      docs.map((d: any) => ({
        _id: String(d._id),
        name: d.name,
        slug: d.slug,
        description: d.description ?? "",
        imageUrl: d.image?.url ?? "",
        productIds: (d.products ?? []).map(String),
        productCount: (d.products ?? []).length,
        isActive: d.isActive,
        sortOrder: d.sortOrder,
      }))
    );
  } catch (err) {
    console.error("GET admin collections:", err);
    return NextResponse.json({ error: "Failed to load collections" }, { status: 500 });
  }
}

// POST /api/admin/collections
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();

  try {
    await connectDB();
    const body = await req.json();

    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Collection name is required" }, { status: 400 });
    }

    let slug = slugify(String(body.slug ?? "").trim() || name, "collection");
    if (await Collection.exists({ slug })) {
      if (body.slug) {
        return NextResponse.json({ error: "This slug is already in use" }, { status: 409 });
      }
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const products = Array.isArray(body.products)
      ? body.products.map(oid).filter(Boolean)
      : [];

    const col = await Collection.create({
      name,
      slug,
      description: String(body.description ?? ""),
      image: oid(body.image),
      products,
      isActive: body.isActive !== false,
      sortOrder: Number(body.sortOrder) || 0,
    });

    return NextResponse.json({ _id: String(col._id) }, { status: 201 });
  } catch (err) {
    console.error("POST admin collections:", err);
    return NextResponse.json({ error: "Failed to create collection" }, { status: 500 });
  }
}