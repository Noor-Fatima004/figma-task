import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import connectDB from "@/lib/mongodb";
import Order from "@/app/models/Order";
import Product from "@/app/models/Product";
import ProductVariation from "@/app/models/ProductVariation";
import {
  reserveStock,
  StockError,
  validateVariantSelection,
  variantLabel,
  buildVariantKey,
  productDisplayName,
} from "@/lib/stock";
import { adjustSold } from "@/lib/sales";
import { requireUser } from "@/lib/requireUser";

/* ────────────────────────── constants ────────────────────────── */

// Apne cartStore se match karo. Agar different hain to yahan update karo.
const FREE_SHIPPING_THRESHOLD = 5000;
const SHIPPING_FLAT = 250;
const TAX_RATE = 0.05;

const round2 = (n: number) => Math.round(n * 100) / 100;

const OBJECT_ID_RX = /^[a-f\d]{24}$/i;

/* ────────────────────────── validation ────────────────────────── */

const Body = z.object({
  contact: z.object({
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(7).max(40),
  }),
  shipping: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    address: z.string().trim().min(1).max(200),
    apartment: z.string().trim().max(200).optional().default(""),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    postalCode: z.string().trim().min(1).max(30),
    country: z.string().trim().min(1).max(100),
  }),
  notes: z.string().trim().max(500).optional().default(""),
  payment: z.enum(["cod", "card"]),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        qty: z.number().int().min(1).max(999),
        variations: z.array(z.string()).optional().default([]),
      })
    )
    .min(1),
});

/* ────────────────────────── helpers ────────────────────────── */

