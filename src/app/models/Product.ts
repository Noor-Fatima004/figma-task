import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Language wise name/description. Abhi sirf "en" save hota hai,
 * Map ki wajah se baad me nayi language add karne par schema nahi badalna padega.
 */
const TranslationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "" },
  },
  { _id: false }
);

/** Variable product: ek attribute + uski selected variations */
const ProductAttributeSchema = new Schema(
  {
    // NOTE: ref ke naam apne existing models ke naam se match karo
    attribute: {
      type: Schema.Types.ObjectId,
      ref: "ProductAttribute",
      required: true,
    },
    variations: [{ type: Schema.Types.ObjectId, ref: "ProductVariation" }],
  },
  { _id: false }
);

const ProductSchema = new Schema(
  {
    /* ───── Basic info ───── */
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    media: { type: [String], default: [] }, // gallery image ids
    mediaPublicIds: { type: [String], default: [] },
    category: {
      type: Schema.Types.ObjectId,
      ref: "ProductCategory",
      required: true,
      index: true,
    },
    translations: { type: Map, of: TranslationSchema, required: true },
    videoEmbedCode: { type: String, default: "" },

    /* ───── Advance info ───── */
    productType: {
      type: String,
      enum: ["simple", "variable"],
      required: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    isPoint: { type: Boolean, default: true },
    isFeature: { type: Boolean, default: true },
    unit: { type: Schema.Types.ObjectId, ref: "ProductUnit", required: true },
    brand: { type: Schema.Types.ObjectId, ref: "ProductBrand", default: null },
    weight: { type: Number, min: 0, default: null },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0, default: null },
    minOrder: { type: Number, required: true, min: 1, default: 1 },
    maxOrder: { type: Number, required: true, min: 1, default: 5 },
    // sparse unique: khali SKU wale products ek dusre se clash nahi karte
    sku: { type: String, trim: true, unique: true, sparse: true },
    attributes: { type: [ProductAttributeSchema], default: [] },

    /* ───── SEO ───── */
    seoMetaTags: { type: String, required: true, trim: true, maxlength: 255 },
    seoDescription: { type: String, required: true, trim: true, maxlength: 320 },
  },
  { timestamps: true }
);

ProductSchema.index({ createdAt: -1 });

export type ProductDoc = InferSchemaType<typeof ProductSchema>;

const Product: Model<ProductDoc> =
  (mongoose.models.Product as Model<ProductDoc>) ||
  mongoose.model<ProductDoc>("Product", ProductSchema);

export default Product;