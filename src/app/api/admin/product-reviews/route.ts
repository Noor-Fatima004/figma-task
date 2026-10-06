import { NextRequest, NextResponse } from "next/server";
// ⚠️ Apni DB connect file ka import yahan lagao
import  connectDB  from "@/lib/mongodb";
import Review from "@/app/models/Review";

const SORTABLE = [
  "createdAt",
  "review",
  "email",
  "name",
  "rating",
  "productName",
  "status",
];
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const sp = req.nextUrl.searchParams;

    const q = (sp.get("q") ?? "").trim();
    const limit = Math.min(Math.max(Number(sp.get("limit")) || 10, 1), 100);
    const sortParam = sp.get("sort") ?? "";
    const sortKey = SORTABLE.includes(sortParam) ? sortParam : "createdAt";
    const dir = sp.get("order") === "asc" ? 1 : -1;

    const filter = q
      ? {
          $or: ["review", "email", "name", "productName", "status"].map((f) => ({
            [f]: { $regex: escapeRegex(q), $options: "i" },
          })),
        }
      : {};

    const total = await Review.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const page = Math.min(Math.max(Number(sp.get("page")) || 1, 1), totalPages);

    const items = await Review.find(filter)
      .sort({ [sortKey]: dir, _id: dir })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      items: items.map((r) => ({
        _id: String(r._id),
        review: r.review,
        email: r.email,
        name: r.name,
        rating: r.rating,
        productName: r.productName,
        status: r.status,
      })),
      total,
      page,
      totalPages,
    });
  } catch (e) {
    console.error("GET /api/admin/product-reviews failed:", e);
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }
}