async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;
  for (let i = 0; i < 6; i++) {
    const candidate = `NLT-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
    const exists = await Order.exists({ orderNumber: candidate });
    if (!exists) return candidate;
  }
  return `NLT-${ymd}-${Date.now().toString().slice(-6)}`;
}

/* ────────────────────────── POST ────────────────────────── */

export async function POST(req: NextRequest) {
  // 1. Auth
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to place an order." }, { status: 401 });
  }

  // 2. Body
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid order data" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  await connectDB();

  // 3. Products lookup — ObjectId, slug, ya SKU se
  const rawIds = [...new Set(body.items.map((i) => i.id))];
  const asObjectIds = rawIds.filter((id) => OBJECT_ID_RX.test(id));
  const asKeys = rawIds.filter((id) => !OBJECT_ID_RX.test(id));

  const or: Record<string, unknown>[] = [];
  if (asObjectIds.length) or.push({ _id: { $in: asObjectIds } });
  if (asKeys.length) {
    or.push({ slug: { $in: asKeys } });
    or.push({ sku: { $in: asKeys } });
  }

  const products = or.length
    ? await Product.find({ isActive: true, $or: or }).lean()
    : [];

  // id (string), slug, sku — teeno se map karo
  const productByKey = new Map<string, (typeof products)[number]>();
  for (const p of products) {
    productByKey.set(String(p._id), p);
    if (p.slug) productByKey.set(String(p.slug), p);
    if (p.sku) productByKey.set(String(p.sku), p);
  }

  for (const line of body.items) {
    if (!productByKey.has(line.id)) {
      return NextResponse.json(
        { error: `Product not available: ${line.id}` },
        { status: 400 }
      );
    }
  }

  // 4. Build draft items with snapshots + server-side prices
  type DraftItem = {
    product: mongoose.Types.ObjectId;
    nameSnapshot: string;
    skuSnapshot: string;
    imageSnapshot: string;
    variations: mongoose.Types.ObjectId[];
    variantKey: string;
    variantLabel: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  };

  const draftItems: DraftItem[] = [];

  for (const line of body.items) {
    const p = productByKey.get(line.id)!;

    const orderedVariations = validateVariantSelection(
      {
        productType: p.productType,
        attributes: (p.attributes ?? []) as never,
      },
      line.variations ?? []
    );
    if (orderedVariations === null) {
      return NextResponse.json(
        { error: `Invalid variation selection for ${productDisplayName(p)}` },
        { status: 400 }
      );
    }

    let unitPrice =
      typeof p.discountPrice === "number" && p.discountPrice > 0
        ? p.discountPrice
        : p.price;

    let variantLabelStr = "";

    if (orderedVariations.length > 0) {
      const varDocs = await ProductVariation.find({
        _id: { $in: orderedVariations },
      })
        .select("_id name price")
        .lean();

      if (varDocs.length !== orderedVariations.length) {
        return NextResponse.json(
          { error: `Invalid variation for ${productDisplayName(p)}` },
          { status: 400 }
        );
      }

      const variationPrice = (varDocs as { price?: number }[]).find(
        (v) => typeof v.price === "number" && v.price > 0
      )?.price;
      if (typeof variationPrice === "number" && variationPrice > 0) {
        unitPrice = variationPrice;
      }

      variantLabelStr = variantLabel(
        orderedVariations.map((id) => new mongoose.Types.ObjectId(id)),
        varDocs as { _id: mongoose.Types.ObjectId; name: string }[]
      );
    }

    const qty = line.qty;
    const lineTotal = round2(unitPrice * qty);

    draftItems.push({
      product: p._id as mongoose.Types.ObjectId,
      nameSnapshot: productDisplayName(p),
      skuSnapshot: (p.sku as string | undefined) ?? "",
      imageSnapshot: (p.media as string[] | undefined)?.[0] ?? "",
      variations: orderedVariations.map(
        (id) => new mongoose.Types.ObjectId(id)
      ),
      variantKey: buildVariantKey(orderedVariations),
      variantLabel: variantLabelStr,
      unitPrice,
      quantity: qty,
      lineTotal,
    });
  }

  // 5. Server-side totals
  const subtotal = round2(draftItems.reduce((s, i) => s + i.lineTotal, 0));
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  const taxAmount = round2(subtotal * TAX_RATE);
  const total = round2(subtotal + shippingFee + taxAmount);

  // 6. Transaction: reserve stock → create order → update sold count
  const session = await mongoose.startSession();
  let createdOrderNumber: string | null = null;
  let createdOrderId: string | null = null;

  try {
    await session.withTransaction(async () => {
      // 6a. Reserve stock for each line
      const itemsWithAllocations = [];
      for (const item of draftItems) {
        const { allocations } = await reserveStock(
          {
            product: item.product.toString(),
            variantKey: item.variantKey,
            quantity: item.quantity,
            label: item.variantLabel
              ? `${item.nameSnapshot} (${item.variantLabel})`
              : item.nameSnapshot,
          },
          session
        );
        itemsWithAllocations.push({ ...item, allocations });
      }

      // 6b. Create order
      const orderNumber = await generateOrderNumber();
      const fullName = `${body.shipping.firstName} ${body.shipping.lastName}`.trim();

      const [doc] = await Order.create(
        [
          {
            orderNumber,
            customer: new mongoose.Types.ObjectId(user.userId),
            customerSnapshot: {
              name: fullName,
              email: body.contact.email.toLowerCase(),
              phone: body.contact.phone,
            },
            shippingAddress: {
              name: fullName,
              phone: body.contact.phone,
              line1: body.shipping.address,
              line2: body.shipping.apartment ?? "",
              city: body.shipping.city,
              state: body.shipping.state,
              postalCode: body.shipping.postalCode,
              country: body.shipping.country,
            },
            items: itemsWithAllocations,
            subtotal,
            shippingFee,
            taxRate: TAX_RATE,
            taxAmount,
            total,
            status: "pending",
            paymentMethod: body.payment,
            paymentStatus: "unpaid",
            statusHistory: [
              {
                status: "pending",
                note: body.notes || "Order placed by customer",
                changedBy: null,
                changedAt: new Date(),
              },
            ],
          },
        ],
        { session }
      );

      // 6c. Update sold counts
      await adjustSold(
        draftItems.map((i) => ({ product: i.product, quantity: i.quantity })),
        1,
        session
      );

      createdOrderNumber = doc.orderNumber;
      createdOrderId = String(doc._id);
    });
  } catch (err) {
    if (err instanceof StockError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Order create failed:", err);
    return NextResponse.json(
      { error: "Failed to place order. Please try again." },
      { status: 500 }
    );
  } finally {
    await session.endSession();
  }

  return NextResponse.json(
    { orderNumber: createdOrderNumber, orderId: createdOrderId },
    { status: 201 }
  );
}