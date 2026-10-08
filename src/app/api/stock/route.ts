import mongoose, { type PipelineStage } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import Product from "@/app/models/Product";
import ProductVariation from "@/app/models/ProductVariation";
import Warehouse from "@/app/models/Warehouse";
import StockLevel from "@/app/models/StockLevel";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import {
  applyStockChange,
  buildVariantKey,
  escapeRegex,
  getStockDeleteBlockers,
  isObjectId,
  productDisplayName,
  readUserId,
  StockError,
  stockReasons,
  validateVariantSelection,
  variantLabel,
} from "@/lib/stock";

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

type RawRow = {
  _id: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  variantKey: string;
  variations?: mongoose.Types.ObjectId[];
  warehouse: mongoose.Types.ObjectId;
  onHand: number;
  reserved: number;
  reorderLevel: number;
  binLocation: string;
  available: number;
  status: "in" | "low" | "out";
  productName: string;
  sku: string;
  warehouseName: string;
  warehouseCode: string;
  variationDocs?: { _id: mongoose.Types.ObjectId; name: string }[];
  updatedAt?: Date;
};

type Meta = {
  total: number;
  totalOnHand: number;
  totalAvailable: number;
  low: number;
  out: number;
};

/* ───────────────────────── GET: stock list ───────────────────────── */

export async function GET(request: Request) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);

  try {
    await connectDB();
    const params = new URL(request.url).searchParams;
    const q = escapeRegex((params.get("q") ?? "").trim());
    const warehouse = params.get("warehouse") ?? "";
    const status = params.get("status") ?? "";
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(params.get("limit") ?? "10", 10) || 10)
    );
    let page = Math.max(
      1,
      Number.parseInt(params.get("page") ?? "1", 10) || 1
    );

    const base: PipelineStage[] = [];
    if (isObjectId(warehouse)) {
      base.push({
        $match: { warehouse: new mongoose.Types.ObjectId(warehouse) },
      });
    }
    base.push(
      {
        $lookup: {
          from: Product.collection.name,
          localField: "product",
          foreignField: "_id",
          as: "productDoc",
        },
      },
      { $unwind: { path: "$productDoc", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: Warehouse.collection.name,
          localField: "warehouse",
          foreignField: "_id",
          as: "warehouseDoc",
        },
      },
      { $unwind: { path: "$warehouseDoc", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: ProductVariation.collection.name,
          localField: "variations",
          foreignField: "_id",
          as: "variationDocs",
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      {
        $addFields: {
          productName: {
            $ifNull: [
              "$productDoc.translations.en.name",
              { $ifNull: ["$productDoc.slug", "(deleted product)"] },
            ],
          },
          sku: { $ifNull: ["$productDoc.sku", ""] },
          warehouseName: { $ifNull: ["$warehouseDoc.name", "(deleted)"] },
          warehouseCode: { $ifNull: ["$warehouseDoc.code", ""] },
          available: { $subtract: ["$onHand", "$reserved"] },
        },
      },
      {
        $addFields: {
          status: {
            $switch: {
              branches: [
                { case: { $lte: ["$available", 0] }, then: "out" },
                { case: { $lte: ["$available", "$reorderLevel"] }, then: "low" },
              ],
              default: "in",
            },
          },
        },
      }
    );

    const conditions: Record<string, unknown>[] = [];
    if (q) {
      const expression = new RegExp(q, "i");
      conditions.push({
        $or: [
          { productName: expression },
          { sku: expression },
          { warehouseName: expression },
          { "variationDocs.name": expression },
        ],
      });
    }
    if (status === "in" || status === "low" || status === "out") {
      conditions.push({ status });
    }
    if (conditions.length > 0) base.push({ $match: { $and: conditions } });

    const [meta] = await StockLevel.aggregate<Meta>([
      ...base,
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalOnHand: { $sum: "$onHand" },
          totalAvailable: { $sum: "$available" },
          low: { $sum: { $cond: [{ $eq: ["$status", "low"] }, 1, 0] } },
          out: { $sum: { $cond: [{ $eq: ["$status", "out"] }, 1, 0] } },
        },
      },
    ]);
    const total = meta?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    page = Math.min(page, totalPages);

    const rows = await StockLevel.aggregate<RawRow>([
      ...base,
      { $sort: { productName: 1, _id: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $project: { productDoc: 0, warehouseDoc: 0 } },
    ]);
    const deleteBlockers = await getStockDeleteBlockers(rows);

    const items = rows.map((row) => ({
      _id: row._id.toString(),
      productId: row.product.toString(),
      productName: row.productName,
      sku: row.sku,
      variantLabel: variantLabel(row.variations, row.variationDocs),
      warehouseId: row.warehouse.toString(),
      warehouseName: row.warehouseName,
      warehouseCode: row.warehouseCode,
      onHand: row.onHand,
      reserved: row.reserved,
      available: row.available,
      reorderLevel: row.reorderLevel,
      binLocation: row.binLocation ?? "",
      status: row.status,
      updatedAt: row.updatedAt ?? null,
      canDelete: !deleteBlockers.has(row._id.toString()),
      deleteBlockedReason:
        deleteBlockers.get(row._id.toString())?.join("; ") ?? "",
    }));

    return NextResponse.json({
      items,
      total,
      page,
      totalPages,
      summary: {
        lines: total,
        totalOnHand: meta?.totalOnHand ?? 0,
        totalAvailable: meta?.totalAvailable ?? 0,
        low: meta?.low ?? 0,
        out: meta?.out ?? 0,
      },
    });
  } catch (error) {
    console.error("List stock failed:", error);
    return errorResponse("Failed to load stock", 500);
  }
}

