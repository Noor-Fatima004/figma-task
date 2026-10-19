import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
// ⚠️ In 2 imports ko apni collections/route.ts ke imports se match karo
import  connectDB  from "@/lib/mongodb";
import Collection from "@/app/models/Collection";

type Ctx = { params: Promise<{ id: string }> };

const toSlug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const invalid = (id: string) => !mongoose.Types.ObjectId.isValid(id);

/* GET /api/admin/collections/:id */
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (invalid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await connectDB();
    const collection = await Collection.findById(id)
      .populate("image", "url") // image field ka ref gallery image model ko hona chahiye
      .lean();

    if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(collection);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch collection" }, { status: 500 });
  }
}

/* PUT /api/admin/collections/:id */
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (invalid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Collection name is required" }, { status: 400 });

    const slug = toSlug(body.slug || name);

    await connectDB();

    const duplicate = await Collection.findOne({ slug, _id: { $ne: id } }).lean();
    if (duplicate) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
    }

    const updated = await Collection.findByIdAndUpdate(
      id,
      {
        name,
        slug,
        description: body.description ?? "",
        image: body.image || null,
        products: Array.isArray(body.products) ? body.products : [],
        isActive: !!body.isActive,
        sortOrder: Number(body.sortOrder) || 0,
      },
      { new: true, runValidators: true }
    );

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update collection" }, { status: 500 });
  }
}

/* DELETE /api/admin/collections/:id */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (invalid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await connectDB();
    const deleted = await Collection.findByIdAndDelete(id);

    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete collection" }, { status: 500 });
  }
}