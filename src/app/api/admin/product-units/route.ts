import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ProductUnit from "@/app/models/ProductUnit";

const SORT_FIELDS = ["createdAt", "name", "status"];

// GET /api/admin/product-units?q=&page=1&limit=10&sort=createdAt&order=asc
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

    const total = await ProductUnit.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    page = Math.min(page, totalPages);

    const docs = await ProductUnit.find(filter)
      .sort({ [sortField]: order, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const items = docs.map((d: any) => ({
      _id: d._id.toString(),
      name: d.name,
      status: d.status,
    }));

    return NextResponse.json({ items, total, page, totalPages });
  } catch (err) {
    console.error("GET product-units:", err);
    return NextResponse.json({ error: "Failed to load units" }, { status: 500 });
  }
}

// POST /api/admin/product-units  { name, status }
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const status = body.status === "inactive" ? "inactive" : "active";

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const unit = await ProductUnit.create({ name, status });
    return NextResponse.json(
      { _id: unit._id.toString(), name: unit.name, status: unit.status },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json({ error: "This unit already exists" }, { status: 409 });
    }
    console.error("POST product-units:", err);
    return NextResponse.json({ error: "Failed to create unit" }, { status: 500 });
  }
}