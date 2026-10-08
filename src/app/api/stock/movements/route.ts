import mongoose, { type PipelineStage } from "mongoose";
import { NextResponse } from "next/server";
import Product from "@/app/models/Product";
import ProductVariation from "@/app/models/ProductVariation";
import User from "@/app/models/User";
import Warehouse from "@/app/models/Warehouse";
import StockMovement from "@/app/models/StockMovement";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { escapeRegex, isObjectId, variantLabel } from "@/lib/stock";

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

type RawMovement = {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  type: "in" | "out" | "adjustment";
  quantity: number;
  balanceAfter: number;
  reversalOf?: mongoose.Types.ObjectId;
  reason: string;
  reference: string;
  note: string;
  variations?: mongoose.Types.ObjectId[];
  variationDocs?: { _id: mongoose.Types.ObjectId; name: string }[];
  productName: string;
  sku: string;
  warehouseName: string;
  warehouseCode: string;
  createdByName: string;
};

function parseDate(value: string | null, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);

  try {
    await connectDB();
    const params = new URL(request.url).searchParams;
    const q = escapeRegex((params.get("q") ?? "").trim());
    const warehouse = params.get("warehouse") ?? "";
    const type = params.get("type") ?? "";
    const from = parseDate(params.get("from"));
    const to = parseDate(params.get("to"), true);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(params.get("limit") ?? "10", 10) || 10)
    );
    let page = Math.max(
      1,
      Number.parseInt(params.get("page") ?? "1", 10) || 1
    );

    const match: Record<string, unknown> = {};
    if (isObjectId(warehouse)) {
      match.warehouse = new mongoose.Types.ObjectId(warehouse);
    }
    if (type === "in" || type === "out" || type === "adjustment") {
      match.type = type;
    }
    if (from || to) {
      match.createdAt = {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      };
    }

    const base: PipelineStage[] = [
      { $match: match },
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
        $lookup: {
          from: User.collection.name,
          localField: "createdBy",
          foreignField: "_id",
          as: "userDoc",
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      { $unwind: { path: "$userDoc", preserveNullAndEmptyArrays: true } },
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
          createdByName: { $ifNull: ["$userDoc.name", ""] },
        },
      },
    ];

    if (q) {
      const expression = new RegExp(q, "i");
      base.push({
        $match: {
          $or: [
            { productName: expression },
            { sku: expression },
            { reference: expression },
            { "variationDocs.name": expression },
          ],
        },
      });
    }

    const [countRow] = await StockMovement.aggregate<{ total: number }>([
      ...base,
      { $count: "total" },
    ]);
    const total = countRow?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    page = Math.min(page, totalPages);

    const rows = await StockMovement.aggregate<RawMovement>([
      ...base,
      { $sort: { createdAt: -1, _id: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);
    const reversedMovements = rows.length
      ? await StockMovement.find({
          reversalOf: { $in: rows.map((row) => row._id) },
        })
          .select("reversalOf")
          .lean()
      : [];
    const reversedIds = new Set(
      reversedMovements.map((movement) => movement.reversalOf?.toString())
    );

    const items = rows.map((row) => ({
      _id: row._id.toString(),
      createdAt: row.createdAt,
      type: row.type,
      quantity: row.quantity,
      balanceAfter: row.balanceAfter,
      reversalOf: row.reversalOf?.toString() ?? null,
      isReversed: reversedIds.has(row._id.toString()),
      reason: row.reason,
      reference: row.reference,
      note: row.note,
      productName: row.productName,
      sku: row.sku,
      variantLabel: variantLabel(row.variations, row.variationDocs),
      warehouseName: row.warehouseName,
      warehouseCode: row.warehouseCode,
      createdByName: row.createdByName,
    }));

    return NextResponse.json({ items, total, page, totalPages });
  } catch (error) {
    console.error("List stock movements failed:", error);
    return errorResponse("Failed to load stock movements", 500);
  }
}
