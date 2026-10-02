import mongoose, { Schema, models, model } from "mongoose";

const ProductBrandSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    // gallery image ki id (optional)
    image: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

ProductBrandSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);
ProductBrandSchema.index({ slug: 1 }, { unique: true });

export default (models.ProductBrand as mongoose.Model<any>) ||
  model("ProductBrand", ProductBrandSchema);