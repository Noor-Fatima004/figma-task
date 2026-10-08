import mongoose from "mongoose";
import { NextResponse } from "next/server";
import Warehouse from "@/app/models/Warehouse";
import type { WarehouseDoc } from "@/app/models/Warehouse";
import User from "@/app/models/User";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { warehouseSchema } from "@/app/admin/warehouse/add/schemas";

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

type WarehouseFilter = {
  $or?: { name?: RegExp; code?: RegExp; city?: RegExp }[];
  isActive?: boolean;
  type?: WarehouseDoc["type"];
};

const warehouseTypes = [
  "main",
  "branch",
  "distribution",
  "returns",
  "third_party",
] as const;

function validationErrors(error: mongoose.Error.ValidationError) {
  return Object.values(error.errors)
    .map((item) => item.message)
    .join(", ");
}

function duplicateResponse(error: unknown) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    error.code !== 11000
  ) {
    return null;
  }
  const keyPattern =
    "keyPattern" in error &&
    typeof error.keyPattern === "object" &&
    error.keyPattern !== null
      ? error.keyPattern
      : {};
  return "isDefault" in keyPattern
    ? errorResponse("Another warehouse is already set as the default", 409)
    : errorResponse("A warehouse with this code already exists", 409);
}

function serializeWarehouse(warehouse: {
  _id: mongoose.Types.ObjectId;
  manager?: mongoose.Types.ObjectId | null;
  toObject: () => object;
}) {
  return {
    ...warehouse.toObject(),
    _id: warehouse._id.toString(),
    manager: warehouse.manager?.toString() ?? "",
  };
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);

  try {
    await connectDB();
    const params = new URL(request.url).searchParams;
    const q = (params.get("q") ?? "").trim();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const status = params.get("status");
    const type = warehouseTypes.find((value) => value === params.get("type"));
    const filter: WarehouseFilter = {};
    if (escaped) {
      const expression = new RegExp(escaped, "i");
      filter.$or = [
        { name: expression },
        { code: expression },
        { city: expression },
      ];
    }
    if (status === "active" || status === "inactive") {
      filter.isActive = status === "active";
    }
    if (type) filter.type = type;

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(params.get("limit") ?? "10", 10) || 10)
    );
    let page = Math.max(
      1,
      Number.parseInt(params.get("page") ?? "1", 10) || 1
    );
    const total = await Warehouse.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    page = Math.min(page, totalPages);

    const warehouses = await Warehouse.find(filter)
      .sort({ priority: 1, name: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const items = warehouses.map((warehouse) => ({
      ...warehouse,
      _id: warehouse._id.toString(),
      manager: warehouse.manager?.toString() ?? "",
    }));
    return NextResponse.json({ items, total, page, totalPages });
  } catch (error) {
    console.error("List warehouses failed:", error);
    return errorResponse("Failed to load warehouses", 500);
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const parsed = warehouseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid warehouse data",
        errors: Object.fromEntries(
          parsed.error.issues.map((issue) => [
            issue.path.map(String).join("."),
            issue.message,
          ])
        ),
      },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    if (parsed.data.manager && !(await User.exists({ _id: parsed.data.manager }))) {
      return errorResponse("Selected manager was not found", 400);
    }
    const data = {
      ...parsed.data,
      workingDays: [...new Set(parsed.data.workingDays)],
      serviceableAreas: [...new Set(parsed.data.serviceableAreas)],
    };
    const warehouse = new Warehouse(data);
    if (data.isDefault) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await Warehouse.updateMany(
            { isDefault: true },
            { $set: { isDefault: false } },
            { session }
          );
          await warehouse.save({ session });
        });
      } finally {
        await session.endSession();
      }
    } else {
      await warehouse.save();
    }
    return NextResponse.json(
      { warehouse: serializeWarehouse(warehouse) },
      { status: 201 }
    );
  } catch (error) {
    const duplicate = duplicateResponse(error);
    if (duplicate) return duplicate;
    if (error instanceof mongoose.Error.ValidationError) {
      return errorResponse(validationErrors(error), 400);
    }
    console.error("Create warehouse failed:", error);
    return errorResponse("Failed to create warehouse", 500);
  }
}
