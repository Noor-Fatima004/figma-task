// models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,       // MongoDB rejects duplicate emails
      lowercase: true,     // "Bob@x.com" and "bob@x.com" are the same user
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,       // ⭐ password is hidden from normal queries
    },
  },
  { timestamps: true }
);

// Prevents "Cannot overwrite `User` model" error during hot-reload
export default mongoose.models.User || mongoose.model("User", UserSchema);