/* ───────────────────────── POST: add / remove / count ───────────────────────── */

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

const bodySchema = z
  .object({
    warehouse: objectId,
    mode: z.enum(["in", "out", "set"]),
    reason: z.enum(stockReasons),
    reference: z.string().trim().max(100).default(""),
    note: z.string().trim().max(500).default(""),
    items: z
      .array(
        z.object({
          product: objectId,
          variations: z.array(objectId).max(20).default([]),
          quantity: z.number().min(0).max(1_000_000_000),
        })
      )
      .min(1, "Add at least one item")
      .max(100, "Too many items in one request"),
  })
  .refine(
    (data) =>
      data.mode === "set" || data.items.every((item) => item.quantity > 0),
    { message: "Quantity must be greater than zero", path: ["items"] }
  )
  .refine((data) => data.reason !== "reversal", {
    message: "Reversal reason is reserved for reversing a movement",
    path: ["reason"],
  });

export async function POST(request: Request) {
  const admin: unknown = await requireAdmin();
  if (!admin) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      parsed.error.issues[0]?.message ?? "Invalid stock data",
      400
    );
  }
  const data = parsed.data;

  try {
    await connectDB();

    const warehouse = await Warehouse.findById(data.warehouse)
      .select("name isActive allowNegativeStock")
      .lean();
    if (!warehouse) return errorResponse("Warehouse not found", 404);
    if (!warehouse.isActive) {
      return errorResponse("This warehouse is inactive", 400);
    }

    const productIds = [...new Set(data.items.map((item) => item.product))];
    const products = await Product.find({ _id: { $in: productIds } })
      .select("productType attributes translations slug")
      .lean();
    const byId = new Map(
      products.map((product) => [product._id.toString(), product])
    );

    // Resolve variant labels for friendly error messages.
    const allVariationIds = [
      ...new Set(data.items.flatMap((item) => item.variations)),
    ];
    const variationDocs = allVariationIds.length
      ? await ProductVariation.find({ _id: { $in: allVariationIds } })
          .select("name")
          .lean()
      : [];
    const variationNames = new Map(
      variationDocs.map((doc) => [doc._id.toString(), doc.name as string])
    );

    const seen = new Set<string>();
    const lines: {
      product: string;
      variations: string[];
      quantity: number;
      label: string;
    }[] = [];
    for (const item of data.items) {
      const product = byId.get(item.product);
      if (!product) {
        return errorResponse("One of the selected products was not found", 404);
      }
      const name = productDisplayName(product);
      const variations = validateVariantSelection(product, item.variations);
      if (!variations) {
        return errorResponse(`Select a valid variant for "${name}"`, 400);
      }
      const variant = variations
        .map((id) => variationNames.get(id) ?? "?")
        .join(" / ");
      const label = variant ? `${name} (${variant})` : name;
      const key = `${item.product}:${buildVariantKey(variations)}`;
      if (seen.has(key)) {
        return errorResponse(`${label} is listed more than once`, 400);
      }
      seen.add(key);
      lines.push({
        product: item.product,
        variations,
        quantity: item.quantity,
        label,
      });
    }

    const userId = readUserId(admin);
    const results: { product: string; onHand: number; delta: number }[] = [];
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        results.length = 0; // withTransaction may retry the callback
        for (const line of lines) {
          const result = await applyStockChange(
            {
              product: line.product,
              variations: line.variations,
              warehouse: data.warehouse,
              mode: data.mode,
              quantity: line.quantity,
              reason: data.reason,
              reference: data.reference,
              note: data.note,
              allowNegative: Boolean(warehouse.allowNegativeStock),
              userId,
              label: line.label,
            },
            session
          );
          results.push({ product: line.product, ...result });
        }
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json(
      { updated: results.length, items: results },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof StockError) {
      return errorResponse(error.message, error.status);
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return errorResponse(
        "Stock was changed by someone else at the same time. Please try again.",
        409
      );
    }
    console.error("Update stock failed:", error);
    return errorResponse("Failed to update stock", 500);
  }
}

