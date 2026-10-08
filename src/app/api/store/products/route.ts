import mongoose, { type PipelineStage } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import Product from "@/app/models/Product";
import ProductBrand from "@/app/models/ProductBrand";
import ProductCategory from "@/app/models/ProductCategory";
import StockLevel from "@/app/models/StockLevel";
import Warehouse from "@/app/models/Warehouse";
import connectDB from "@/lib/mongodb";
import {
  LOW_STOCK_THRESHOLD,
  resolveMediaUrlLists,
} from "@/lib/storefront";

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

const querySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(48).default(24),
    q: z.string().trim().max(100).default(""),
    category: z.string().trim().max(100).default(""),
    brand: z.string().trim().max(100).default(""),
    minPrice: z.string().optional(),
    maxPrice: z.string().optional(),
    sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
    inStock: z.enum(["true", "false"]).default("true"),
  })
  .transform((data) => ({
    ...data,
    minPrice: data.minPrice === undefined ? undefined : Number(data.minPrice),
    maxPrice: data.maxPrice === undefined ? undefined : Number(data.maxPrice),
  }))
  .refine(
    (data) =>
      (data.minPrice === undefined ||
        (Number.isFinite(data.minPrice) && data.minPrice >= 0)) &&
      (data.maxPrice === undefined ||
        (Number.isFinite(data.maxPrice) && data.maxPrice >= 0)),
    { message: "Price filters must be non-negative numbers" }
  )
  .refine(
    (data) =>
      data.minPrice === undefined ||
      data.maxPrice === undefined ||
      data.minPrice <= data.maxPrice,
    { message: "Minimum price cannot exceed maximum price" }
  );

type StoreProduct = {
  _id: mongoose.Types.ObjectId;
  slug: string;
  sku?: string;
  media: string[];
  category: mongoose.Types.ObjectId;
  brand?: mongoose.Types.ObjectId | null;
  price: number;
  discountPrice?: number | null;
  translations?: { en?: { name?: string; description?: string } };
  effectivePrice: number;
  available: number;
};

type ListingResult = {
  metadata: { total: number }[];
  items: StoreProduct[];
};

