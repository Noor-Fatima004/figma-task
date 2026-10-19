import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import Order from "@/app/models/Order";
import { createInvoiceForOrder } from "@/lib/invoices";
import Product from "@/app/models/Product";
import ProductVariation from "@/app/models/ProductVariation";
import Warehouse from "@/app/models/Warehouse";
import connectDB from "@/lib/mongodb";
import { getAuthenticatedCustomer, resolveMediaUrlLists } from "@/lib/storefront";
import { computeTotals, TAX_RATE } from "@/lib/tax";
import {
  buildVariantKey,
  productDisplayName,
  reserveStock,
  StockError,
  validateVariantSelectionDetailed,
} from "@/lib/stock";

const errorResponse = (
  error: string,
  status: number,
  extra: Record<string, unknown> = {}
) => NextResponse.json({ error, ...extra }, { status });

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid product id");

// name/email optional: logged-in user ke liye server apne user se leta hai
const contactSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(254).optional(),
  phone: z.string().trim().min(3).max(40),
});

const addressSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(3).max(40),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).default(""),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(30),
  country: z.string().trim().min(1).max(100),
});

// Card optional: poora number / CVC kabhi nahi, sirf safe fields
const paymentSchema = z
  .object({
    method: z.enum(["cod", "card"]).default("cod"),
    cardHolder: z.string().trim().max(120).optional(),
    cardBrand: z.string().trim().max(30).optional(),
    cardLast4: z
      .string()
      .regex(/^\d{4}$/)
      .optional(),
  })
  .default({ method: "cod" });

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: objectId,
        variationIds: z.array(objectId).max(20).default([]),
        quantity: z.number().int().min(1).max(1_000_000),
      })
    )
    .min(1)
    .max(50),
  customer: contactSchema,
  address: addressSchema,
  payment: paymentSchema,
});

