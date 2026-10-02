import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import ProductCategory from "@/app/models/ProductCategory";
import { uniqueCategorySlug } from "@/lib/categorySlug";
import { slugify } from "@/lib/slugify";
import { stripHtml } from "@/lib/stripHtml";

const SORT_FIELDS = ["createdAt", "name", "slug"];
const oid = (v: unknown) => (mongoose.isValidObjectId(v) ? String(v) : null);

// GET /api/admin/product-categories?q=&page=1&limit=10&sort=createdAt&order=asc
// GET /api/admin/product-categories?all=1  -> parent dropdown ke liye poori list
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const sp = req.nextUrl.searchParams;

    if (sp.get("all") === "1") {
      const all = await ProductCategory.find({})
        .select("name parent")
        .sort({ name: 1 })
        .collation({ locale: "en" })
        .lean();

      return NextResponse.json(
        all.map((c: any) => ({
          _id: c._id.toString(),
          name: c.name,
          parent: c.parent ? c.parent.toString() : "",
        }))
      );
    }

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

    const total = await ProductCategory.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    page = Math.min(page, totalPages);

    const docs = await ProductCategory.find(filter)
      .populate("parent", "name")
      .sort({ [sortField]: order, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const items = docs.map((d: any) => ({
      _id: d._id.toString(),
      name: d.name,
      slug: d.slug,
      description: d.description ?? "",
      descriptionText: stripHtml(d.description ?? "").slice(0, 200),
      parent: d.parent?._id ? d.parent._id.toString() : "",
      parentName: d.parent?.name ?? "",
      image: d.image ? d.image.toString() : "",
      icon: d.icon ? d.icon.toString() : "",
    }));

    return NextResponse.json({ items, total, page, totalPages });
  } catch (err) {
    console.error("GET product-categories:", err);
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  }
}

// POST /api/admin/product-categories
export async function POST(req: NextRequest) {
  try {
    await connectDB();
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

    if (parent && !(await ProductCategory.exists({ _id: parent }))) {
      return NextResponse.json({ error: "Parent category not found" }, { status: 400 });
    }

    let slug: string;
    if (rawSlug) {
      slug = slugify(rawSlug, "category");
      if (await ProductCategory.exists({ slug })) {
        return NextResponse.json({ error: "This slug is already in use" }, { status: 409 });
      }
    } else {
      slug = await uniqueCategorySlug(name);
    }

    const cat = await ProductCategory.create({
      name, slug, description, parent, image, icon,
    });

    return NextResponse.json({ _id: cat._id.toString() }, { status: 201 });
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: "A category with this name already exists under the selected parent" },
        { status: 409 }
      );
    }
    console.error("POST product-categories:", err);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}