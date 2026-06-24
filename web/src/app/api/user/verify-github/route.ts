import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

// POST /api/user/verify-github — verify GitHub username
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { githubUsername } = body;

    if (!githubUsername || typeof githubUsername !== "string") {
      return NextResponse.json({ error: "GitHub username required" }, { status: 400 });
    }

    const username = githubUsername.trim();

    // Call GitHub public API
    const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: { "Accept": "application/vnd.github.v3+json", "User-Agent": "GeekBid-App" },
    });

    if (!ghRes.ok) {
      return NextResponse.json({ error: "GitHub user not found" }, { status: 404 });
    }

    const ghData = await ghRes.json();

    const githubData = {
      publicRepos: ghData.public_repos ?? 0,
      followers: ghData.followers ?? 0,
      profileUrl: ghData.html_url ?? "",
      verifiedAt: new Date().toISOString(),
    };

    const db = await getDb();
    await db.collection("users").updateOne(
      { _id: new ObjectId(auth.payload.userId) },
      {
        $set: {
          githubUsername: username,
          githubVerified: true,
          githubData,
        },
      }
    );

    return NextResponse.json({ ok: true, githubData });
  } catch (err) {
    console.error("[Verify GitHub Error]", err);
    return NextResponse.json({ error: "Failed to verify GitHub" }, { status: 500 });
  }
}
