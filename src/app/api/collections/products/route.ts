import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/app/models/Product";
import { requireAdmin } from "@/lib/requireAdmin";
import { getEnTranslation } from "@/lib/storefrontProduct";
import { getAvailableByProduct } from "@/lib/stockSummary";

// GET /api/collections/products -> collection form ke liye products + unka available stock
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const docs = await Product.find({})
      .select("translations slug")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const stock = await getAvailableByProduct();

    return NextResponse.json(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      docs.map((d: any) => ({
        _id: String(d._id),
        name: getEnTranslation(d.translations).name || d.slug || "Untitled",
        slug: d.slug ?? "",
        stock: stock.get(String(d._id)) ?? 0,
      }))
    );
  } catch (e) {
    console.error("GET collections products:", e);
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
  }
}