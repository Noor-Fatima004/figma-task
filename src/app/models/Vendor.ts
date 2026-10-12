import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const AddressSchema = new Schema(
  {
    line1: { type: String, default: "", trim: true },
    line2: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    postalCode: { type: String, default: "", trim: true },
    country: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const BankDetailsSchema = new Schema(
  {
    bankName: { type: String, default: "", trim: true },
    accountTitle: { type: String, default: "", trim: true },
    accountNumber: { type: String, default: "", trim: true },
    iban: { type: String, default: "", trim: true },
    swift: { type: String, default: "", trim: true },
    branch: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const VendorSchema = new Schema(
  {
    vendorCode: { type: String, required: true, unique: true, index: true },
    companyName: { type: String, required: true, trim: true, maxlength: 200, index: true },
    contactPerson: { type: String, default: "", trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    alternatePhone: { type: String, default: "", trim: true, maxlength: 40 },
    website: { type: String, default: "", trim: true, maxlength: 500 },
    type: {
      type: String,
      enum: ["manufacturer", "wholesaler", "distributor", "retailer", "dropshipper", "service_provider"],
      default: "wholesaler",
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending", "blacklisted", "on_hold"],
      default: "active",
      index: true,
    },
    logo: { type: String, default: "" },
    address: { type: AddressSchema, default: () => ({}) },
    billingAddress: { type: AddressSchema, default: null },
    taxInfo: {
      taxId: { type: String, default: "", trim: true },
      taxType: { type: String, default: "", trim: true },
      isTaxExempt: { type: Boolean, default: false },
    },
    bankDetails: { type: BankDetailsSchema, default: () => ({}), select: false },
    paymentTerms: {
      type: String,
      enum: ["cod", "advance", "net_7", "net_15", "net_30", "net_60"],
      default: "cod",
      index: true,
    },
    creditLimit: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: "USD", uppercase: true, trim: true },
    openingBalance: { type: Number, default: 0 },
    paymentRevision: { type: Number, default: 0, select: false },
    leadTimeDays: { type: Number, min: 0, default: 0 },
    minimumOrderValue: { type: Number, min: 0, default: 0 },
    minimumOrderQuantity: { type: Number, min: 0, default: 0 },
    rating: { type: Number, min: 1, max: 5, default: null },
    notes: { type: String, default: "", maxlength: 5000 },
    tags: { type: [String], default: [] },
    categories: [{ type: Schema.Types.ObjectId, ref: "ProductCategory", index: true }],
    documents: [{
      name: { type: String, required: true, trim: true },
      url: { type: String, required: true, trim: true },
      type: { type: String, default: "other", trim: true },
      expiryDate: { type: Date, default: null },
    }],
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

VendorSchema.index({ companyName: "text", contactPerson: "text", email: "text", phone: "text", vendorCode: "text" });
VendorSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });
VendorSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

export type VendorDoc = InferSchemaType<typeof VendorSchema>;

const Vendor: Model<VendorDoc> =
  (mongoose.models.Vendor as Model<VendorDoc>) ||
  mongoose.model<VendorDoc>("Vendor", VendorSchema);

export default Vendor;
