import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/app/models/User";
import { requireAdmin } from "@/lib/requireAdmin";
import { addUserSchema } from "@/lib/validations/auth";

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Invalid / empty JSON body ko crash hone se bachao
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Same zod schema jo client par use ho raha hai
  const parsed = addUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data; // name & email already trimmed
  const normalizedEmail = email.toLowerCase();

  await connectDB();

  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: normalizedEmail,
    password: hashed,
    role: "user",
  });

  return NextResponse.json(
    {
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    },
    { status: 201 }
  );
}