/* ───────────────────────── PATCH: stock row settings ───────────────────────── */

const patchSchema = z.object({
  id: objectId,
  reorderLevel: z.number().min(0).max(1_000_000_000).optional(),
  binLocation: z.string().trim().max(50).optional(),
}).refine(
  (data) => data.reorderLevel !== undefined || data.binLocation !== undefined,
  { message: "Provide a reorder level or bin location to update" }
);

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      parsed.error.issues[0]?.message ?? "Invalid data",
      400
    );
  }

  try {
    await connectDB();
    const updates: { reorderLevel?: number; binLocation?: string } = {};
    if (parsed.data.reorderLevel !== undefined) {
      updates.reorderLevel = parsed.data.reorderLevel;
    }
    if (parsed.data.binLocation !== undefined) {
      updates.binLocation = parsed.data.binLocation;
    }
    const level = await StockLevel.findByIdAndUpdate(
      parsed.data.id,
      { $set: updates },
      { new: true }
    ).lean();
    if (!level) return errorResponse("Stock record not found", 404);
    return NextResponse.json({
      reorderLevel: level.reorderLevel,
      binLocation: level.binLocation ?? "",
    });
  } catch (error) {
    console.error("Update stock settings failed:", error);
    return errorResponse("Failed to update stock settings", 500);
  }
}

const deleteSchema = z.object({ id: objectId });

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid stock id", 400);
  }

  try {
    await connectDB();
    const level = await StockLevel.findById(parsed.data.id)
      .select("_id onHand reserved product variantKey warehouse")
      .lean();
    if (!level) return errorResponse("Stock record not found", 404);

    const blockers = await getStockDeleteBlockers([level]);
    const reasons = blockers.get(level._id.toString());
    if (reasons?.length) return errorResponse(reasons.join("; "), 409);

    const result = await StockLevel.deleteOne({
      _id: level._id,
      onHand: 0,
      reserved: 0,
    });
    if (result.deletedCount === 0) {
      return errorResponse("Stock changed before it could be deleted", 409);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete stock record failed:", error);
    return errorResponse("Failed to delete stock record", 500);
  }
}
