import { NextResponse } from "next/server";
import User from "@/app/models/User";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const users = await User.find({})
      .select("name email")
      .sort({ name: 1, _id: 1 })
      .lean();
    return NextResponse.json({
      items: users.map((user) => ({
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
      })),
    });
  } catch (error) {
    console.error("Load warehouse managers failed:", error);
    return NextResponse.json(
      { error: "Failed to load warehouse managers" },
      { status: 500 }
    );
  }
}
