import mongoose from "mongoose";
import StockLevel from "@/app/models/StockLevel";
import StockMovement from "@/app/models/StockMovement";

export const stockReasons = [
  "purchase",
  "opening_stock",
  "customer_return",
  "production",
  "sale",
  "damaged",
  "expired",
  "lost",
  "internal_use",
  "stock_count",
  "reversal",
  "other",
] as const;
export type StockReason = (typeof stockReasons)[number];

/** in = add, out = remove, set = stock count (set on-hand to a counted value) */
export type StockMode = "in" | "out" | "set";

export class StockError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "StockError";
    this.status = status;
  }
}

export const isObjectId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

export const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const round3 = (value: number) => Math.round(value * 1000) / 1000;

/** Order-independent key for a variation combination. "" for simple products. */
export function buildVariantKey(variations: string[]) {
  return [...variations].sort().join("-");
}

/** Best-effort read of the admin's user id from whatever requireAdmin returns. */
export function readUserId(user: unknown): string | null {
  if (typeof user !== "object" || user === null) return null;
  const record = user as Record<string, unknown>;
  const id = record._id ?? record.id;
  if (typeof id === "string" && isObjectId(id)) return id;
  if (id instanceof mongoose.Types.ObjectId) return id.toString();
  return null;
}

export function productDisplayName(product: {
  slug?: string;
  translations?: unknown;
}) {
  const translations = product.translations as
    | Record<string, { name?: string }>
    | undefined;
  return translations?.en?.name || product.slug || "Product";
}

/**
 * Checks that `selected` is exactly one variation from every attribute that
 * the product uses. Returns the ids ordered by attribute, or null if invalid.
 * Simple products must have no variations.
 */
export function validateVariantSelection(
  product: {
    productType: string;
    attributes?: { variations?: unknown[] }[];
  },
  selected: string[]
): string[] | null {
  const unique = [...new Set(selected)];
  if (product.productType !== "variable") {
    return unique.length === 0 ? [] : null;
  }
  const groups = (product.attributes ?? [])
    .map((attribute) => (attribute.variations ?? []).map(String))
    .filter((group) => group.length > 0);
  if (unique.length !== groups.length) return null;

  const remaining = [...unique];
  const ordered: string[] = [];
  for (const group of groups) {
    const index = remaining.findIndex((id) => group.includes(id));
    if (index === -1) return null;
    ordered.push(remaining[index]);
    remaining.splice(index, 1);
  }
  return ordered;
}

/** "Red / M" from variation ids + the looked-up variation docs. */
export function variantLabel(
  ids: mongoose.Types.ObjectId[] | undefined,
  docs: { _id: mongoose.Types.ObjectId; name: string }[] | undefined
) {
  if (!ids || ids.length === 0) return "";
  const names = new Map((docs ?? []).map((doc) => [doc._id.toString(), doc.name]));
  return ids.map((id) => names.get(id.toString()) ?? "?").join(" / ");
}

export type StockChange = {
  product: string;
  /** Variation ids in attribute order ([] for simple products). */
  variations: string[];
  warehouse: string;
  mode: StockMode;
  quantity: number;
  reason: string;
  reference: string;
  note: string;
  /** Warehouse setting: allow stock-out below zero / below reserved. */
  allowNegative: boolean;
  userId: string | null;
  /** Used in error messages, e.g. "T-shirt (Red / M)". */
  label: string;
  /** Set only when creating the compensating entry for a reversal. */
  reversalOf?: string;
};

export type StockDeleteLevel = {
  _id: mongoose.Types.ObjectId;
  onHand: number;
  reserved: number;
};

/**
 * Empty by default. Future modules can register batched checks for open
 * orders, purchase orders, or transfers that reference stock levels.
 */
export const stockReferenceChecks: Array<
  (levels: StockDeleteLevel[]) => Promise<Map<string, string>>
> = [];

