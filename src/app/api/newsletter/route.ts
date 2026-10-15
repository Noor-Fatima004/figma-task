// Rakho: src/app/api/newsletter/route.ts
// POST /api/newsletter  { email }  ->  footer ka newsletter form

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Subscriber from "@/app/models/Subscriber";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    await connectDB();
    // Pehle se subscribed ho to bhi success (duplicate error nahi)
    await Subscriber.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("POST /api/newsletter failed:", e);
    return NextResponse.json({ error: "Could not subscribe. Please try again." }, { status: 500 });
  }
}