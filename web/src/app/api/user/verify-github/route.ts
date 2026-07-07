import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import crypto from "crypto";

// POST /api/user/verify-github — two-step proof-of-ownership verification.
//
// step "start" (default): generates a one-time code the caller must place in
// their GitHub profile bio, proving they control that account. Without this,
// anyone could claim any GitHub username just by typing it in — the old
// implementation only checked the username existed, not that the caller
// owned it.
// step "confirm": re-fetches the GitHub profile and checks the bio actually
// contains the previously-issued code before marking the account verified.
export async function POST(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const body = await req.json();
 const { githubUsername, step } = body;

 if (!githubUsername || typeof githubUsername !== "string") {
 return NextResponse.json({ error: "GitHub username required" }, { status: 400 });
 }

 const username = githubUsername.trim();
 const db = await getDb();
 const userId = ObjectId.createFromHexString(auth.payload.userId);

 const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
 headers: { "Accept": "application/vnd.github.v3+json", "User-Agent": "GeekBid-App" },
 });
 if (!ghRes.ok) {
 return NextResponse.json({ error: "GitHub user not found" }, { status: 404 });
 }
 const ghData = await ghRes.json();

 if (step === "confirm") {
 const user = await db.collection("users").findOne({ _id: userId });
 const pending = user?.githubVerificationPending;
 if (!pending || pending.username !== username) {
 return NextResponse.json(
 { error: "No verification in progress for this username. Click Verify to get a code first." },
 { status: 400 }
 );
 }
 const bio: string = ghData.bio ?? "";
 if (!bio.includes(pending.code)) {
 return NextResponse.json(
 { error: `Code not found in your GitHub bio yet. Add "${pending.code}" to your bio (github.com/settings/profile) and try again.` },
 { status: 400 }
 );
 }

 const githubData = {
 publicRepos: ghData.public_repos ?? 0,
 followers: ghData.followers ?? 0,
 profileUrl: ghData.html_url ?? "",
 verifiedAt: new Date().toISOString(),
 };

 await db.collection("users").updateOne(
 { _id: userId },
 {
 $set: { githubUsername: username, githubVerified: true, githubData },
 $unset: { githubVerificationPending: "" },
 }
 );

 return NextResponse.json({ ok: true, verified: true, githubData });
 }

 // step "start" — issue a fresh challenge code and store it against this user.
 const code = `geekbid-verify-${crypto.randomBytes(4).toString("hex")}`;
 await db.collection("users").updateOne(
 { _id: userId },
 { $set: { githubVerificationPending: { username, code, startedAt: new Date().toISOString() } } }
 );

 return NextResponse.json({
 ok: true,
 verified: false,
 code,
 instructions: `Add "${code}" to your GitHub bio (github.com/settings/profile), then click Confirm.`,
 });
 } catch (err) {
 console.error("[Verify GitHub Error]", err);
 return NextResponse.json({ error: "Failed to verify GitHub" }, { status: 500 });
 }
}
