import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const PurchaseOrderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    vendorSku: { type: String, default: "", trim: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    receivedQuantity: { type: Number, min: 0, default: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PurchaseOrderSchema = new Schema(
  {
    poNumber: { type: String, required: true, unique: true, index: true },
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    items: { type: [PurchaseOrderItemSchema], required: true, minlength: 1 },
    subtotal: { type: Number, min: 0, required: true },
    discount: { type: Number, min: 0, default: 0 },
    tax: { type: Number, min: 0, default: 0 },
    shippingCost: { type: Number, min: 0, default: 0 },
    grandTotal: { type: Number, min: 0, required: true },
    amountPaid: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: "USD", uppercase: true, trim: true },
    status: {
      type: String,
      enum: ["draft", "sent", "confirmed", "partially_received", "received", "cancelled"],
      default: "draft",
      index: true,
    },
    paymentStatus: { type: String, enum: ["unpaid", "partially_paid", "paid"], default: "unpaid", index: true },
    expectedDate: { type: Date, default: null },
    receivedDate: { type: Date, default: null },
    notes: { type: String, default: "", maxlength: 5000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);
PurchaseOrderSchema.index({ vendor: 1, status: 1, createdAt: -1 });

export type PurchaseOrderDoc = InferSchemaType<typeof PurchaseOrderSchema>;
const PurchaseOrder: Model<PurchaseOrderDoc> =
  (mongoose.models.PurchaseOrder as Model<PurchaseOrderDoc>) ||
  mongoose.model<PurchaseOrderDoc>("PurchaseOrder", PurchaseOrderSchema);
export default PurchaseOrder;
