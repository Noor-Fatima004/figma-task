export type StockStatus = "in" | "out";

export type StockRow = {
  _id: string;
  productId: string;
  variations: string[];
  productName: string;
  sku: string;
  variantLabel: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  onHand: number;
  reserved: number;
  available: number;
  binLocation: string;
  status: StockStatus;
};

export type StockSummary = {
  lines: number;
  totalOnHand: number;
  totalAvailable: number;
  out: number;
};

export type MovementRow = {
  _id: string;
  createdAt: string;
  type: "in" | "out" | "adjustment";
  quantity: number;
  balanceAfter: number;
  reason: string;
  reference: string;
  note: string;
  productName: string;
  sku: string;
  variantLabel: string;
  warehouseName: string;
  warehouseCode: string;
  createdByName: string;
};

export type WarehouseOption = { _id: string; name: string; code: string };

export const reasonLabels: Record<string, string> = {
  purchase: "Purchase",
  opening_stock: "Opening stock",
  customer_return: "Customer return",
  production: "Production",
  sale: "Sale",
  damaged: "Damaged",
  expired: "Expired",
  lost: "Lost / missing",
  internal_use: "Internal use",
  stock_count: "Stock count",
  other: "Other",
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function fetchJson(
  url: string,
  init?: RequestInit
): Promise<Record<string, unknown>> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      isRecord(body) && typeof body.error === "string"
        ? body.error
        : "Request failed."
    );
  }
  if (!isRecord(body)) throw new Error("Unexpected response from the server.");
  return body;
}

export function readItems<T>(body: Record<string, unknown>): T[] {
  if (!Array.isArray(body.items)) throw new Error("Invalid response.");
  return body.items as T[];
}

export function readNumber(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "number" ? value : 0;
}

export async function loadWarehouseOptions(
  activeOnly = false
): Promise<WarehouseOption[]> {
  const body = await fetchJson(
    `/api/warehouse?limit=100${activeOnly ? "&status=active" : ""}`
  );
  return readItems<Record<string, unknown>>(body)
    .filter((item) => typeof item._id === "string")
    .map((item) => ({
      _id: String(item._id),
      name: String(item.name ?? ""),
      code: String(item.code ?? ""),
    }));
}

export function formatQty(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
