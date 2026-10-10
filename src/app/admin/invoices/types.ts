export type InvoiceStatus =
  | "draft"
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "refunded"
  | "cancelled";

export type InvoiceAddress = {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type InvoiceItem = {
  product?: string | null;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type InvoicePayment = {
  amount: number;
  method: string;
  transactionId: string;
  paidAt: string;
  note: string;
  recordedBy?: string | null;
};

export type Invoice = {
  _id: string;
  invoiceNumber: string;
  order: { _id: string; orderNumber: string } | null;
  customer: {
    user?: string | null;
    name: string;
    email: string;
    phone: string;
  };
  billingAddress: InvoiceAddress;
  shippingAddress: InvoiceAddress;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  shippingCharges: number;
  grandTotal: number;
  currency: string;
  paymentStatus: InvoiceStatus;
  paymentMethod: string;
  transactionId: string;
  payments: InvoicePayment[];
  amountPaid: number;
  balanceDue: number;
  notes: string;
  terms: string;
  sentAt?: string | null;
  lastSentTo?: string;
};

export type InvoiceAction =
  | "view"
  | "edit"
  | "status"
  | "payment"
  | "send"
  | "activity"
  | "delete"
  | "duplicate";
