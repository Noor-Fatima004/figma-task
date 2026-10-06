import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import Product from "@/app/models/Product";
import { safeDelete, usageError } from "@/lib/safeDelete";
import { isCloudinaryImageUrl, resolveMediaPublicIds } from "@/lib/galleryMedia";
import { productSchema } from "@/app/admin/catalog/products/add/schemas";

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
