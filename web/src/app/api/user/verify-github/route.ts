import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/sanitize";

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

 // GitHub's unauthenticated REST API quota (60 req/hr) is shared across the
 // whole app's outbound traffic, not per-user — without a limit here, one
 // user looping "confirm" retries can exhaust it for everyone (see the
 // rate-limit-response handling below, which also stops treating an
 // exhausted-quota response from GitHub as a false "user not found").
 if (!(await checkRateLimit(`github-verify:${auth.payload.userId}`, 10, 60 * 1000))) {
 return NextResponse.json({ error: "Too many verification attempts. Please slow down." }, { status: 429 });
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
 // A 403 with an exhausted rate-limit header means GitHub's shared
 // unauthenticated quota ran out — that is not "user not found" and
 // saying so would actively mislead every user until the quota resets.
 if (ghRes.status === 403 && ghRes.headers.get("x-ratelimit-remaining") === "0") {
 return NextResponse.json(
 { error: "GitHub verification is temporarily rate-limited platform-wide. Please try again in a few minutes." },
 { status: 503 }
 );
 }
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
