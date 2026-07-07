import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";

/**
 * GET /api/users — list users (protected, admin sees all, others see public profiles)
 */
export async function GET(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const db = await getDb();
 const role = req.nextUrl.searchParams.get("role");
 // Soft-deleted accounts must never appear in a general listing (Talent
 // Pool, etc.) — same visibility bug already fixed on the admin users
 // list. Suspended accounts are excluded for non-admins too (an admin can
 // still see them via GET /api/admin/users, which shows suspension status
 // explicitly).
 const filter: Record<string, unknown> = { deleted: { $ne: true } };
 if (auth.payload.role !== "admin") filter.suspended = { $ne: true };
 if (role) filter.role = role;

 // Email is also the login credential — only admins get it in bulk. Everyone
 // else gets a public-profile view (no email, no OAuth id).
 const projection =
 auth.payload.role === "admin"
 ? { password: 0 }
 : { password: 0, googleId: 0, email: 0 };

 const users = await db
 .collection("users")
 .find(filter, { projection })
 .sort({ createdAt: -1 })
 .limit(200)
 .toArray();

 return NextResponse.json(
 users.map((u) => ({
 ...u,
 _id: u._id.toString(),
 id: u._id.toString(),
 }))
 );
 } catch (err) {
 console.error("[Users GET Error]", err);
 return NextResponse.json(
 { error: "Failed to fetch users" },
 { status: 500 }
 );
 }
}
