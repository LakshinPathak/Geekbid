import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { hashSync } from "bcryptjs";
import { sanitizeSearchRegex, sanitizePagination, sanitizeString, checkRateLimit } from "@/lib/sanitize";

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

const ALLOWED_ROLES = ["freelancer", "client", "admin", "all"];

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const { page, limit } = sanitizePagination(searchParams.get("page"), searchParams.get("limit"));
  // Escape regex metacharacters to prevent ReDoS attacks
  const search = sanitizeSearchRegex(searchParams.get("search"));
  const roleRaw = sanitizeString(searchParams.get("role"));
  const role = ALLOWED_ROLES.includes(roleRaw) ? roleRaw : "";

  const db = await getDb();
  // Soft-deleted users are retained for data/audit purposes but must not
  // clutter the active-management list — they'd otherwise appear fully
  // normal and actionable (verify/edit/re-delete) with no indication they
  // were ever removed.
  const filter: Record<string, unknown> = { deleted: { $ne: true } };
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

  const body = await req.json();
  // Force strings — blocks object injection in adminKey comparison
  const name = sanitizeString(body.name);
  const email = sanitizeString(body.email).toLowerCase();
  const password = sanitizeString(body.password);
  const adminKey = String(body.adminKey ?? "");

  // Same secret as api/admin/verify-key, which rate-limits this comparison
  // to 5 attempts/15min — this endpoint (used to create new admin accounts)
  // had no throttling at all, letting an authenticated non-super admin
  // brute-force ADMIN_SECRET_KEY here instead.
  if (!(await checkRateLimit(`admin-key:user:${auth.payload.userId}`, 5, 15 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Admin key required to create admin users" }, { status: 403 });
  }
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
  }

  const db = await getDb();
  const existing = await db.collection("users").findOne({ email });
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const hashed = hashSync(password, 12);
  const user = {
    fullName: name,
    email,
    password: hashed,
    role: "admin",
    avatarInitial: name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2),
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
