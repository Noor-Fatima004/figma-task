import { NextRequest, NextResponse } from "next/server";
// ⚠️ Apni DB connect file ka import yahan lagao (jaisa baaki routes me hai)
import  connectDB  from "@/lib/mongodb";
import Review from "@/app/models/Review";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Website par sirf approved reviews dikhte hain (email kabhi bahar nahi jata) */
export async function GET() {
  try {
    await connectDB();
    const items = await Review.find({ status: "approved" })
      .sort({ createdAt: -1 })
      .limit(6)
      .select("name productName rating review createdAt")
      .lean();

    return NextResponse.json({
      items: items.map((r) => ({
        _id: String(r._id),
        name: r.name,
        productName: r.productName,
        rating: r.rating,
        review: r.review,
        createdAt: r.createdAt,
      })),
    });
  } catch (e) {
    console.error("GET /api/reviews failed:", e);
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }
}

/** Website ka review form yahan submit hota hai */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const productName = String(body.productName ?? "").trim();
  const review = String(body.review ?? "").trim();
  const rating = Number(body.rating);

  if (!name || name.length > 80)
    return NextResponse.json({ error: "Valid name is required" }, { status: 400 });
  if (!EMAIL_RE.test(email) || email.length > 120)
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  if (!productName || productName.length > 120)
    return NextResponse.json({ error: "Product name is required" }, { status: 400 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return NextResponse.json({ error: "Rating must be 1 to 5" }, { status: 400 });
  if (review.length < 5 || review.length > 1000)
    return NextResponse.json(
      { error: "Review must be 5 to 1000 characters" },
      { status: 400 }
    );

  try {
    await connectDB();
    await Review.create({ name, email, productName, rating, review });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("POST /api/reviews failed:", e);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