const effectivePriceExpression = {
  $cond: [
    {
      $and: [
        { $ne: ["$discountPrice", null] },
        { $gte: ["$discountPrice", 0] },
        { $lt: ["$discountPrice", "$price"] },
      ],
    },
    "$discountPrice",
    "$price",
  ],
};

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
    q: params.get("q") ?? "",
    category: params.get("category") ?? "",
    brand: params.get("brand") ?? "",
    minPrice: params.get("minPrice") ?? undefined,
    maxPrice: params.get("maxPrice") ?? undefined,
    sort: params.get("sort") ?? "newest",
    inStock: params.get("inStock") ?? "true",
  });
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid filters", 400);
  }

  try {
    await connectDB();
    const data = parsed.data;
    const filter: Record<string, unknown> = { isActive: true };
    if (data.q) {
      const expression = new RegExp(
        data.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      filter.$or = [
        { "translations.en.name": expression },
        { sku: expression },
        { slug: expression },
      ];
    }

    let unavailableFilter = false;
    if (data.category) {
      const category = mongoose.isValidObjectId(data.category)
        ? await ProductCategory.findById(data.category).select("_id").lean()
        : await ProductCategory.findOne({ slug: data.category })
            .select("_id")
            .lean();
      if (category) filter.category = category._id;
      else unavailableFilter = true;
    }
    if (data.brand) {
      const brand = mongoose.isValidObjectId(data.brand)
        ? await ProductBrand.findOne({
            _id: data.brand,
            status: "active",
          })
            .select("_id")
            .lean()
        : await ProductBrand.findOne({
            slug: data.brand,
            status: "active",
          })
            .select("_id")
            .lean();
      if (brand) filter.brand = brand._id;
      else unavailableFilter = true;
    }
    if (unavailableFilter) {
      return NextResponse.json({
        items: [],
        total: 0,
        page: data.page,
        totalPages: 1,
      });
    }

    const priceConditions: Record<string, unknown>[] = [];
    if (data.minPrice !== undefined) {
      priceConditions.push({ $gte: [effectivePriceExpression, data.minPrice] });
    }
    if (data.maxPrice !== undefined) {
      priceConditions.push({ $lte: [effectivePriceExpression, data.maxPrice] });
    }
    if (priceConditions.length > 0) {
      filter.$expr = { $and: priceConditions };
    }

    const sort: Record<string, 1 | -1> =
      data.sort === "price_asc"
        ? { effectivePrice: 1, _id: 1 }
        : data.sort === "price_desc"
          ? { effectivePrice: -1, _id: 1 }
          : { createdAt: -1, _id: -1 };
    const pipeline: PipelineStage[] = [
      { $match: filter },
      { $addFields: { effectivePrice: effectivePriceExpression } },
      {
        $lookup: {
          from: StockLevel.collection.name,
          let: { productId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$product", "$$productId"] } } },
            {
              $lookup: {
                from: Warehouse.collection.name,
                localField: "warehouse",
                foreignField: "_id",
                pipeline: [{ $match: { isActive: true } }, { $project: { _id: 1 } }],
                as: "activeWarehouse",
              },
            },
            { $match: { "activeWarehouse.0": { $exists: true } } },
            {
              $addFields: {
                available: {
                  $max: [0, { $subtract: ["$onHand", "$reserved"] }],
                },
              },
            },
            { $group: { _id: null, available: { $sum: "$available" } } },
          ],
          as: "stockSummary",
        },
      },
      {
        $addFields: {
          available: { $ifNull: [{ $first: "$stockSummary.available" }, 0] },
        },
      },
    ];
    if (data.inStock === "true") {
      pipeline.push({ $match: { available: { $gt: 0 } } });
    }
    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        items: [
          { $sort: sort },
          { $skip: (data.page - 1) * data.limit },
          { $limit: data.limit },
          {
            $project: {
              slug: 1,
              sku: 1,
              media: 1,
              category: 1,
              brand: 1,
              price: 1,
              discountPrice: 1,
              translations: 1,
              effectivePrice: 1,
              available: 1,
            },
          },
        ],
      },
    });

    const [result] = await Product.aggregate<ListingResult>(pipeline);
    const products = result?.items ?? [];
    const total = result?.metadata[0]?.total ?? 0;
    const categoryIds = [...new Set(products.map((product) => product.category))];
    const brandIds = [
      ...new Set(
        products.flatMap((product) => (product.brand ? [product.brand] : []))
      ),
    ];
    const [categories, brands, mediaLists] = await Promise.all([
      categoryIds.length
        ? ProductCategory.find({ _id: { $in: categoryIds } })
            .select("name")
            .lean()
        : [],
      brandIds.length
        ? ProductBrand.find({ _id: { $in: brandIds }, status: "active" })
            .select("name")
            .lean()
        : [],
      resolveMediaUrlLists(products.map((product) => product.media ?? [])),
    ]);
    const categoryNames = new Map(
      categories.map((category) => [category._id.toString(), category.name])
    );
    const brandNames = new Map(
      brands.map((brand) => [brand._id.toString(), brand.name])
    );
    const items = products.map((product, index) => ({
      id: product._id.toString(),
      slug: product.slug,
      name: product.translations?.en?.name ?? product.slug,
      shortDescription: (product.translations?.en?.description ?? "").slice(0, 240),
      imageUrl: mediaLists[index]?.[0] ?? "",
      price: product.price,
      discountPrice:
        product.discountPrice !== null &&
        product.discountPrice !== undefined &&
        product.discountPrice >= 0 &&
        product.discountPrice < product.price
          ? product.discountPrice
          : null,
      categoryName: categoryNames.get(product.category.toString()) ?? "",
      brandName: product.brand
        ? brandNames.get(product.brand.toString()) ?? ""
        : "",
      inStock: product.available > 0,
      lowStock:
        product.available > 0 &&
        product.available <= LOW_STOCK_THRESHOLD,
      available:
        product.available <= LOW_STOCK_THRESHOLD ? product.available : null,
    }));

    return NextResponse.json({
      items,
      total,
      page: data.page,
      totalPages: Math.max(1, Math.ceil(total / data.limit)),
    });
  } catch (error) {
    console.error("List storefront products failed:", error);
    return errorResponse("Failed to load products", 500);
  }
}
