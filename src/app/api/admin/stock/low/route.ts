import mongoose, { type PipelineStage } from "mongoose";
import { NextResponse } from "next/server";
import Product from "@/app/models/Product";
import ProductVariation from "@/app/models/ProductVariation";
import Warehouse from "@/app/models/Warehouse";
import StockLevel from "@/app/models/StockLevel";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { variantLabel } from "@/lib/stock";

// Itne ya us se kam available stock ko "low" maana jata hai (yahan se badal sakte hain)
const LOW_STOCK_THRESHOLD = 5;

type Row = {
  _id: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  variations?: mongoose.Types.ObjectId[];
  warehouse: mongoose.Types.ObjectId;
  onHand: number;
  reserved: number;
  available: number;
  productName: string;
  warehouseName: string;
  variationDocs?: { _id: mongoose.Types.ObjectId; name: string }[];
};

// GET /api/admin/stock/low?limit=20
export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const params = new URL(request.url).searchParams;
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(params.get("limit") ?? "20", 10) || 20)
    );

    const base: PipelineStage[] = [
      { $addFields: { available: { $subtract: ["$onHand", "$reserved"] } } },
      { $match: { available: { $lte: LOW_STOCK_THRESHOLD } } },
    ];

    const [countRow] = await StockLevel.aggregate<{ total: number }>([
      ...base,
      { $count: "total" },
    ]);
    const total = countRow?.total ?? 0;

    const rows = await StockLevel.aggregate<Row>([
      ...base,
      { $sort: { available: 1, _id: 1 } },
      { $limit: limit },
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
          warehouseName: { $ifNull: ["$warehouseDoc.name", "(deleted)"] },
        },
      },
      { $project: { productDoc: 0, warehouseDoc: 0 } },
    ]);

    const items = rows.map((row) => ({
      _id: row._id.toString(),
      productId: row.product.toString(),
      productName: row.productName,
      variantLabel: variantLabel(row.variations, row.variationDocs),
      warehouseId: row.warehouse.toString(),
      warehouseName: row.warehouseName,
      onHand: row.onHand,
      reserved: row.reserved,
      available: row.available,
      status: row.available <= 0 ? "out" : "low",
    }));

    return NextResponse.json({
      threshold: LOW_STOCK_THRESHOLD,
      total,
      count: total,
      items,
    });
  } catch (error) {
    console.error("Low stock failed:", error);
    return NextResponse.json({ error: "Failed to load low stock" }, { status: 500 });
  }
}