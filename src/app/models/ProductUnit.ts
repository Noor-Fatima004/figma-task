import mongoose, { Schema, models, model } from "mongoose";

const ProductUnitSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Unique name, case-insensitive ("KG" and "kg" are treated as the same)
ProductUnitSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

export default (models.ProductUnit as mongoose.Model<any>) ||
  model("ProductUnit", ProductUnitSchema);