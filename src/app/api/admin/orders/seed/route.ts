import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectDB from "@/lib/mongodb";
import Order from "@/app/models/Order";

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const CUSTOMERS = [
  { name: "Carl Evans", email: "carlevans241@example.com", phone: "+1 987 471 6589", line1: "3103 Trainer Avenue", city: "Peoria", state: "IL", postalCode: "61602" },
  { name: "Minerva Rameriz", email: "minerva@example.com", phone: "+1 202 555 0143", line1: "1125 Cedar Street", city: "Austin", state: "TX", postalCode: "73301" },
  { name: "Robert Lamon", email: "robert.lamon@example.com", phone: "+1 415 555 0192", line1: "88 Market Road", city: "San Jose", state: "CA", postalCode: "95112" },
  { name: "Patricia Lewis", email: "patricia.lewis@example.com", phone: "+1 305 555 0117", line1: "420 Ocean Drive", city: "Miami", state: "FL", postalCode: "33139" },
  { name: "Mark Joslyn", email: "mark.joslyn@example.com", phone: "+1 646 555 0168", line1: "17 Hudson Street", city: "New York", state: "NY", postalCode: "10013" },
];

const PRODUCTS = [
  { name: "Nike Jordan", sku: "NJ-001", price: 120 },
  { name: "Apple Series 5 Watch", sku: "AW-005", price: 250 },
  { name: "Lobar Handy", sku: "LH-010", price: 80 },
  { name: "Wireless Headphones", sku: "WH-020", price: 95 },
  { name: "Leather Wallet", sku: "LW-030", price: 40 },
  { name: "Running Shoes", sku: "RS-040", price: 110 },
];

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
const PAYMENTS = ["unpaid", "paid", "refunded"] as const;

// POST /api/admin/orders/seed?count=5   (dev only)
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Production mein band hai" }, { status: 403 });
  }
  await connectDB();

  const count = Math.min(Math.max(Number(req.nextUrl.searchParams.get("count") || 1), 1), 50);
  const created: string[] = [];

  for (let n = 0; n < count; n++) {
    const c = pick(CUSTOMERS);

    const chosen = [...PRODUCTS].sort(() => Math.random() - 0.5).slice(0, rand(1, 3));
    const items = chosen.map((p) => {
      const quantity = rand(1, 3);
      return {
        product: new Types.ObjectId(),
        nameSnapshot: p.name,
        skuSnapshot: p.sku,
        imageSnapshot: "",
        variations: [],
        variantLabel: "",
        variantKey: "",
        unitPrice: p.price,
        quantity,
        lineTotal: p.price * quantity,
        allocations: [],
      };
    });

    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const shippingFee = pick([0, 5, 10, 15]);
    const status = pick([...STATUSES]);
    const paymentStatus = pick([...PAYMENTS]);

    const createdAt = new Date(Date.now() - rand(0, 60) * 24 * 60 * 60 * 1000);

    const order = await Order.create({
      orderNumber: `SL${String(Date.now()).slice(-6)}${rand(10, 99)}`,
      customer: null,
      customerSnapshot: { name: c.name, email: c.email, phone: c.phone },
      shippingAddress: {
        name: c.name,
        phone: c.phone,
        line1: c.line1,
        line2: "",
        city: c.city,
        state: c.state,
        postalCode: c.postalCode,
        country: "USA",
      },
      items,
      subtotal,
      shippingFee,
      total: subtotal + shippingFee,
      status,
      paymentMethod: "cod",
      paymentStatus,
      statusHistory: [{ status, note: "Dummy order", changedBy: null, changedAt: createdAt }],
      createdAt,
      updatedAt: createdAt,
    });

    created.push(order.orderNumber);
  }

  return NextResponse.json({ ok: true, count: created.length, references: created });
}