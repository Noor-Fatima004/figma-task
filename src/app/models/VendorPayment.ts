import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const VendorPaymentSchema = new Schema(
  {
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    purchaseOrder: { type: Schema.Types.ObjectId, ref: "PurchaseOrder", default: null, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, required: true, trim: true },
    transactionId: { type: String, default: "", trim: true },
    paidAt: { type: Date, default: Date.now, index: true },
    note: { type: String, default: "", trim: true, maxlength: 1000 },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export type VendorPaymentDoc = InferSchemaType<typeof VendorPaymentSchema>;
const VendorPayment: Model<VendorPaymentDoc> =
  (mongoose.models.VendorPayment as Model<VendorPaymentDoc>) ||
  mongoose.model<VendorPaymentDoc>("VendorPayment", VendorPaymentSchema);
export default VendorPayment;
