import { NextRequest, NextResponse } from "next/server";
import mongoose, { PipelineStage } from "mongoose";
import connectDB from "@/lib/mongodb";
import ProductVariation from "@/app/models/ProductVariation";
import ProductAttribute from "@/app/models/ProductAttribute";

const SORT_FIELDS = ["createdAt", "name", "attribute"];

// GET /api/admin/product-variations?q=&page=1&limit=10&sort=createdAt&order=asc
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

    // attribute ka naam join karte hain taaki attribute se search/sort ho sake
    const base: PipelineStage[] = [
      {
        $lookup: {
          from: ProductAttribute.collection.name,
          localField: "attribute",
          foreignField: "_id",
          as: "attr",
        },
      },
      { $unwind: { path: "$attr", preserveNullAndEmptyArrays: true } },
      { $addFields: { attributeName: { $ifNull: ["$attr.name", ""] } } },
    ];

    if (escaped) {
      base.push({
        $match: {
          $or: [
            { name: { $regex: escaped, $options: "i" } },
            { attributeName: { $regex: escaped, $options: "i" } },
          ],
        },
      });
    }

    const countRes = await ProductVariation.aggregate([...base, { $count: "n" }]);
    const total = countRes[0]?.n ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    page = Math.min(page, totalPages);

    const sortStage: Record<string, 1 | -1> =
      sortField === "attribute"
        ? { attributeName: order, _id: 1 }
        : { [sortField]: order, _id: 1 };

    const docs = await ProductVariation.aggregate([
      ...base,
      { $sort: sortStage },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]).collation({ locale: "en" });

    const items = docs.map((d: any) => ({
      _id: d._id.toString(),
      name: d.name,
      attribute: d.attribute.toString(),
      attributeName: d.attributeName,
    }));

    return NextResponse.json({ items, total, page, totalPages });
  } catch (err) {
    console.error("GET product-variations:", err);
    return NextResponse.json({ error: "Failed to load variations" }, { status: 500 });
  }
}

// POST /api/admin/product-variations  { name, attribute }
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const attributeId = String(body.attribute ?? "");

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(attributeId)) {
      return NextResponse.json({ error: "Please select an attribute" }, { status: 400 });
    }

    const attr = await ProductAttribute.findById(attributeId).lean<{ name: string }>();
    if (!attr) {
      return NextResponse.json({ error: "Attribute not found" }, { status: 400 });
    }

    const v = await ProductVariation.create({ name, attribute: attributeId });
    return NextResponse.json(
      {
        _id: v._id.toString(),
        name: v.name,
        attribute: attributeId,
        attributeName: attr.name,
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: "This variation already exists for the selected attribute" },
        { status: 409 }
      );
    }
    console.error("POST product-variations:", err);
    return NextResponse.json({ error: "Failed to create variation" }, { status: 500 });
  }
}