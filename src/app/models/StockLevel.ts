import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Current stock of one sellable item in one warehouse.
 *
 * "Sellable item" = product + (optional) variation combination.
 *   - simple product            -> variantKey = ""  , variations = []
 *   - variable product (Red/M)  -> variantKey = "<redId>-<mId>" (sorted ids)
 *
 * One row per (product, variantKey, warehouse). Never edit onHand directly;
 * always go through lib/stock.ts so a StockMovement is written as well.
 */
const StockLevelSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantKey: { type: String, default: "", trim: true },
    // Kept in attribute order (Color, Size...) so labels read naturally.
    variations: [{ type: Schema.Types.ObjectId, ref: "ProductVariation" }],
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    onHand: { type: Number, default: 0 },
    reserved: { type: Number, default: 0, min: 0 },
    binLocation: { type: String, trim: true, maxlength: 50, default: "" },
  },
  { timestamps: true }
);

StockLevelSchema.index(
  { product: 1, variantKey: 1, warehouse: 1 },
  { unique: true }
);

export type StockLevelDoc = InferSchemaType<typeof StockLevelSchema>;

const StockLevel: Model<StockLevelDoc> =
  (mongoose.models.StockLevel as Model<StockLevelDoc>) ||
  mongoose.model<StockLevelDoc>("StockLevel", StockLevelSchema);

export default StockLevel;
