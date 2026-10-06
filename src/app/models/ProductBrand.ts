import {
  InferSchemaType,
  Model,
  Schema,
  models,
  model,
} from "mongoose";

const ProductBrandSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    // gallery image ki id (optional)
    image: { type: Schema.Types.ObjectId, ref: "GalleryImage", default: null },
  },
  { timestamps: true }
);

ProductBrandSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);
ProductBrandSchema.index({ slug: 1 }, { unique: true });

type ProductBrandDoc = InferSchemaType<typeof ProductBrandSchema>;

const ProductBrand: Model<ProductBrandDoc> =
  (models.ProductBrand as Model<ProductBrandDoc>) ||
  model<ProductBrandDoc>("ProductBrand", ProductBrandSchema);

export default ProductBrand;