import mongoose, { Schema, models, model } from "mongoose";

const ProductAttributeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
  },
  { timestamps: true }
);

// Unique name, case-insensitive ("Size" and "size" are the same)
ProductAttributeSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

export default (models.ProductAttribute as mongoose.Model<any>) ||
  model("ProductAttribute", ProductAttributeSchema);