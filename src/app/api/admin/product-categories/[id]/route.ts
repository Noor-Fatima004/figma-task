import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import ProductCategory from "@/app/models/ProductCategory";
import { slugify } from "@/lib/slugify";
import { safeDelete, usageError } from "@/lib/safeDelete";

type Ctx = { params: Promise<{ id: string }> };
const oid = (v: unknown) => (mongoose.isValidObjectId(v) ? String(v) : null);

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "");
    const parent = oid(body.parent);
    const image = oid(body.image);
    const icon = oid(body.icon);
    const rawSlug = String(body.slug ?? "").trim();

    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    await connectDB();
    const existing = await ProductCategory.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Loop se bachao: category apne hi child ke neeche nahi ja sakti
    if (parent) {
      let cursor: string | null = parent;
      let depth = 0;
      while (cursor && depth++ < 100) {
        if (cursor === id) {
          return NextResponse.json(
            { error: "A category cannot be placed under itself or its own sub-categories" },
            { status: 400 }
          );
        }
        const p: { parent?: mongoose.Types.ObjectId | null } | null =
          await ProductCategory.findById(cursor).select("parent").lean();
        if (!p) {
          return NextResponse.json({ error: "Parent category not found" }, { status: 400 });
        }
        cursor = p.parent ? p.parent.toString() : null;
      }
    }

    let slug = existing.slug;
    if (rawSlug) {
      slug = slugify(rawSlug, "category");
      if (slug !== existing.slug && (await ProductCategory.exists({ slug, _id: { $ne: id } }))) {
        return NextResponse.json({ error: "This slug is already in use" }, { status: 409 });
      }
    }

    existing.name = name;
    existing.slug = slug;
    existing.description = description;
    existing.parent = parent ? new mongoose.Types.ObjectId(parent) : null;
    existing.image = image ? new mongoose.Types.ObjectId(image) : null;
    existing.icon = icon ? new mongoose.Types.ObjectId(icon) : null;
    await existing.save();

    return NextResponse.json({ _id: existing._id.toString() });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === 11000) {
      return NextResponse.json(
        { error: "A category with this name already exists under the selected parent" },
        { status: 409 }
      );
    }
    console.error("PUT product-categories:", err);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDB();

    const { deleted, usage } = await safeDelete("category", id, (session) =>
      ProductCategory.findByIdAndDelete(id).session(session)
    );
    if (usage.length > 0) {
      return NextResponse.json({ error: usageError("category", usage) }, { status: 409 });
    }
    if (!deleted) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE product-categories:", err);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}