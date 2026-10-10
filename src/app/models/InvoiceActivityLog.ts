import mongoose, { Schema } from "mongoose";

const InvoiceActivityLogSchema = new Schema(
  {
    invoice: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
      index: true,
    },
    action: { type: String, required: true, trim: true },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    oldValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null },
    note: { type: String, default: "", trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

InvoiceActivityLogSchema.index({ invoice: 1, createdAt: -1 });

const InvoiceActivityLog =
  mongoose.models.InvoiceActivityLog ||
  mongoose.model("InvoiceActivityLog", InvoiceActivityLogSchema);

export default InvoiceActivityLog;
