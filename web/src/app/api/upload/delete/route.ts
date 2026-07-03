import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import cloudinary from "@/lib/cloudinary";

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { publicId } = await req.json();
    if (!publicId) {
      return NextResponse.json({ error: "publicId required" }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({ _id: new ObjectId(auth.payload.userId) });
    if (!user || user.avatarPublicId !== publicId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await cloudinary.uploader.destroy(publicId);
    await db.collection("users").updateOne(
      { _id: new ObjectId(auth.payload.userId) },
      { $set: { avatarUrl: "", avatarPublicId: "" } }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Upload Delete Error]", err);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
