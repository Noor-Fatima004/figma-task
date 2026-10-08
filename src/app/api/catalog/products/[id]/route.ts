import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import Product from "@/app/models/Product";
import ProductVariation from "@/app/models/ProductVariation";
import StockLevel from "@/app/models/StockLevel";
import StockMovement from "@/app/models/StockMovement";
import { safeDelete, usageError } from "@/lib/safeDelete";
import { isCloudinaryImageUrl, resolveMediaPublicIds } from "@/lib/galleryMedia";
import { productSchema } from "@/app/admin/catalog/products/add/schemas";
import { hasStockForProduct } from "@/lib/stock";

type Context = { params: Promise<{ id: string }> };

async function guard(id: string) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }
  return null;
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const error = await guard(id);
    if (error) return error;

    await connectDB();
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const english = product.translations.get("en");
    return NextResponse.json({
      product: {
        _id: String(product._id),
        media: product.media,
        category: String(product.category),
        translations: {
          en: {
            name: english?.name ?? "",
            description: english?.description ?? "",
          },
        },
        videoEmbedCode: product.videoEmbedCode,
        productType: product.productType,
        isActive: product.isActive,
        isPoint: product.isPoint,
        isFeature: product.isFeature,
        unit: String(product.unit),
        brand: product.brand ? String(product.brand) : null,
        weight: product.weight,
        price: product.price,
        discountPrice: product.discountPrice,
        minOrder: product.minOrder,
        maxOrder: product.maxOrder,
        sku: product.sku ?? "",
        attributes: product.attributes.map((item) => ({
          attribute: String(item.attribute),
          variations: item.variations.map(String),
        })),
        seoMetaTags: product.seoMetaTags,
        seoDescription: product.seoDescription,
      },
    });
  } catch (error) {
    console.error("Load product failed:", error);
    return NextResponse.json({ error: "Failed to load product" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const error = await guard(id);
    if (error) return error;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.map(String).join(".");
        if (!errors[key]) errors[key] = issue.message;
      }
      return NextResponse.json(
        { error: Object.values(errors)[0] ?? "Invalid product data", errors },
        { status: 400 }
      );
    }

    await connectDB();
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const data = parsed.data;
    const oldVariationIds = product.attributes.flatMap((attribute) =>
      attribute.variations.map(String)
    );
    const newVariationIds = data.attributes.flatMap((attribute) =>
      attribute.variations
    );
    const retainedVariations = new Set(newVariationIds);
    const removedVariationIds = [
      ...new Set(oldVariationIds.filter((variation) => !retainedVariations.has(variation))),
    ];
    const changingProductType = product.productType !== data.productType;

    if (changingProductType || removedVariationIds.length > 0) {
      const [stockRows, movementRows] = changingProductType
        ? await Promise.all([
            StockLevel.find({
              product: id,
              $or: [{ onHand: { $ne: 0 } }, { reserved: { $ne: 0 } }],
            })
              .select("variantKey variations")
              .lean(),
            StockMovement.find({ product: id })
              .select("variantKey variations")
              .lean(),
          ])
        : await Promise.all([
            StockLevel.find({
              product: id,
              variations: { $in: removedVariationIds },
            })
              .select("variantKey variations")
              .lean(),
            StockMovement.find({
              product: id,
              variations: { $in: removedVariationIds },
            })
              .select("variantKey variations")
              .lean(),
          ]);

      const combinations = new Map<
        string,
        { variationIds: Set<string>; variantKey: string }
      >();
      for (const row of [...stockRows, ...movementRows]) {
        const variantKey = row.variantKey ?? "";
        const key = variantKey || "simple";
        const combination = combinations.get(key) ?? {
          variationIds: new Set<string>(),
          variantKey,
        };
        for (const variation of row.variations ?? []) {
          combination.variationIds.add(variation.toString());
        }
        combinations.set(key, combination);
      }

      if (combinations.size > 0) {
        const variationIds = [
          ...new Set(
            [...combinations.values()].flatMap((item) => [...item.variationIds])
          ),
        ];
        const variationDocs = variationIds.length
          ? await ProductVariation.find({ _id: { $in: variationIds } })
              .select("name")
              .lean()
          : [];
        const names = new Map(
          variationDocs.map((variation) => [
            variation._id.toString(),
            variation.name,
          ])
        );
        const labels = [...combinations.values()].map((combination) => {
          const label = [...combination.variationIds]
            .map((variationId) => names.get(variationId))
            .filter((name): name is string => Boolean(name))
            .join(" / ");
          return label || combination.variantKey || "Simple product";
        });
        const message = changingProductType
          ? `Cannot change product type while these variants have stock or history: ${labels.join(", ")}`
          : `Cannot remove variations used by stock or history: ${labels.join(", ")}`;
        return NextResponse.json({ error: message }, { status: 409 });
      }
    }

    if (data.media.some((value) => !mongoose.isValidObjectId(value) && !isCloudinaryImageUrl(value))) {
      return NextResponse.json(
        { error: "Product media must use a gallery image or Cloudinary URL" },
        { status: 400 }
      );
    }
    product.media = data.media;
    product.mediaPublicIds = await resolveMediaPublicIds(data.media);
    product.category = new mongoose.Types.ObjectId(data.category);
    product.translations.set("en", data.translations.en);
    product.videoEmbedCode = data.videoEmbedCode;
    product.productType = data.productType;
    product.isActive = data.isActive;
    product.isPoint = data.isPoint;
    product.isFeature = data.isFeature;
    product.unit = new mongoose.Types.ObjectId(data.unit);
    product.brand = data.brand ? new mongoose.Types.ObjectId(data.brand) : null;
    product.weight = data.weight;
    product.price = data.price;
    product.discountPrice = data.discountPrice;
    product.minOrder = data.minOrder;
    product.maxOrder = data.maxOrder;
    product.sku = data.sku || undefined;
    product.set("attributes", data.attributes);
    product.seoMetaTags = data.seoMetaTags;
    product.seoDescription = data.seoDescription;
    await product.save();

    return NextResponse.json({
      message: "Product updated",
      product: { _id: String(product._id) },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json({ error: "This SKU already exists" }, { status: 409 });
    }
    console.error("Update product failed:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const error = await guard(id);
    if (error) return error;

    await connectDB();
    if (await hasStockForProduct(id)) {
      return NextResponse.json(
        { error: "This product has stock or stock history. Deactivate it instead." },
        { status: 409 }
      );
    }
    const { deleted: product, usage } = await safeDelete("product", id, (session) =>
      Product.findByIdAndDelete(id).session(session)
    );
    if (usage.length > 0) {
      return NextResponse.json({ error: usageError("product", usage) }, { status: 409 });
    }
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete product failed:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
