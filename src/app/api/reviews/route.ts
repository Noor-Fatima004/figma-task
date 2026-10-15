// Rakho: src/app/api/reviews/route.ts  (purani file replace karo)
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Review from "@/app/models/Review";
import Order from "@/app/models/Order";

// true karne par sirf wo user review de sakta hai jisne ye product kharida ho
// aur uska order REVIEW_ORDER_STATUS mein ho. Abhi band hai (false).
const REQUIRE_PURCHASE = false;

/** Login user: name/email JWT cookie se aate hain (jaise /api/auth/me), client se kabhi nahi */
async function getUser(): Promise<{ id: string; name: string; email: string } | null> {
  try {
    const token = (await cookies()).get("token")?.value;
    if (!token) return null;
    const d = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id?: string;
      name?: string;
      email?: string;
    };
    if (!d.email) return null;
    return {
      id: String(d.id ?? ""),
      name: d.name?.trim() || "Customer",
      email: d.email.toLowerCase(),
    };
  } catch {
    return null;
  }
}

/** Sirf approved reviews (email kabhi bahar nahi jata). ?productId= se kisi ek product ke. */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const productId = req.nextUrl.searchParams.get("productId")?.trim();
    const filter: Record<string, unknown> = { status: "approved" };
    if (productId) filter.productId = productId;

    const [items, stats] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .limit(productId ? 20 : 6)
        .select("name productName rating review createdAt")
        .lean(),
      Review.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            avg: { $avg: "$rating" },
            count: { $sum: 1 },
            good: { $sum: { $cond: [{ $gte: ["$rating", 4] }, 1, 0] } },
          },
        },
      ]),
    ]);

    return NextResponse.json({
      items: items.map((r) => ({
        _id: String(r._id),
        name: r.name,
        productName: r.productName,
        rating: r.rating,
        review: r.review,
        createdAt: r.createdAt,
      })),
      average: stats[0] ? Math.round(stats[0].avg * 10) / 10 : 0,
      count: stats[0]?.count ?? 0,
      // 4 ya 5 star dene walon ka percent
      recommend: stats[0] ? Math.round((stats[0].good / stats[0].count) * 100) : 0,
    });
  } catch (e) {
    console.error("GET /api/reviews failed:", e);
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }
}

/** Sirf logged in user review de sakta hai */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to write a review." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const productId = String(body.productId ?? "").trim();
  const productName = String(body.productName ?? "").trim();
  const review = String(body.review ?? "").trim();
  const rating = Number(body.rating);

  if (!productId || !productName || productName.length > 120)
    return NextResponse.json({ error: "Product is required" }, { status: 400 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return NextResponse.json({ error: "Rating must be 1 to 5" }, { status: 400 });
  if (review.length < 5 || review.length > 1000)
    return NextResponse.json({ error: "Review must be 5 to 1000 characters" }, { status: 400 });

  try {
    await connectDB();

    // Optional: sirf asli customer (jisne ye product kharida aur order deliver hua)
    if (
      REQUIRE_PURCHASE &&
      mongoose.Types.ObjectId.isValid(user.id) &&
      mongoose.Types.ObjectId.isValid(productId)
    ) {
      const bought = await Order.exists({
        customer: new mongoose.Types.ObjectId(user.id),
        "items.product": new mongoose.Types.ObjectId(productId),
        status: "delivered",
      });
      if (!bought) {
        return NextResponse.json(
          { error: "Only customers who received this product can review it." },
          { status: 403 }
        );
      }
    }

    // Ek user, ek product, ek review
    const exists = await Review.exists({ email: user.email, productId });
    if (exists) {
      return NextResponse.json(
        { error: "You have already reviewed this product." },
        { status: 409 }
      );
    }

    await Review.create({
      name: user.name,
      email: user.email,
      productId,
      productName,
      rating,
      review,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("POST /api/reviews failed:", e);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}