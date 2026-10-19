import mongoose from "mongoose";
import Product from "../src/app/models/Product";
import connectDB from "../src/lib/mongodb";
import { buildMediaUrlMap, buildVariationNameMap, toStorefrontProduct, type ProductLean } from "../src/lib/storefrontProduct";

async function check() {
  await connectDB();
  const table = (await Product.findOne({ slug: "table" }).lean()) as unknown as ProductLean;
  const map = await buildMediaUrlMap(table.media ?? []);
  const names = await buildVariationNameMap([table]);
  const storefront = toStorefrontProduct(table, map, names);
  console.log("Storefront product:", JSON.stringify({
    id: storefront.id,
    name: storefront.name,
    productType: storefront.productType,
    variationGroups: storefront.variationGroups
  }, null, 2));
}

check().catch(console.error).finally(() => mongoose.disconnect());
