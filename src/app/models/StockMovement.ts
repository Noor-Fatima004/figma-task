import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Append-only ledger. Every change to a StockLevel creates exactly one
 * movement. Movements are never edited or deleted (audit trail).
 *
 * quantity is SIGNED: +10 = stock added, -3 = stock removed.
 */
const StockMovementSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    reversalOf: {
      type: Schema.Types.ObjectId,
      ref: "StockMovement",
      default: undefined,
    },
    variantKey: { type: String, default: "" },
    variations: [{ type: Schema.Types.ObjectId, ref: "ProductVariation" }],
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    type: { type: String, enum: ["in", "out", "adjustment"], required: true },
    quantity: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    reference: { type: String, default: "", trim: true, maxlength: 100 },
    note: { type: String, default: "", trim: true, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

StockMovementSchema.index({ createdAt: -1 });
StockMovementSchema.index({ warehouse: 1, createdAt: -1 });
StockMovementSchema.index({ product: 1, variantKey: 1, createdAt: -1 });
StockMovementSchema.index({ reversalOf: 1 }, { unique: true, sparse: true });

// Ledger rows are immutable.
StockMovementSchema.pre(
  [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "findOneAndReplace",
    "findOneAndDelete",
    "deleteOne",
    "deleteMany",
  ],
  function () {
    throw new Error("Stock movements cannot be modified or deleted.");
  }
);

export type StockMovementDoc = InferSchemaType<typeof StockMovementSchema>;

const StockMovement: Model<StockMovementDoc> =
  (mongoose.models.StockMovement as Model<StockMovementDoc>) ||
  mongoose.model<StockMovementDoc>("StockMovement", StockMovementSchema);

export default StockMovement;
