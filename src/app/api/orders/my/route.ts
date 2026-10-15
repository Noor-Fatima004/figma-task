// Rakho: src/app/api/orders/my/route.ts
// GET /api/orders/my?page=1  ->  logged in user ke apne orders (naye pehle)
// Aapka POST /api/orders (order place karna) alag rehta hai, usko chhedna nahi.

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Order from "@/app/models/Order";
import { requireUser } from "@/lib/requireUser";

const PAGE_SIZE = 10;

type LeanItem = {
  product?: unknown;
  nameSnapshot?: string;
  imageSnapshot?: string;
  variantLabel?: string;
  unitPrice?: number;
  quantity?: number;
};

type LeanOrder = {
  _id: unknown;
  orderNumber: string;
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt: Date;
  subtotal?: number;
  shippingFee?: number;
  taxAmount?: number;
  total?: number;
  shippingAddress?: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  items?: LeanItem[];
};

export async function GET(req: NextRequest) {
  // Auth: POST /api/orders jaisa hi
  const user = await requireUser();
  if (!user || !mongoose.Types.ObjectId.isValid(user.userId)) {
    return NextResponse.json({ error: "Please sign in to view your orders." }, { status: 401 });
  }

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);

  try {
    await connectDB();

    // Sirf is user ke orders (customer = logged in user)
    const rows = (await Order.find({ customer: new mongoose.Types.ObjectId(user.userId) })
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE + 1)
      .select(
        "orderNumber status paymentMethod paymentStatus createdAt subtotal shippingFee taxAmount total shippingAddress items.product items.nameSnapshot items.imageSnapshot items.variantLabel items.unitPrice items.quantity"
      )
      .lean()) as unknown as LeanOrder[];

    const hasMore = rows.length > PAGE_SIZE;

    const orders = rows.slice(0, PAGE_SIZE).map((o) => {
      const a = o.shippingAddress ?? {};
      return {
        _id: String(o._id),
        orderNumber: o.orderNumber,
        status: o.status ?? "pending",
        payment: o.paymentMethod ?? "",
        paymentStatus: o.paymentStatus ?? "",
        createdAt: o.createdAt,
        subtotal: o.subtotal ?? 0,
        shipping: o.shippingFee ?? 0,
        tax: o.taxAmount ?? 0,
        total: o.total ?? 0,
        address: {
          name: a.name ?? "",
          line: [a.line1, a.line2].filter(Boolean).join(", "),
          city: [a.city, a.state, a.postalCode].filter(Boolean).join(", "),
          country: a.country ?? "",
        },
        items: (o.items ?? []).map((i) => ({
          id: i.product ? String(i.product) : "",
          name: i.nameSnapshot ?? "",
          image: i.imageSnapshot ?? "",
          note: i.variantLabel ?? "",
          price: i.unitPrice ?? 0,
          qty: i.quantity ?? 1,
        })),
      };
    });

    return NextResponse.json({ orders, hasMore });
  } catch (e) {
    console.error("GET /api/orders/my failed:", e);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}