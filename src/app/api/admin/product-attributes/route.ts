import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ProductAttribute from "@/app/models/ProductAttribute";

const SORT_FIELDS = ["createdAt", "name"];

// GET /api/admin/product-attributes?q=&page=1&limit=10&sort=createdAt&order=asc
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

    const filter = escaped ? { name: { $regex: escaped, $options: "i" } } : {};

    const total = await ProductAttribute.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    page = Math.min(page, totalPages);

    const docs = await ProductAttribute.find(filter)
      .sort({ [sortField]: order, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const items = docs.map((d: any) => ({
      _id: d._id.toString(),
      name: d.name,
    }));

    return NextResponse.json({ items, total, page, totalPages });
  } catch (err) {
    console.error("GET product-attributes:", err);
    return NextResponse.json({ error: "Failed to load attributes" }, { status: 500 });
  }
}

// POST /api/admin/product-attributes  { name }
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const name = String(body.name ?? "").trim();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const attr = await ProductAttribute.create({ name });
    return NextResponse.json({ _id: attr._id.toString(), name: attr.name }, { status: 201 });
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json({ error: "This attribute already exists" }, { status: 409 });
    }
    console.error("POST product-attributes:", err);
    return NextResponse.json({ error: "Failed to create attribute" }, { status: 500 });
  }
}