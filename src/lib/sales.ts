import mongoose from "mongoose";
import Product from "@/app/models/Product";

// Is se zyada units bikne par best seller (testing ke liye 3, asli shop mein 20+)
export const BEST_SELLER_MIN_SOLD = 3;

export async function adjustSold(
  items: { product: mongoose.Types.ObjectId | string; quantity: number }[],
  direction: 1 | -1,
  session: mongoose.ClientSession
) {
  const totals = new Map<string, number>();
  for (const i of items) {
    const id = String(i.product);
    totals.set(id, (totals.get(id) ?? 0) + i.quantity);
  }
  if (!totals.size) return;

  await Product.bulkWrite(
    [...totals].map(([id, qty]) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id) },
        update: { $inc: { soldCount: direction * qty } },
      },
    })),
    { session }
  );

  const ids = [...totals.keys()].map((id) => new mongoose.Types.ObjectId(id));
  await Product.updateMany(
    { _id: { $in: ids }, soldCount: { $gt: BEST_SELLER_MIN_SOLD } },
    { $set: { isBestSeller: true } },
    { session }
  );
  await Product.updateMany(
    { _id: { $in: ids }, soldCount: { $lte: BEST_SELLER_MIN_SOLD } },
    { $set: { isBestSeller: false } },
    { session }
  );
}