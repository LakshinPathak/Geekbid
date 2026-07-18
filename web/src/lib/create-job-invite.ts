import { ObjectId, type Db } from "mongodb";
import { getPlanConfig } from "@/lib/plans";

export type CreateInviteErrorCode =
  | "missing_fields"
  | "duplicate"
  | "job_not_found"
  | "job_not_open"
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
  try {
    return await db.collection("jobs").findOne({ _id: new ObjectId(jobId) });
  } catch {
    return await db.collection("jobs").findOne({ _id: jobId });
  }
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
  if (jobDoc.clientId !== clientId) {
    return {
      ok: false,
      code: "forbidden",
      error: "Only the job's owner can invite freelancers to it",
      status: 403,
    };
  }

  const jobTitle = jobDoc.title ?? "a job";

  let client;
  try {
    client = await db.collection("users").findOne({ _id: new ObjectId(clientId) });
  } catch {
    client = await db.collection("users").findOne({ _id: clientId });
  }

  const config = getPlanConfig(client?.plan);
  if (client) {
    const limits = client.planLimits ?? {
      invitesSentThisMonth: 0,
      monthResetAt: new Date(0).toISOString(),
    };
    if (new Date(limits.monthResetAt) < new Date()) {
      await db.collection("users").updateOne(
        { _id: client._id },
        {
          $set: {
            "planLimits.jobsPostedThisMonth": 0,
            "planLimits.bidsPlacedThisMonth": 0,
            "planLimits.invitesSentThisMonth": 0,
            "planLimits.monthResetAt": new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
          },
        }
      );
    }
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
