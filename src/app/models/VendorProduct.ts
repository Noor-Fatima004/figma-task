import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const VendorProductSchema = new Schema(
  {
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    vendorSku: { type: String, default: "", trim: true },
    costPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD", uppercase: true, trim: true },
    minOrderQty: { type: Number, min: 1, default: 1 },
    leadTimeDays: { type: Number, min: 0, default: 0 },
    isPreferred: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastPurchasePrice: { type: Number, min: 0, default: null },
    lastPurchaseDate: { type: Date, default: null },
    notes: { type: String, default: "", trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);
VendorProductSchema.index({ vendor: 1, product: 1 }, { unique: true });
VendorProductSchema.index({ product: 1, isPreferred: 1, isActive: 1 });

export type VendorProductDoc = InferSchemaType<typeof VendorProductSchema>;
const VendorProduct: Model<VendorProductDoc> =
  (mongoose.models.VendorProduct as Model<VendorProductDoc>) ||
  mongoose.model<VendorProductDoc>("VendorProduct", VendorProductSchema);
export default VendorProduct;
