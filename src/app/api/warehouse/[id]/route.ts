import mongoose from "mongoose";
import { NextResponse } from "next/server";
import Warehouse from "@/app/models/Warehouse";
import StockLevel from "@/app/models/StockLevel";
import User from "@/app/models/User";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { warehouseSchema } from "@/app/admin/warehouse/add/schemas";
import { hasStockForWarehouse } from "@/lib/stock";

type Context = { params: Promise<{ id: string }> };

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

async function guard(id: string) {
  if (!(await requireAdmin())) return errorResponse("Unauthorized", 401);
  if (!mongoose.isValidObjectId(id)) {
    return errorResponse("Invalid warehouse id", 400);
  }
  return null;
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

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const error = await guard(id);
  if (error) return error;

  try {
    await connectDB();
    const warehouse = await Warehouse.findById(id);
    if (!warehouse) return errorResponse("Warehouse not found", 404);
    return NextResponse.json({ warehouse: serializeWarehouse(warehouse) });
  } catch (cause) {
    console.error("Load warehouse failed:", cause);
    return errorResponse("Failed to load warehouse", 500);
  }
}

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  const error = await guard(id);
  if (error) return error;

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
    const warehouse = await Warehouse.findById(id);
    if (!warehouse) return errorResponse("Warehouse not found", 404);
    if (!parsed.data.isActive) {
      const reserved = await StockLevel.exists({
        warehouse: id,
        reserved: { $gt: 0 },
      });
      if (reserved) {
        return errorResponse(
          "Cannot deactivate this warehouse while stock is reserved for open orders.",
          409
        );
      }
    }
    if (parsed.data.manager && !(await User.exists({ _id: parsed.data.manager }))) {
      return errorResponse("Selected manager was not found", 400);
    }

    const data = {
      ...parsed.data,
      workingDays: [...new Set(parsed.data.workingDays)],
      serviceableAreas: [...new Set(parsed.data.serviceableAreas)],
    };
    warehouse.set(data);
    if (data.isDefault) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await Warehouse.updateMany(
            { isDefault: true, _id: { $ne: id } },
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
    return NextResponse.json({ warehouse: serializeWarehouse(warehouse) });
  } catch (cause) {
    const duplicate = duplicateResponse(cause);
    if (duplicate) return duplicate;
    if (cause instanceof mongoose.Error.ValidationError) {
      return errorResponse(
        Object.values(cause.errors)
          .map((item) => item.message)
          .join(", "),
        400
      );
    }
    console.error("Update warehouse failed:", cause);
    return errorResponse("Failed to update warehouse", 500);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  const error = await guard(id);
  if (error) return error;

  try {
    await connectDB();
    const existing = await Warehouse.findById(id).select("isDefault").lean();
    if (!existing) return errorResponse("Warehouse not found", 404);
    if (existing.isDefault) {
      return errorResponse("Cannot delete the default warehouse", 409);
    }
    if (await hasStockForWarehouse(id)) {
      return errorResponse(
        "This warehouse has stock or stock history. Deactivate it instead.",
        409
      );
    }

    const warehouse = await Warehouse.findOneAndDelete({
      _id: id,
      isDefault: { $ne: true },
    });
    if (!warehouse) {
      const exists = await Warehouse.exists({ _id: id });
      if (!exists) return errorResponse("Warehouse not found", 404);
      return errorResponse("Cannot delete the default warehouse", 409);
    }
    return NextResponse.json({ success: true });
  } catch (cause) {
    console.error("Delete warehouse failed:", cause);
    return errorResponse("Failed to delete warehouse", 500);
  }
}
