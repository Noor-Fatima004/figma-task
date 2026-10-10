import mongoose from "mongoose";
import { config as loadDotEnv } from "dotenv";
import path from "node:path";
import Order from "../src/app/models/Order";
import Invoice from "../src/app/models/Invoice";
import connectDB from "../src/lib/mongodb";
import { createInvoiceForOrder } from "../src/lib/invoices";

loadDotEnv({ path: path.join(process.cwd(), ".env.local") });

async function main() {
  await connectDB();
  const orders = await Order.find({}).sort({ createdAt: 1 }).lean();
  let created = 0;
  for (const order of orders) {
    const exists = await Invoice.exists({ order: order._id });
    if (exists) continue;
    await createInvoiceForOrder(order);
    created += 1;
  }
  console.info(
    `Invoice backfill complete: ${created} created, ${orders.length - created} already present.`
  );
}

main()
  .catch((error: unknown) => {
    console.error("Invoice backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
