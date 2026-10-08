import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import Order from "@/app/models/Order";
import Product from "@/app/models/Product";
import ProductVariation from "@/app/models/ProductVariation";
import Warehouse from "@/app/models/Warehouse";
import connectDB from "@/lib/mongodb";
import { getAuthenticatedCustomer, resolveMediaUrlLists } from "@/lib/storefront";
import {
  buildVariantKey,
  productDisplayName,
  reserveStock,
  StockError,
  validateVariantSelection,
} from "@/lib/stock";

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid product id");
const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
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
    }).lean();
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
      const selected = validateVariantSelection(product, item.variationIds);
      if (!selected) {
        return errorResponse(
          `Select a valid variation for "${productDisplayName(product)}".`,
          400
        );
      }
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

    const customer = {
      name: user?.name ?? parsed.data.customer.name,
      email: (user?.email ?? parsed.data.customer.email).trim().toLowerCase(),
      phone: parsed.data.customer.phone,
    };
    const shippingAddress = {
      ...parsed.data.address,
      phone: parsed.data.address.phone || customer.phone,
    };
    const subtotal = money(
      lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
    );
    const shippingFee = 0;
    const total = money(subtotal + shippingFee);
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
        await Order.create(
          [
            {
              orderNumber: createdOrderNumber,
              customer: user?._id ?? null,
              customerSnapshot: customer,
              shippingAddress,
              items: orderItems,
              subtotal,
              shippingFee,
              total,
              status: "pending",
              paymentMethod: "cod",
              paymentStatus: "unpaid",
              statusHistory: [{ status: "pending", note: "Order placed" }],
            },
          ],
          { session }
        );
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
