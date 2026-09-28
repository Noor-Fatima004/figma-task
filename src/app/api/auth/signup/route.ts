import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/app/models/User";

const IMAGE_REGEX = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_LENGTH = 200_000; // base64 characters (~150KB), 256x256 image isse bahut chhoti hoti hai

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, image } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // Image optional hai, lekin agar aayi to server par bhi check karo
    if (image !== undefined && image !== null && image !== "") {
      if (
        typeof image !== "string" ||
        image.length > MAX_IMAGE_LENGTH ||
        !IMAGE_REGEX.test(image)
      ) {
        return NextResponse.json({ error: "Invalid profile image" }, { status: 400 });
      }
    }

    await connectDB();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      image: image || "",
    });

    return NextResponse.json(
      { message: "Signup successful", user: { id: newUser._id, name: newUser.name, email: newUser.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}