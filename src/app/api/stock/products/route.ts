import mongoose from "mongoose";
import { NextResponse } from "next/server";
import Product from "@/app/models/Product";
import ProductVariation from "@/app/models/ProductVariation";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { escapeRegex, productDisplayName } from "@/lib/stock";

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

type Variation = { _id: mongoose.Types.ObjectId; name: string };

/** Every Color x Size x ... combination, capped so huge matrices stay safe. */
function buildCombinations(groups: Variation[][], cap = 300) {
  let combos: Variation[][] = [[]];
  for (const group of groups) {
    const next: Variation[][] = [];
    outer: for (const combo of combos) {
      for (const variation of group) {
        next.push([...combo, variation]);
        if (next.length >= cap) break outer;
      }
    }
    combos = next;
  }
  return combos;
}

/**
 * Products that can hold stock, with their sellable variants
 * (e.g. "Red / M"). Used by the Add Stock form.
 */
export async function GET(request: Request) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);

  try {
    await connectDB();
    const params = new URL(request.url).searchParams;
    const q = escapeRegex((params.get("q") ?? "").trim());
    const limit = Math.min(
      200,
      Math.max(1, Number.parseInt(params.get("limit") ?? "100", 10) || 100)
    );

    const filter: Record<string, unknown> = { isActive: true };
    if (q) {
      const expression = new RegExp(q, "i");
      filter.$or = [
        { "translations.en.name": expression },
        { sku: expression },
        { slug: expression },
      ];
    }

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("slug sku productType translations attributes")
      .populate({
        path: "attributes.variations",
        select: "name",
        model: ProductVariation,
      })
      .lean();

    const items = products.map((product) => {
      const groups = (product.attributes ?? [])
        .map((attribute) => attribute.variations as unknown as Variation[])
        .filter((group) => Array.isArray(group) && group.length > 0);
      const variants =
        product.productType === "variable" && groups.length > 0
          ? buildCombinations(groups).map((combo) => ({
              variations: combo.map((variation) => variation._id.toString()),
              label: combo.map((variation) => variation.name).join(" / "),
            }))
          : [];
      return {
        _id: product._id.toString(),
        name: productDisplayName(product),
        sku: product.sku ?? "",
        variants,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("List stock products failed:", error);
    return errorResponse("Failed to load products", 500);
  }
}
