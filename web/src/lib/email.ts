import { Resend } from "resend";
import { getDb } from "@/lib/mongodb";

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Config ─────────────────────────────────────────────────────────
const FROM_EMAIL = "GeekBid <onboarding@resend.dev>";
const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

// ── Email Tracking Types ───────────────────────────────────────────
export type EmailType =
  | "welcome" | "new_bid" | "direct_offer" | "offer_response"
  | "job_accepted" | "escrow_released" | "payment_verified"
  | "milestone_submitted" | "milestone_approved"
  | "dispute_raised" | "dispute_resolved"
  | "review_received" | "team_invite"
  | "referral_signup" | "assessment_passed" | "job_posted"
  | "payment_confirmed" | "booking_confirmed" | "job_completed" | "price_target_alert"
  | "job_cancelled" | "job_completed_summary";

interface EmailMeta {
  jobId?: string;
  bidId?: string;
  milestoneId?: string;
  transactionId?: string;
  teamId?: string;
  reviewId?: string;
  assessmentId?: string;
}

// ── Dedup: check if email was already sent ─────────────────────────
async function isDuplicate(key: string): Promise<boolean> {
  try {
    const db = await getDb();
    const existing = await db.collection("email_logs").findOne({
      idempotencyKey: key,
      status: "sent",
    });
    return !!existing;
  } catch {
    return false; // fail open — send the email if DB check fails
  }
}

// ── Log every email attempt to MongoDB ─────────────────────────────
async function logEmail(params: {
  to: string;
  recipientId?: string;
  emailType: EmailType;
  subject: string;
  metadata: EmailMeta;
  idempotencyKey: string;
  status: "sent" | "failed" | "skipped";
  resendId?: string | null;
  error?: string | null;
}) {
  try {
    const db = await getDb();
    await db.collection("email_logs").insertOne({
      ...params,
      resendId: params.resendId ?? null,
      error: params.error ?? null,
      createdAt: new Date().toISOString(),
      sentAt: params.status === "sent" ? new Date().toISOString() : null,
    });
  } catch (err) {
    console.error("[Email Log] Failed to write log:", err);
  }
}

