import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { hashSync } from "bcryptjs";

async function requireAdmin(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return { error: auth.error, status: auth.status };
  if (auth.payload.role !== "admin") return { error: "Forbidden", status: 403 };
  return { payload: auth.payload };
}

async function logAction(adminId: string, action: string, detail: string) {
  const db = await getDb();
  await db.collection("audit_logs").insertOne({
    adminId, action, detail, createdAt: new Date().toISOString(),
  });
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
  const search = searchParams.get("search") ?? "";
  const role = searchParams.get("role") ?? "";

  const db = await getDb();
  const filter: Record<string, unknown> = {};
  if (role && role !== "all") filter.role = role;
  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    db.collection("users")
      .find(filter, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    db.collection("users").countDocuments(filter),
  ]);

  return NextResponse.json({
    users: users.map(u => ({ ...u, _id: u._id.toString(), id: u._id.toString() })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { name, email, password, adminKey } = await req.json();

  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Admin key required to create admin users" }, { status: 403 });
  }
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
  }

  const db = await getDb();
  const existing = await db.collection("users").findOne({ email: email.toLowerCase() });
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const hashed = hashSync(password, 12);
  const user = {
    fullName: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashed,
    role: "admin",
    avatarInitial: name.trim().split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2),
    geekScore: 0,
    skills: [],
    bio: "",
    isVerified: true,
    company: "",
    availability: "available",
    hourlyRateMin: 0,
    hourlyRateMax: 0,
    avatarUrl: "",
    avatarPublicId: "",
    createdAt: new Date().toISOString(),
  };

  const result = await db.collection("users").insertOne(user);
  await logAction(auth.payload.userId, "create_admin", `Created admin user: ${email}`);

  return NextResponse.json({ id: result.insertedId.toString(), email }, { status: 201 });
}
