import { type Db } from "mongodb";
import { getPlanConfig } from "@/lib/plans";
import { idFilter } from "@/lib/mongo-id";
import { resetPlanLimitsIfStale } from "@/lib/reset-plan-limits";

export type CreateInviteErrorCode =
  | "missing_fields"
  | "duplicate"
  | "job_not_found"
  | "job_not_open"
  | "direct_offer_not_invitable"
  | "forbidden"
  | "quota_exceeded"
  | "insert_failed";

export interface CreateInviteSuccess {
  ok: true;
  invite: {
    clientId: string;
    freelancerId: string;
    jobId: string;
    status: string;
    createdAt: string;
    respondedAt: null;
    _id: string;
    id: string;
  };
  clientPlan: string;
}

export interface CreateInviteFailure {
  ok: false;
  code: CreateInviteErrorCode;
  error: string;
  status: 400 | 403 | 404 | 409 | 500;
}

export type CreateInviteResult = CreateInviteSuccess | CreateInviteFailure;

async function findJob(db: Db, jobId: string) {
  return await db.collection("jobs").findOne(idFilter(jobId));
}

/**
 * Shared invite creation used by POST /api/invites and smart-match batch.
 * Preserves quota increment, duplicate guard, and notification semantics.
 */
export async function createJobInvite(
  db: Db,
  clientId: string,
  freelancerId: string,
  jobId: string
): Promise<CreateInviteResult> {
  if (!freelancerId || !jobId) {
    return {
      ok: false,
      code: "missing_fields",
      error: "freelancerId and jobId required",
      status: 400,
    };
  }

  const existing = await db.collection("invites").findOne({ clientId, freelancerId, jobId });
  if (existing) {
    return {
      ok: false,
      code: "duplicate",
      error: "Invite already sent for this job",
      status: 409,
    };
  }

  const jobDoc = (await findJob(db, jobId)) as {
    title?: string;
    status?: string;
    clientId?: string;
    type?: string;
  } | null;

  if (!jobDoc) {
    return { ok: false, code: "job_not_found", error: "Job not found", status: 404 };
  }
  if (jobDoc.status !== "open") {
    return {
      ok: false,
      code: "job_not_open",
      error: "This job is no longer open for invites",
      status: 400,
    };
  }
  // Direct-offer jobs are exclusive to the one freelancer they were sent to
  // (offeredTo) and go through /api/jobs/offer-response — inviting someone
  // else to bid on one would let a second freelancer accept/bid on a job
  // meant only for the offered recipient. The FE already filters these out,
  // but this is the actual authorization boundary, not just a UI nicety.
  if (jobDoc.type === "direct_offer") {
    return {
      ok: false,
      code: "direct_offer_not_invitable",
      error: "This job is a direct offer and cannot be opened up via invite",
      status: 400,
    };
  }
  if (jobDoc.clientId !== clientId) {
    return {
      ok: false,
      code: "forbidden",
      error: "Only the job's owner can invite freelancers to it",
      status: 403,
    };
  }

  const jobTitle = jobDoc.title ?? "a job";

  const client = await db.collection("users").findOne(idFilter(clientId));

  const config = getPlanConfig(client?.plan);
  if (client) {
    const limits = client.planLimits ?? {
      invitesSentThisMonth: 0,
      monthResetAt: new Date(0).toISOString(),
    };
    await resetPlanLimitsIfStale(db, client._id, limits.monthResetAt);
    const capped = await db.collection("users").findOneAndUpdate(
      {
        _id: client._id,
        $or: [
          { "planLimits.invitesSentThisMonth": { $lt: config.limits.invitesPerMonth } },
          { "planLimits.invitesSentThisMonth": { $exists: false } },
        ],
      },
      { $inc: { "planLimits.invitesSentThisMonth": 1 } }
    );
    if (!capped) {
      return {
        ok: false,
        code: "quota_exceeded",
        error: `${config.name} plan limit: ${config.limits.invitesPerMonth} invites/month. Upgrade for more.`,
        status: 403,
      };
    }
  }

  const now = new Date().toISOString();
  const invite = {
    clientId,
    freelancerId,
    jobId,
    status: "pending",
    createdAt: now,
    respondedAt: null,
  };

  let result;
  try {
    result = await db.collection("invites").insertOne(invite);
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return {
        ok: false,
        code: "duplicate",
        error: "Invite already sent for this job",
        status: 409,
      };
    }
    return {
      ok: false,
      code: "insert_failed",
      error: "Failed to create invite",
      status: 500,
    };
  }

  await db.collection("notifications").insertOne({
    userId: freelancerId,
    type: "job_invite",
    title: `You've been invited to bid on "${jobTitle}"`,
    body: "A client wants you specifically for this project. Check it out!",
    jobId,
    isRead: false,
    createdAt: now,
  });

  return {
    ok: true,
    invite: {
      ...invite,
      _id: result.insertedId.toString(),
      id: result.insertedId.toString(),
    },
    clientPlan: client?.plan ?? "free",
  };
}