// ── Core send wrapper with tracking ────────────────────────────────
async function trackedSend(opts: {
  to: string;
  recipientId?: string;
  emailType: EmailType;
  subject: string;
  html: string;
  idempotencyKey: string;
  metadata: EmailMeta;
}) {
  // 1. Dedup check
  if (await isDuplicate(opts.idempotencyKey)) {
    console.log(`[Email] Skipped (duplicate) → ${opts.emailType}:${opts.to}`);
    await logEmail({ ...opts, status: "skipped", error: "duplicate" });
    return;
  }

  // 2. Send via Resend
  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    const resendId = (result as { data?: { id?: string } })?.data?.id
      ?? (result as { id?: string })?.id ?? null;
    console.log(`[Email] ${opts.emailType} sent → ${opts.to} (${resendId})`);
    await logEmail({ ...opts, status: "sent", resendId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Email] ${opts.emailType} failed → ${opts.to}:`, msg);
    await logEmail({ ...opts, status: "failed", error: msg });
  }
}

// ── Dark-themed HTML wrapper matching GeekBid's design system ──────
function wrapHtml(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#FCFAF4;font-family:'Inter','Segoe UI',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FCFAF4;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FCFAF4;border-radius:16px;border:1px solid #E4DDD0;overflow:hidden;">
          <!-- Logo -->
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <div style="font-size:28px;font-weight:800;letter-spacing:-0.5px;">
                <span style="color:#182739;">Geek</span><span style="color:#C8923D;">Bid</span>
              </div>
              <div style="color:#7B8694;font-size:12px;margin-top:4px;letter-spacing:0.5px;">WHERE CODE MEETS OPPORTUNITY</div>
            </td>
          </tr>
          <!-- Divider -->
          <tr><td style="padding:16px 32px 0;"><div style="border-top:1px solid #1E1E2A;"></div></td></tr>
          <!-- Content -->
          <tr>
            <td style="padding:24px 32px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #1E1E2A;text-align:center;">
              <p style="color:#7B8694;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} GeekBid — Adaptive freelance marketplace
              </p>
              <p style="color:#7B8694;font-size:11px;margin:8px 0 0;">
                <a href="${APP_URL}" style="color:#C8923D;text-decoration:none;">geekbid.io</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}/feed" style="color:#7B8694;text-decoration:none;">Browse Jobs</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}/settings" style="color:#7B8694;text-decoration:none;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Reusable components ────────────────────────────────────────────
function ctaButton(text: string, url: string): string {
  return `
    <div style="text-align:center;margin:28px 0 8px;">
      <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#182739,#1D3045);color:#FFFFFF;font-weight:700;font-size:14px;padding:14px 36px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;">
        ${text}
      </a>
    </div>`;
}

function infoCard(rows: [string, string][]): string {
  const rowsHtml = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="color:#7B8694;font-size:13px;padding:8px 12px;border-bottom:1px solid #E4DDD0;">${label}</td>
        <td style="color:#182739;font-size:13px;padding:8px 12px;text-align:right;font-weight:600;border-bottom:1px solid #E4DDD0;">${value}</td>
      </tr>`
    )
    .join("");

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FCFAF4;border-radius:12px;overflow:hidden;margin:20px 0;">
      ${rowsHtml}
    </table>`;
}

function heading(text: string): string {
  return `<h1 style="color:#182739;font-size:22px;font-weight:700;margin:0 0 8px;letter-spacing:-0.3px;">${text}</h1>`;
}

function subtext(text: string): string {
  return `<p style="color:#7B8694;font-size:14px;line-height:1.7;margin:0 0 4px;">${text}</p>`;
}

function highlight(text: string): string {
  return `<strong style="color:#C8923D;">${text}</strong>`;
}

function userName(text: string): string {
  return `<strong style="color:#182739;">${text}</strong>`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. WELCOME EMAIL — after user registration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendWelcomeEmail(to: string, name: string, role: string, userId?: string) {
  const isFreelancer = role === "freelancer";
  const subject = `Welcome to GeekBid, ${name}! 🚀`;
  await trackedSend({
    to, recipientId: userId, emailType: "welcome", subject,
    idempotencyKey: `welcome:${userId ?? to}`, metadata: {},
    html: wrapHtml("Welcome to GeekBid", `
      ${heading(`Welcome aboard, ${name}!`)}
      ${subtext(`Your account is live. You signed up as a ${highlight(isFreelancer ? "Freelancer" : "Client")}.`)}
      ${subtext(isFreelancer
        ? "GeekBid's adaptive pricing means better rates as you bid smart. Build your reputation, earn more."
        : "Post jobs with Dutch auction pricing — watch prices drop until a developer accepts. Save on every hire."
      )}
      ${infoCard(isFreelancer
        ? [["🎯 Step 1", "Complete your profile & skills"], ["🔍 Step 2", "Browse jobs in the feed"], ["💰 Step 3", "Place your first counter-bid"], ["⭐ Step 4", "Deliver & earn your GeekScore"]]
        : [["📝 Step 1", "Post your first job"], ["📉 Step 2", "Set adaptive or fixed pricing"], ["👥 Step 3", "Review bids from top talent"], ["✅ Step 4", "Award & pay via milestones"]]
      )}
      ${ctaButton(isFreelancer ? "Browse Open Jobs →" : "Post Your First Job →", `${APP_URL}/${isFreelancer ? "feed" : "post-job"}`)}
    `),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. NEW BID NOTIFICATION — client gets notified
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendNewBidEmail(to: string, clientName: string, freelancerName: string, jobTitle: string, bidPrice: number, jobId: string, bidId?: string) {
  const subject = `💼 New bid: $${bidPrice} on "${jobTitle}"`;
  await trackedSend({
    to, emailType: "new_bid", subject,
    idempotencyKey: `new_bid:${jobId}:${freelancerName}`, metadata: { jobId, bidId },
    html: wrapHtml("New Bid Received", `
      ${heading("New bid on your job!")}
      ${subtext(`Hey ${clientName}, ${userName(freelancerName)} placed a counter-bid on your listing.`)}
      ${infoCard([["📋 Job", jobTitle], ["💵 Bid Amount", `$${bidPrice.toLocaleString()}`], ["👤 Bidder", freelancerName], ["⏰ Time", new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })]])}
      ${subtext("Review the bid and compare it with the current adaptive price to decide.")}
      ${ctaButton("View All Bids →", `${APP_URL}/jobs/${jobId}`)}
    `),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. DIRECT OFFER — freelancer gets notified
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendDirectOfferEmail(to: string, freelancerName: string, jobTitle: string, price: number, jobId: string) {
  const subject = `🎯 Direct hire offer: "${jobTitle}" — $${price}`;
  await trackedSend({
    to, emailType: "direct_offer", subject,
    idempotencyKey: `direct_offer:${jobId}`, metadata: { jobId },
    html: wrapHtml("Direct Hire Offer", `
      ${heading("You've got a direct offer! 🎯")}
      ${subtext(`${freelancerName}, a client specifically wants ${highlight("you")} for this project. No auction, no competition.`)}
      ${infoCard([["📋 Project", jobTitle], ["💰 Offered Price", `$${price.toLocaleString()}`], ["🔒 Type", "Direct Hire — Fixed Price"], ["📅 Response Window", "7 days"]])}
      ${subtext("Direct offers are only available to freelancers with a GeekScore above 500.")}
      ${ctaButton("Review This Offer →", `${APP_URL}/jobs/${jobId}`)}
    `),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. OFFER RESPONSE — client gets notified freelancer accepted/declined
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendOfferResponseEmail(to: string, clientName: string, freelancerName: string, jobTitle: string, response: "accepted" | "declined", price: number, jobId: string) {
  const accepted = response === "accepted";
  const subject = accepted
    ? `✅ ${freelancerName} accepted your offer on "${jobTitle}"`
    : `❌ ${freelancerName} declined your offer on "${jobTitle}"`;
  await trackedSend({
    to, emailType: "offer_response", subject,
    idempotencyKey: `offer_response:${jobId}`, metadata: { jobId },
    html: wrapHtml("Offer Response", `
      ${heading(accepted ? "Your offer was accepted! ✅" : "Offer declined ❌")}
      ${subtext(`${clientName}, ${userName(freelancerName)} has ${accepted ? "accepted" : "declined"} your direct offer.`)}
      ${infoCard([["📋 Job", jobTitle], ["💰 Price", `$${price.toLocaleString()}`], ["📌 Status", accepted ? "Accepted — Escrow Created" : "Declined"]])}
      ${subtext(accepted ? "Funds are now held in escrow. The freelancer will begin work shortly." : "You can send an offer to another freelancer or post the job publicly.")}
      ${ctaButton(accepted ? "View Project →" : "Find Another Dev →", `${APP_URL}/jobs/${jobId}`)}
    `),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. JOB ACCEPTED — client gets notified
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendJobAcceptedEmail(to: string, clientName: string, freelancerName: string, jobTitle: string, finalPrice: number, jobId: string) {
  const subject = `✅ "${jobTitle}" accepted at $${finalPrice}`;
  await trackedSend({
    to, emailType: "job_accepted", subject,
    idempotencyKey: `job_accepted:${jobId}`, metadata: { jobId },
    html: wrapHtml("Job Accepted", `
      ${heading("Your job has been accepted! ✅")}
      ${subtext(`${clientName}, ${userName(freelancerName)} accepted your job at the current adaptive price.`)}
      ${infoCard([["📋 Job", jobTitle], ["💰 Final Price", `$${finalPrice.toLocaleString()}`], ["🛡️ Escrow", "Funds are held securely"], ["👤 Developer", freelancerName]])}
      ${subtext("The payment is held in escrow and will be released when you approve the deliverables.")}
      ${ctaButton("View Project →", `${APP_URL}/jobs/${jobId}`)}
    `),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. MILESTONE APPROVED — freelancer gets notified
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendMilestoneApprovedEmail(to: string, freelancerName: string, milestoneTitle: string, amount: number, jobTitle: string, milestoneId?: string) {
  const subject = `💰 Milestone approved: $${amount} for "${milestoneTitle}"`;
  await trackedSend({
    to, emailType: "milestone_approved", subject,
    idempotencyKey: `milestone_approved:${milestoneId ?? milestoneTitle}`, metadata: { milestoneId },
    html: wrapHtml("Milestone Approved", `
      ${heading("Milestone approved! 💰")}
      ${subtext(`${freelancerName}, the client has approved your milestone delivery.`)}
      ${infoCard([["📋 Job", jobTitle], ["🏁 Milestone", milestoneTitle], ["💵 Amount", `$${amount.toLocaleString()}`], ["✅ Status", "Approved — Payment Processing"]])}
      ${subtext("The funds from escrow are being released to your account. Keep up the excellent work!")}
      ${ctaButton("View Earnings →", `${APP_URL}/earnings`)}
    `),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. DISPUTE EMAIL — other party gets notified
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendDisputeEmail(to: string, recipientName: string, jobTitle: string, reason: string, transactionId?: string) {
  const subject = `⚠️ Dispute filed on "${jobTitle}"`;
  await trackedSend({
    to, emailType: "dispute_raised", subject,
    idempotencyKey: `dispute_raised:${transactionId ?? jobTitle}`, metadata: { transactionId },
    html: wrapHtml("Dispute Opened", `
      ${heading("A dispute has been opened ⚠️")}
      ${subtext(`${recipientName}, a dispute has been filed on a project you're involved with.`)}
      ${infoCard([["📋 Job", jobTitle], ["📝 Reason", reason || "Not specified"], ["🔍 Status", "Under Review"], ["⏱️ Filed", new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })]])}
      ${subtext("Our team will review the dispute and may reach out to both parties.")}
      ${ctaButton("View My Jobs →", `${APP_URL}/my-jobs`)}
    `),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. TEAM INVITE — invited user gets notified
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendTeamInviteEmail(to: string, teamName: string, inviterName: string, teamId?: string) {
  const subject = `👥 You're invited to join "${teamName}" on GeekBid`;
  await trackedSend({
    to, emailType: "team_invite", subject,
    idempotencyKey: `team_invite:${teamId ?? teamName}:${to}`, metadata: { teamId },
    html: wrapHtml("Team Invitation", `
      ${heading("You've been invited to a team! 👥")}
      ${subtext(`${userName(inviterName)} wants you on their team.`)}
      ${infoCard([["🏢 Team", teamName], ["👤 Invited By", inviterName], ["🤝 Role", "Team Member"]])}
      ${subtext("As a team member, you'll collaborate on jobs, share clients, and track collective earnings.")}
      ${ctaButton("View Invitation →", `${APP_URL}/team`)}
    `),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. NEW REVIEW — reviewed user gets notified
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendNewReviewEmail(to: string, revieweeName: string, reviewerName: string, rating: number, comment: string, jobTitle: string, reviewId?: string) {
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  const subject = `⭐ New ${rating}-star review on "${jobTitle}"`;
  await trackedSend({
    to, emailType: "review_received", subject,
    idempotencyKey: `review:${reviewId ?? `${jobTitle}:${reviewerName}`}`, metadata: { reviewId },
    html: wrapHtml("New Review", `
      ${heading("You received a review! ⭐")}
      ${subtext(`${revieweeName}, ${userName(reviewerName)} left you a review on a completed project.`)}
      <div style="text-align:center;margin:20px 0;"><span style="color:#F59E0B;font-size:32px;letter-spacing:4px;">${stars}</span></div>
      ${comment ? `<div style="background:#FCFAF4;border-radius:12px;padding:16px 20px;margin:16px 0;border-left:3px solid #C8923D;"><p style="color:#182739;font-size:14px;font-style:italic;margin:0;line-height:1.6;">"${comment}"</p><p style="color:#7B8694;font-size:12px;margin:10px 0 0;">— ${reviewerName} on "${jobTitle}"</p></div>` : ""}
      ${subtext("Reviews contribute to your GeekScore and help you land more projects.")}
      ${ctaButton("View Your Profile →", `${APP_URL}/profile`)}
    `),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 10. REFERRAL SIGNUP — referrer gets notified
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendReferralSignupEmail(to: string, referrerName: string, referredName: string) {
  const subject = `🎁 ${referredName} joined GeekBid with your referral!`;
  await trackedSend({
    to, emailType: "referral_signup", subject,
    idempotencyKey: `referral:${to}:${referredName}`, metadata: {},
    html: wrapHtml("Referral Signup", `
      ${heading("Your referral signed up! 🎁")}
      ${subtext(`${referrerName}, ${highlight(referredName)} just joined GeekBid using your referral link.`)}
      ${infoCard([["👤 New User", referredName], ["✅ Status", "Signed Up"], ["🎁 Referral Credit", "Pending — credited after first job"]])}
      ${subtext("Keep sharing your referral link — the more developers you bring in, the more credits you earn.")}
      ${ctaButton("View Referral Dashboard →", `${APP_URL}/profile`)}
    `),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 11. MILESTONE SUBMITTED — client gets notified
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendMilestoneSubmittedEmail(to: string, clientName: string, freelancerName: string, milestoneTitle: string, amount: number, jobTitle: string, milestoneId?: string) {
  const subject = `📦 Milestone delivered: "${milestoneTitle}" ready for review`;
  await trackedSend({
    to, emailType: "milestone_submitted", subject,
    idempotencyKey: `milestone_submitted:${milestoneId ?? milestoneTitle}`, metadata: { milestoneId },
    html: wrapHtml("Milestone Submitted", `
      ${heading("Milestone submitted for review 📦")}
      ${subtext(`${clientName}, ${userName(freelancerName)} has completed and submitted a milestone for your review.`)}
      ${infoCard([["📋 Job", jobTitle], ["🏁 Milestone", milestoneTitle], ["💵 Amount", `$${amount.toLocaleString()}`], ["⏳ Action Needed", "Review & Approve"]])}
      ${subtext("Please review the deliverables and approve the milestone to release the escrowed payment.")}
      ${ctaButton("Review Milestone →", `${APP_URL}/my-jobs`)}
    `),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 12. ESCROW RELEASED — freelancer gets paid
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendEscrowReleasedEmail(to: string, freelancerName: string, amount: number, jobTitle: string, transactionId: string) {
  const subject = `💸 Payment released: $${amount} for "${jobTitle}"`;
  await trackedSend({
    to, emailType: "escrow_released", subject,
    idempotencyKey: `escrow_released:${transactionId}`, metadata: { transactionId },
    html: wrapHtml("Payment Released", `
      ${heading("Payment released! 💸")}
      ${subtext(`${freelancerName}, the client has released the escrowed funds for your work.`)}
      ${infoCard([["📋 Job", jobTitle], ["💵 Amount", `$${amount.toLocaleString()}`], ["✅ Status", "Released to your account"], ["📅 Date", new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })]])}
      ${subtext("Great work! Keep delivering quality to maintain your GeekScore.")}
      ${ctaButton("View Earnings →", `${APP_URL}/earnings`)}
    `),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 13. ASSESSMENT PASSED — freelancer earns a badge
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendAssessmentPassedEmail(to: string, name: string, skill: string, score: number, assessmentId: string) {
  const subject = `🏆 You passed the ${skill} assessment!`;
  await trackedSend({
    to, emailType: "assessment_passed", subject,
    idempotencyKey: `assessment_passed:${assessmentId}:${to}`, metadata: { assessmentId },
    html: wrapHtml("Assessment Passed", `
      ${heading(`You're now ${skill}-verified! 🏆`)}
      ${subtext(`Congratulations ${name}, you passed the ${highlight(skill)} skill assessment.`)}
      ${infoCard([["🧠 Skill", skill], ["📊 Score", `${score}%`], ["⭐ GeekScore Bonus", "+50 points"], ["🏅 Badge", `${skill} Verified`]])}
      ${subtext("Your verified badge is now visible on your profile. Clients prefer verified freelancers — expect more offers!")}
      ${ctaButton("View Your Profile →", `${APP_URL}/profile`)}
    `),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 14. DISPUTE RESOLVED — both parties notified
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendDisputeResolvedEmail(to: string, name: string, jobTitle: string, resolution: string, transactionId?: string) {
  const subject = `✅ Dispute resolved on "${jobTitle}"`;
  await trackedSend({
    to, emailType: "dispute_resolved", subject,
    idempotencyKey: `dispute_resolved:${transactionId ?? jobTitle}:${to}`, metadata: { transactionId },
    html: wrapHtml("Dispute Resolved", `
      ${heading("Dispute resolved ✅")}
      ${subtext(`${name}, the dispute on your project has been reviewed and resolved by our team.`)}
      ${infoCard([["📋 Job", jobTitle], ["📌 Resolution", resolution || "See dashboard"], ["🔍 Status", "Closed"]])}
      ${subtext("If you have further concerns, you can raise a new dispute from your jobs dashboard.")}
      ${ctaButton("View My Jobs →", `${APP_URL}/my-jobs`)}
    `),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 15. JOB POSTED CONFIRMATION — client gets receipt after posting a job
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendJobPostedEmail(
  to: string, clientName: string, jobTitle: string, startingPrice: number,
  minimumPrice: number, pricingMode: string, deadline: string, category: string, jobId: string
) {
  const subject = `📝 Your job "${jobTitle}" is now live on GeekBid`;
  await trackedSend({
    to, emailType: "job_posted", subject,
    idempotencyKey: `job_posted:${jobId}`, metadata: { jobId },
    html: wrapHtml("Job Posted", `
      ${heading(`Your job is live, ${clientName}! 🚀`)}
      ${subtext(`"${highlight(jobTitle)}" has been published and is now visible to thousands of developers on GeekBid.`)}
      ${infoCard([
        ["📋 Job Title", jobTitle],
        ["💰 Starting Price", `$${startingPrice.toLocaleString()}`],
        ["📉 Floor Price", `$${minimumPrice.toLocaleString()}`],
        ["⚙️ Pricing Mode", pricingMode === "fixed" ? "Dutch Auction (Fixed Decay)" : "Adaptive (Demand-Driven)"],
        ["📁 Category", category],
        ["⏰ Deadline", new Date(deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })],
      ])}
      ${subtext(pricingMode === "adaptive"
        ? "With adaptive pricing, the price adjusts based on real demand — more bids push the price down faster. You'll be notified when freelancers start bidding."
        : "With Dutch auction pricing, the price automatically decreases over time until a developer accepts or it reaches your floor price."
      )}
      ${ctaButton("View Your Job →", `${APP_URL}/jobs/${jobId}`)}
    `),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 16. PAYMENT / ESCROW CONFIRMATION — client gets receipt after payment
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendPaymentConfirmationEmail(
  to: string, clientName: string, amount: number, currency: string,
  jobTitle: string, transactionId: string, isMock: boolean
) {
  const subject = `💳 Payment of ${currency} ${amount.toLocaleString()} confirmed — escrow held`;
  const rows: [string, string][] = [
    ["💳 Amount", `${currency} ${amount.toLocaleString()}`],
    ["📋 Project", jobTitle || "—"],
    ["🔒 Escrow Status", "Funds Held Securely"],
    ["🧾 Transaction ID", transactionId.slice(0, 12) + "..."],
  ];
  if (isMock) rows.push(["⚠️ Mode", "Test/Sandbox"]);
  await trackedSend({
    to, emailType: "payment_confirmed", subject,
    idempotencyKey: `payment_confirmed:${transactionId}`, metadata: { transactionId },
    html: wrapHtml("Payment Confirmed", `
      ${heading(`Payment received, ${clientName}! 🔒`)}
      ${subtext(`Your payment has been verified and the funds are now held securely in GeekBid escrow.`)}
      ${infoCard(rows)}
      ${subtext("The funds will be released to the freelancer only after you approve the delivered work. You maintain full control.")}
      ${ctaButton("View Transactions →", `${APP_URL}/transactions`)}
    `),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 17. BOOKING CONFIRMATION — freelancer gets confirmation after accepting a job
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendBookingConfirmationEmail(
  to: string, freelancerName: string, clientName: string,
  jobTitle: string, finalPrice: number, escrowAmount: number, jobId: string
) {
  const platformFee = Number((finalPrice * 0.1).toFixed(2));
  const youEarn = Number((finalPrice - platformFee).toFixed(2));
  const subject = `🎉 You've been booked! "${jobTitle}" — $${finalPrice.toLocaleString()}`;
  await trackedSend({
    to, emailType: "booking_confirmed", subject,
    idempotencyKey: `booking_confirmed:${jobId}:${to}`, metadata: { jobId },
    html: wrapHtml("Booking Confirmed", `
      ${heading(`Congrats ${freelancerName}, you're booked! 🎉`)}
      ${subtext(`You accepted "${highlight(jobTitle)}" posted by ${highlight(clientName)}. The client's payment is now held in escrow — start delivering!`)}
      ${infoCard([
        ["📋 Project", jobTitle],
        ["👤 Client", clientName],
        ["💰 Agreed Price", `$${finalPrice.toLocaleString()}`],
        ["🔒 Escrow Held", `$${escrowAmount.toLocaleString()}`],
        ["📊 Platform Fee (10%)", `$${platformFee.toLocaleString()}`],
        ["💵 You'll Earn", `$${youEarn.toLocaleString()}`],
      ])}
      ${subtext("Next steps: Check if the client has set up milestones. If not, coordinate via chat and start working towards the first deliverable.")}
      ${ctaButton("View Project →", `${APP_URL}/jobs/${jobId}`)}
    `),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 18. JOB COMPLETED SUMMARY — client gets summary after releasing escrow
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendJobCompletedEmail(
  to: string, clientName: string, freelancerName: string,
  jobTitle: string, totalPaid: number, platformFee: number, transactionId: string
) {
  const subject = `✅ Project "${jobTitle}" completed — receipt inside`;
  await trackedSend({
    to, emailType: "job_completed", subject,
    idempotencyKey: `job_completed:${transactionId}:${to}`, metadata: { transactionId },
    html: wrapHtml("Project Completed", `
      ${heading(`Project completed! 🏁`)}
      ${subtext(`${clientName}, you've released escrow for "${highlight(jobTitle)}" — the freelancer has been paid.`)}
      ${infoCard([
        ["📋 Project", jobTitle],
        ["👤 Freelancer", freelancerName],
        ["💰 Total Paid", `$${totalPaid.toLocaleString()}`],
        ["📊 Platform Fee", `$${platformFee.toLocaleString()}`],
        ["💸 Freelancer Received", `$${(totalPaid - platformFee).toLocaleString()}`],
        ["✅ Status", "Escrow Released"],
      ])}
      ${subtext("How was your experience? Leaving a review helps the freelancer build their reputation and helps other clients make informed decisions.")}
      ${ctaButton("Leave a Review →", `${APP_URL}/my-jobs`)}
    `),
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 19. PRICE TARGET ALERT — client gets notified when a bid is near their floor
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function sendPriceTargetAlertEmail(
  to: string, clientName: string, freelancerName: string,
  jobTitle: string, bidPrice: number, minimumPrice: number, jobId: string, bidId: string
) {
  const percentOfFloor = ((bidPrice / minimumPrice) * 100).toFixed(0);
  const subject = `🎯 A bid near your target just came in for "${jobTitle}"!`;
  await trackedSend({
    to, emailType: "price_target_alert", subject,
    idempotencyKey: `price_target:${jobId}:${bidId}`, metadata: { jobId, bidId },
    html: wrapHtml("Price Target Alert", `
      ${heading(`Bid alert! 🎯`)}
      ${subtext(`${clientName}, a counter-bid close to your budget floor just came in for "${highlight(jobTitle)}".`)}
      ${infoCard([
        ["💰 Bid Amount", `$${bidPrice.toLocaleString()}`],
        ["📉 Your Floor Price", `$${minimumPrice.toLocaleString()}`],
        ["📊 % of Floor", `${percentOfFloor}%`],
        ["👤 Bidder", freelancerName],
      ])}
      ${subtext("This bid is very close to your target price. Review the freelancer's profile and consider accepting before someone else does!")}
      ${ctaButton("Review This Bid →", `${APP_URL}/jobs/${jobId}`)}
    `),
  });
}

// ── P1: Job Cancelled Email ────────────────────────────────────────────────
export async function sendJobCancelledEmail(
  freelancerEmail: string,
  freelancerName: string,
  jobTitle: string
): Promise<void> {
  const key = `job_cancelled:${jobTitle}:${freelancerEmail}`;
  await trackedSend({
    to: freelancerEmail,
    emailType: "job_cancelled",
    subject: `Job Cancelled — "${jobTitle}"`,
    idempotencyKey: key,
    metadata: {},
    html: wrapHtml("Job Cancelled", `
      ${subtext(`Hi ${freelancerName}, a job you bid on has been cancelled by the client.`)}
      ${infoCard([
        ["📋 Job", jobTitle],
        ["📅 Status", "Cancelled"],
      ])}
      ${subtext("Browse other available jobs on the feed.")}
      ${ctaButton("Browse Jobs →", `${APP_URL}/feed`)}
    `),
  });
}

// ── P1: Job Completed Summary Email ───────────────────────────────────────
export async function sendJobCompletedSummaryEmail(
  clientEmail: string,
  clientName: string,
  freelancerEmail: string,
  freelancerName: string,
  jobTitle: string,
  finalPrice: number
): Promise<void> {
  const key = `job_completed_summary:${jobTitle}:${clientEmail}`;
  // Email client
  await trackedSend({
    to: clientEmail,
    emailType: "job_completed_summary",
    subject: `✅ Project Complete — "${jobTitle}"`,
    idempotencyKey: key,
    metadata: {},
    html: wrapHtml("Project Complete", `
      ${subtext(`Hi ${clientName}, your project has been marked complete. Great work!`)}
      ${infoCard([
        ["📋 Project", jobTitle],
        ["💰 Final Price", `$${finalPrice.toLocaleString()}`],
        ["🤝 Freelancer", freelancerName],
        ["📅 Status", "Completed"],
      ])}
      ${subtext("Don't forget to leave a review for your freelancer.")}
      ${ctaButton("Leave a Review →", `${APP_URL}/feed`)}
    `),
  });
  // Email freelancer
  await trackedSend({
    to: freelancerEmail,
    emailType: "job_completed_summary",
    subject: `✅ Project Complete — "${jobTitle}"`,
    idempotencyKey: `${key}:freelancer`,
    metadata: {},
    html: wrapHtml("Project Complete", `
      ${subtext(`Hi ${freelancerName}, the client has marked "${jobTitle}" as complete. Congratulations!`)}
      ${infoCard([
        ["📋 Project", jobTitle],
        ["💰 Earned", `$${finalPrice.toLocaleString()}`],
        ["👤 Client", clientName],
      ])}
      ${subtext("Your GeekScore™ has been updated. Keep up the great work!")}
      ${ctaButton("View My Profile →", `${APP_URL}/profile`)}
    `),
  });
}

