// scripts/createAdmin.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  console.error("MONGODB_URI not found — check your .env.local file.");
  process.exit(1);
}

// Same shape as your app/models/User.js
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

// 👇 EDIT THESE before running
const ADMIN_NAME = "Admin";
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "Admin@123";

async function createAdmin() {
  await mongoose.connect(MONGODB_URI);

  const existing = await User.findOne({ email: ADMIN_EMAIL });

  if (existing) {
    existing.role = "admin";
    await existing.save();
    console.log(`✅ Existing user "${ADMIN_EMAIL}" upgraded to admin.`);
  } else {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
    });
    console.log(`✅ Admin user "${ADMIN_EMAIL}" created.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error("❌ Failed to create admin:", err);
  process.exit(1);
});