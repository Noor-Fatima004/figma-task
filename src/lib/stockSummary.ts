import mongoose from "mongoose";
import StockLevel from "@/app/models/StockLevel";

/**
 * Har product ka available stock (sab warehouses ka onHand - reserved, negative lines 0 gine jati hain).
 * ids na dein to saare products ka aata hai. Jis product ki stock row nahi, wo map mein nahi hota.
 */
export async function getAvailableByProduct(ids?: unknown[]) {
  const map = new Map<string, number>();

  const match: Record<string, unknown> = {};
  if (ids) {
    const objectIds = ids
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(String(id)));
    if (!objectIds.length) return map;
    match.product = { $in: objectIds };
  }

  const rows = await StockLevel.aggregate<{ _id: mongoose.Types.ObjectId; available: number }>([
    { $match: match },
    {
      $group: {
        _id: "$product",
        available: { $sum: { $max: [0, { $subtract: ["$onHand", "$reserved"] }] } },
      },
    },
  ]);

  for (const r of rows) map.set(String(r._id), r.available);
  return map;
}