type CheckoutLine = {
  productId: string;
  variationIds: string[];
  variantKey: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  name: string;
  sku: string;
  image: string;
};

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function orderNumber() {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${randomBytes(5)
    .toString("hex")
    .toUpperCase()}`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      parsed.error.issues[0]?.message ?? "Invalid checkout details",
      400
    );
  }

  try {
    await connectDB();
    const user = await getAuthenticatedCustomer();
    const items = parsed.data.items.map((item) => ({
      ...item,
      productId: item.productId.toLowerCase(),
      variationIds: item.variationIds.map((id) => id.toLowerCase()),
    }));
    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true,
    })
      .populate("attributes.attribute", "name")
      .lean();
    const productsById = new Map(
      products.map((product) => [product._id.toString(), product])
    );
    const allVariationIds = [
      ...new Set(items.flatMap((item) => item.variationIds)),
    ];
    const variationDocs = allVariationIds.length
      ? await ProductVariation.find({ _id: { $in: allVariationIds } })
          .select("name")
          .lean()
      : [];
    const variationNames = new Map(
      variationDocs.map((variation) => [
        variation._id.toString(),
        variation.name,
      ])
    );
    const seen = new Set<string>();
    const lines: CheckoutLine[] = [];

    for (const item of items) {
      const product = productsById.get(item.productId);
      if (!product) {
        return errorResponse("A selected product is unavailable", 409);
      }
      if (
        item.quantity < product.minOrder ||
        item.quantity > product.maxOrder
      ) {
        return errorResponse(
          `"${productDisplayName(product)}" quantity must be between ${product.minOrder} and ${product.maxOrder}.`,
          400
        );
      }
      const validation = validateVariantSelectionDetailed(
        product,
        item.variationIds,
        undefined,
        productDisplayName(product)
      );
      if (!validation.valid) {
        return errorResponse(validation.error, 400, {
          productId: item.productId,
        });
      }
      const selected = validation.variations;
      const variantKey = buildVariantKey(selected);
      const duplicateKey = `${item.productId}:${variantKey}`;
      if (seen.has(duplicateKey)) {
        return errorResponse(
          `"${productDisplayName(product)}" is listed more than once.`,
          400
        );
      }
      seen.add(duplicateKey);
      const variantLabel = selected
        .map((id) => variationNames.get(id) ?? "")
        .filter(Boolean)
        .join(" / ");
      const discountPrice = product.discountPrice;
      const unitPrice =
        discountPrice !== null &&
        discountPrice !== undefined &&
        discountPrice >= 0 &&
        discountPrice < product.price
          ? discountPrice
          : product.price;
      lines.push({
        productId: item.productId,
        variationIds: selected,
        variantKey,
        variantLabel,
        quantity: item.quantity,
        unitPrice,
        name: productDisplayName(product),
        sku: product.sku ?? "",
        image: "",
      });
    }

    const uniqueProducts = [...productsById.values()];
    const resolvedImages = await resolveMediaUrlLists(
      uniqueProducts.map((product) => product.media ?? [])
    );
    const imageByProduct = new Map(
      uniqueProducts.map((product, index) => [
        product._id.toString(),
        resolvedImages[index]?.[0] ?? "",
      ])
    );
    for (const line of lines) {
      line.image = imageByProduct.get(line.productId) ?? "";
    }

    // Login user ko priority, guest ke liye form ki values
    const name = user?.name ?? parsed.data.customer.name;
    const email = (user?.email ?? parsed.data.customer.email)
      ?.trim()
      .toLowerCase();
    if (!name || !email) {
      return errorResponse("Name and email are required", 400);
    }
    const customer = { name, email, phone: parsed.data.customer.phone };

    const shippingAddress = {
      ...parsed.data.address,
      phone: parsed.data.address.phone || customer.phone,
    };

    // Totals hamesha server par calculate hote hain
    const rawSubtotal = lines.reduce(
      (sum, line) => sum + line.unitPrice * line.quantity,
      0
    );
    const { subtotal, shippingFee, taxAmount, total } =
      computeTotals(rawSubtotal);

    const session = await mongoose.startSession();
    let createdOrderNumber = "";
    try {
      await session.withTransaction(async () => {
        const activeWarehouses = await Warehouse.find({ isActive: true })
          .select("_id isDefault")
          .session(session)
          .lean();
        const orderItems = [];
        for (const line of lines) {
          const reservation = await reserveStock(
            {
              product: line.productId,
              variantKey: line.variantKey,
              quantity: line.quantity,
              label: line.variantLabel
                ? `${line.name} (${line.variantLabel})`
                : line.name,
            },
            session,
            activeWarehouses
          );
          orderItems.push({
            product: new mongoose.Types.ObjectId(line.productId),
            nameSnapshot: line.name,
            skuSnapshot: line.sku,
            imageSnapshot: line.image,
            variations: line.variationIds.map(
              (id) => new mongoose.Types.ObjectId(id)
            ),
            variantLabel: line.variantLabel,
            variantKey: line.variantKey,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
            lineTotal: money(line.unitPrice * line.quantity),
            allocations: reservation.allocations,
          });
        }
        createdOrderNumber = orderNumber();
        const [createdOrder] = await Order.create(
          [
            {
              orderNumber: createdOrderNumber,
              customer: user?._id ?? null,
              customerSnapshot: customer,
              shippingAddress,
              items: orderItems,
              subtotal,
              shippingFee,
              taxRate: TAX_RATE,
              taxAmount,
              total,
              status: "pending",
              paymentMethod: parsed.data.payment.method,
              paymentStatus: "unpaid",
              paymentDetails: {
                cardHolder: parsed.data.payment.cardHolder ?? "",
                cardBrand: parsed.data.payment.cardBrand ?? "",
                cardLast4: parsed.data.payment.cardLast4 ?? "",
              },
              statusHistory: [{ status: "pending", note: "Order placed" }],
            },
          ],
          { session }
        );
        await createInvoiceForOrder(createdOrder, { session });
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json(
      { orderNumber: createdOrderNumber },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof StockError) {
      return errorResponse(error.message, error.status);
    }
    console.error("Create storefront order failed:", error);
    return errorResponse("Failed to place order", 500);
  }
}