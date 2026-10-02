import mongoose, { Schema, models, model } from "mongoose";
import "@/app/models/ProductAttribute"; // ref register karne ke liye

const ProductVariationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    attribute: {
      type: Schema.Types.ObjectId,
      ref: "ProductAttribute",
      required: true,
    },
  },
  { timestamps: true }
);

ProductVariationSchema.index(
  { name: 1, attribute: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

export default (models.ProductVariation as mongoose.Model<any>) ||
  model("ProductVariation", ProductVariationSchema);