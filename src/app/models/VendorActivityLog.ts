import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const VendorActivityLogSchema = new Schema(
  {
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    action: { type: String, required: true, trim: true, index: true },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    oldValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null },
    note: { type: String, default: "", trim: true, maxlength: 2000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
VendorActivityLogSchema.index({ vendor: 1, createdAt: -1 });

export type VendorActivityLogDoc = InferSchemaType<typeof VendorActivityLogSchema>;
const VendorActivityLog: Model<VendorActivityLogDoc> =
  (mongoose.models.VendorActivityLog as Model<VendorActivityLogDoc>) ||
  mongoose.model<VendorActivityLogDoc>("VendorActivityLog", VendorActivityLogSchema);
export default VendorActivityLog;