/** Returns each stock row's on-hand, reserved, and registered blockers. */
export async function getStockDeleteBlockers(
  levels: StockDeleteLevel[]
): Promise<Map<string, string[]>> {
  const blockers = new Map<string, string[]>();
  const add = (id: string, reason: string) => {
    const reasons = blockers.get(id) ?? [];
    reasons.push(reason);
    blockers.set(id, reasons);
  };

  for (const level of levels) {
    const id = level._id.toString();
    if (level.onHand !== 0) {
      add(
        id,
        `${level.onHand} ${Math.abs(level.onHand) === 1 ? "unit is" : "units are"} on hand`
      );
    }
    if (level.reserved !== 0) {
      add(
        id,
        `${level.reserved} ${level.reserved === 1 ? "unit is" : "units are"} reserved for open orders`
      );
    }
  }

  const registered = await Promise.all(
    stockReferenceChecks.map((check) => check(levels))
  );
  for (const checkResult of registered) {
    for (const [id, reason] of checkResult) {
      add(id, reason);
    }
  }
  return blockers;
}

async function hasStockFor(
  levelFilter: Record<string, unknown>,
  movementFilter: Record<string, unknown>
) {
  const levels = await StockLevel.exists({
    ...levelFilter,
    $or: [{ onHand: { $ne: 0 } }, { reserved: { $ne: 0 } }],
  });
  if (levels) return true;
  return Boolean(await StockMovement.exists(movementFilter));
}

export function hasStockForWarehouse(id: string) {
  const warehouse = new mongoose.Types.ObjectId(id);
  return hasStockFor({ warehouse }, { warehouse });
}

export function hasStockForProduct(id: string) {
  const product = new mongoose.Types.ObjectId(id);
  return hasStockFor({ product }, { product });
}

export function hasStockForVariation(id: string) {
  const variation = new mongoose.Types.ObjectId(id);
  return hasStockFor(
    { variations: variation },
    { variations: variation }
  );
}

/**
 * The ONLY place that changes stock. Must run inside a transaction
 * (pass the session). Atomically updates the level and appends a movement.
 */
export async function applyStockChange(
  change: StockChange,
  session: mongoose.ClientSession
) {
  const variantKey = buildVariantKey(change.variations);
  const product = new mongoose.Types.ObjectId(change.product);
  const warehouse = new mongoose.Types.ObjectId(change.warehouse);
  const variations = change.variations.map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  let delta: number;
  if (change.mode === "in") {
    delta = round3(change.quantity);
  } else if (change.mode === "out") {
    delta = -round3(change.quantity);
  } else {
    const current = await StockLevel.findOne({ product, variantKey, warehouse })
      .session(session)
      .lean();
    delta = round3(change.quantity - (current?.onHand ?? 0));
    if (delta === 0) return { onHand: current?.onHand ?? 0, delta: 0 };
  }

  // Stock-out may not take available (onHand - reserved) below zero unless
  // the warehouse allows negative stock.
  const guarded = change.mode === "out" && !change.allowNegative;
  const filter: Record<string, unknown> = { product, variantKey, warehouse };
  if (guarded) {
    filter.$expr = {
      $gte: [{ $subtract: ["$onHand", "$reserved"] }, -delta],
    };
  }

  const level = await StockLevel.findOneAndUpdate(
    filter,
    {
      $inc: { onHand: delta },
      $setOnInsert: { variations, reserved: 0, reorderLevel: 0 },
    },
    { new: true, upsert: !guarded, session }
  );
  if (!level) {
    throw new StockError(
      `Not enough available stock for ${change.label}.`,
      409
    );
  }

  await StockMovement.create(
    [
      {
        product,
        ...(change.reversalOf
          ? { reversalOf: new mongoose.Types.ObjectId(change.reversalOf) }
          : {}),
        variantKey,
        variations,
        warehouse,
        type: change.mode === "set" ? "adjustment" : change.mode,
        quantity: delta,
        balanceAfter: level.onHand,
        reason: change.reason,
        reference: change.reference,
        note: change.note,
        createdBy: change.userId
          ? new mongoose.Types.ObjectId(change.userId)
          : null,
      },
    ],
    { session }
  );

  return { onHand: level.onHand, delta };
}
