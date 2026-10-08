import mongoose, {
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const WarehouseSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: ["main", "branch", "distribution", "returns", "third_party"],
      required: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    description: { type: String, default: "" },
    country: { type: String, default: "" },
    state: { type: String, default: "" },
    city: { type: String, default: "", index: true },
    area: { type: String, default: "" },
    address: { type: String, required: true, trim: true },
    postalCode: { type: String, default: "" },
    latitude: { type: Number, min: -90, max: 90, default: null },
    longitude: { type: Number, min: -180, max: 180, default: null },
    contactPerson: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    alternatePhone: { type: String, default: "", trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    capacity: { type: Number, min: 0, default: null },
    capacityUnit: {
      type: String,
      enum: ["units", "sqft", "cbm"],
      default: "units",
    },
    storageType: {
      type: String,
      enum: ["normal", "cold", "hazardous", "bonded"],
      default: "normal",
    },
    operatingHours: { type: String, default: "" },
    workingDays: { type: [String], default: [] },
    isDefault: { type: Boolean, default: false },
    allowNegativeStock: { type: Boolean, default: false },
    priority: { type: Number, min: 0, default: 0 },
    serviceableAreas: { type: [String], default: [] },
    manager: { type: Schema.Types.ObjectId, ref: "User", default: null },
    taxNumber: { type: String, default: "" },
  },
  { timestamps: true }
);

WarehouseSchema.index({ code: 1 }, { unique: true });
WarehouseSchema.index(
  { isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

export type WarehouseDoc = InferSchemaType<typeof WarehouseSchema>;

const Warehouse: Model<WarehouseDoc> =
  (mongoose.models.Warehouse as Model<WarehouseDoc>) ||
  mongoose.model<WarehouseDoc>("Warehouse", WarehouseSchema);

export default Warehouse;
