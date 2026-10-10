import mongoose, {
  Schema,
  type ClientSession,
  type InferSchemaType,
  type Model,
} from "mongoose";

const AddressSchema = new Schema(
  {
    name: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    line1: { type: String, default: "", trim: true },
    line2: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    postalCode: { type: String, default: "", trim: true },
    country: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const InvoiceItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    name: { type: String, required: true, trim: true },
    sku: { type: String, default: "", trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PaymentSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, required: true, trim: true },
    transactionId: { type: String, default: "", trim: true },
    paidAt: { type: Date, required: true, default: Date.now },
    note: { type: String, default: "", trim: true, maxlength: 500 },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false }
);

const InvoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    orderNumberSnapshot: { type: String, default: "" },
    customer: {
      user: { type: Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, default: "", trim: true },
    },
    billingAddress: { type: AddressSchema, default: () => ({}) },
    shippingAddress: { type: AddressSchema, default: () => ({}) },
    issueDate: { type: Date, required: true, default: Date.now, index: true },
    dueDate: { type: Date, required: true, index: true },
    items: { type: [InvoiceItemSchema], required: true, minlength: 1 },
    subtotal: { type: Number, required: true, min: 0, default: 0 },
    discount: { type: Number, min: 0, default: 0 },
    tax: { type: Number, min: 0, default: 0 },
    shippingCharges: { type: Number, min: 0, default: 0 },
    grandTotal: { type: Number, required: true, min: 0, default: 0 },
    currency: { type: String, default: "USD", uppercase: true, trim: true },
    paymentStatus: {
      type: String,
      enum: [
        "draft",
        "unpaid",
        "partially_paid",
        "paid",
        "overdue",
        "refunded",
        "cancelled",
      ],
      default: "unpaid",
      index: true,
    },
    paymentMethod: { type: String, default: "cod", trim: true },
    transactionId: { type: String, default: "", trim: true },
    payments: { type: [PaymentSchema], default: [] },
    amountPaid: { type: Number, min: 0, default: 0 },
    balanceDue: { type: Number, min: 0, default: 0 },
    notes: { type: String, default: "", trim: true, maxlength: 5000 },
    terms: { type: String, default: "", trim: true, maxlength: 5000 },
    sentAt: { type: Date, default: null },
    lastSentTo: { type: String, default: "", trim: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

InvoiceSchema.index({ "customer.email": 1 });
InvoiceSchema.index({ orderNumberSnapshot: 1 });
InvoiceSchema.index(
  { order: 1 },
  { unique: true, partialFilterExpression: { order: { $type: "objectId" } } }
);
InvoiceSchema.index({ paymentStatus: 1, issueDate: -1 });
InvoiceSchema.index({ isDeleted: 1, issueDate: -1 });
InvoiceSchema.index({
  invoiceNumber: "text",
  "customer.name": "text",
  "customer.email": "text",
  "customer.phone": "text",
});

InvoiceSchema.pre("save", function () {
  const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  this.subtotal = round(
    this.items.reduce(
      (total, item) => total + round(item.unitPrice * item.quantity),
      0
    )
  );
  this.items.forEach((item) => {
    item.lineTotal = round(item.unitPrice * item.quantity);
  });
  this.grandTotal = round(
    Math.max(0, this.subtotal - this.discount + this.tax + this.shippingCharges)
  );
  this.amountPaid = round(
    this.payments.reduce((total, payment) => total + payment.amount, 0)
  );
  this.balanceDue = round(Math.max(0, this.grandTotal - this.amountPaid));
  if (!["draft", "refunded", "cancelled"].includes(this.paymentStatus)) {
    if (this.balanceDue === 0) this.paymentStatus = "paid";
    else if (this.amountPaid > 0) this.paymentStatus = "partially_paid";
    else if (this.paymentStatus !== "overdue") this.paymentStatus = "unpaid";
  }
});

export type InvoiceDoc = InferSchemaType<typeof InvoiceSchema>;
export type InvoiceSession = ClientSession;

const Invoice: Model<InvoiceDoc> =
  (mongoose.models.Invoice as Model<InvoiceDoc>) ||
  mongoose.model<InvoiceDoc>("Invoice", InvoiceSchema);

export default Invoice;
