import mongoose from "mongoose";
import { NextResponse } from "next/server";
import Product from "@/app/models/Product";
import ProductAttribute from "@/app/models/ProductAttribute";
import ProductBrand from "@/app/models/ProductBrand";
import ProductCategory from "@/app/models/ProductCategory";
import ProductUnit from "@/app/models/ProductUnit";
import ProductVariation from "@/app/models/ProductVariation";
import StockLevel from "@/app/models/StockLevel";
import Warehouse from "@/app/models/Warehouse";
import connectDB from "@/lib/mongodb";
import { resolveMediaUrls } from "@/lib/storefront";
import { productDisplayName } from "@/lib/stock";

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  try {
    await connectDB();
    const product = await Product.findOne({ slug, isActive: true }).lean();
    if (!product) return errorResponse("Product not found", 404);

    const variationIds = [
      ...new Set(
        product.attributes.flatMap((attribute) =>
          attribute.variations.map((id) => id.toString())
        )
      ),
    ];
    const attributeIds = product.attributes.map((attribute) => attribute.attribute);
    const [category, brand, unit, attributes, variations, images, stock] =
      await Promise.all([
        ProductCategory.findById(product.category).select("name slug").lean(),
        product.brand
          ? ProductBrand.findOne({ _id: product.brand, status: "active" })
              .select("name slug")
              .lean()
          : null,
        ProductUnit.findOne({ _id: product.unit, status: "active" })
          .select("name")
          .lean(),
        attributeIds.length
          ? ProductAttribute.find({ _id: { $in: attributeIds } })
              .select("name")
              .lean()
          : [],
        variationIds.length
          ? ProductVariation.find({ _id: { $in: variationIds } })
              .select("name attribute")
              .lean()
          : [],
        resolveMediaUrls(product.media ?? []),
        StockLevel.aggregate<{
          _id: string;
          variationIds: mongoose.Types.ObjectId[];
          available: number;
        }>([
          {
            $match: {
              product: product._id,
              warehouse: {
                $in: await Warehouse.find({ isActive: true }).distinct("_id"),
              },
            },
          },
          {
            $addFields: {
              sellable: {
                $max: [0, { $subtract: ["$onHand", "$reserved"] }],
              },
            },
          },
          {
            $group: {
              _id: "$variantKey",
              variationIds: { $first: "$variations" },
              available: { $sum: "$sellable" },
            },
          },
          { $match: { available: { $gt: 0 } } },
        ]),
      ]);

    const attributeNames = new Map(
      attributes.map((attribute) => [
        attribute._id.toString(),
        attribute.name,
      ])
    );
    const variationById = new Map(
      variations.map((variation) => [
        variation._id.toString(),
        { id: variation._id.toString(), name: variation.name },
      ])
    );
    const attributeList = product.attributes.map((attribute) => ({
      id: attribute.attribute.toString(),
      name: attributeNames.get(attribute.attribute.toString()) ?? "",
      variations: attribute.variations
        .map((variationId) => variationById.get(variationId.toString()))
        .filter(
          (variation): variation is { id: string; name: string } =>
            variation !== undefined
        ),
    }));
    const effectiveDiscount =
      product.discountPrice !== null &&
      product.discountPrice !== undefined &&
      product.discountPrice >= 0 &&
      product.discountPrice < product.price
        ? product.discountPrice
        : null;

    return NextResponse.json({
      product: {
        id: product._id.toString(),
        slug: product.slug,
        name: productDisplayName(product),
        description: product.translations.get("en")?.description ?? "",
        sku: product.sku ?? "",
        images,
        price: product.price,
        discountPrice: effectiveDiscount,
        category: category
          ? { name: category.name, slug: category.slug }
          : null,
        brand: brand ? { name: brand.name, slug: brand.slug } : null,
        unit: unit?.name ?? "",
        minOrder: product.minOrder,
        maxOrder: product.maxOrder,
        productType: product.productType,
        attributes: attributeList,
        combinations: stock.map((combination) => ({
          variantKey: combination._id,
          variationIds: combination.variationIds.map(String),
          available: combination.available,
        })),
        seoMetaTags: product.seoMetaTags,
        seoDescription: product.seoDescription,
      },
    });
  } catch (error) {
    console.error("Load storefront product failed:", error);
    return errorResponse("Failed to load product", 500);
  }
}
