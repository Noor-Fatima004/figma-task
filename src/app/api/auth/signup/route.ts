import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/app/models/User";
import { deleteImage, uploadImage, validateImageBuffer } from "@/lib/cloudinary";

const IMAGE_REGEX = /^data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/=]+)$/;

export async function POST(req: NextRequest) {
  let uploadedPublicId: string | undefined;
  try {
    const { name, email, password, image } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    let avatar:
      | { buffer: Buffer; mimeType: string; fileName: string }
      | undefined;
    if (image !== undefined && image !== null && image !== "") {
      if (typeof image !== "string") {
        return NextResponse.json({ error: "Invalid profile image" }, { status: 400 });
      }
      const match = IMAGE_REGEX.exec(image);
      if (!match) {
        return NextResponse.json({ error: "Invalid profile image" }, { status: 400 });
      }
        const mimeType = `image/${match[1] === "jpg" ? "jpeg" : match[1]}`;
      const buffer = Buffer.from(match[2], "base64");
      try {
        validateImageBuffer(buffer, mimeType, `avatar.${match[1]}`);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Invalid profile image" },
          { status: 400 }
        );
      }
      avatar = { buffer, mimeType, fileName: `avatar.${match[1]}` };
    }

    await connectDB();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const cloudImage = avatar ? await uploadImage(avatar, "users") : undefined;
    uploadedPublicId = cloudImage?.publicId;

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      image: cloudImage?.url || "",
      imagePublicId: cloudImage?.publicId || "",
    });

    return NextResponse.json(
      {
        message: "Signup successful",
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          image: newUser.image,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup failed:", error);
    if (uploadedPublicId) {
      try {
        await deleteImage(uploadedPublicId);
      } catch (cleanupError) {
        console.error(`Failed to clean up avatar "${uploadedPublicId}":`, cleanupError);
      }
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Signup failed",
      },
      { status: 500 }
    );
  }
}