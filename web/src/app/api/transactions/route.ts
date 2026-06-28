import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendEscrowReleasedEmail, sendDisputeEmail, sendJobCompletedEmail } from "@/lib/email";

// GET /api/transactions (protected)
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const db = await getDb();
    const filter =
      auth.payload.role === "admin"
        ? {}
        : {
            $or: [
              { clientId: auth.payload.userId },
              { freelancerId: auth.payload.userId },
            ],
          };

    const txs = await db
      .collection("transactions")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json(
      txs.map((t) => ({ ...t, _id: t._id.toString(), id: t._id.toString() }))
    );
  } catch (err) {
    console.error("[Transactions GET Error]", err);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

// PATCH /api/transactions — release or dispute escrow (protected)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { transactionId, action, reason } = await req.json();

    if (!transactionId || !action) {
      return NextResponse.json(
        { error: "transactionId and action are required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    if (action === "release") {
      // Only client or admin can release
      if (!["client", "admin"].includes(auth.payload.role)) {
        return NextResponse.json(
          { error: "Only clients or admins can release escrow" },
          { status: 403 }
        );
      }

      await db.collection("transactions").updateOne(
        { _id: new ObjectId(transactionId) },
        {
          $set: {
            escrowStatus: "released",
            releasedAt: new Date().toISOString(),
            releasedBy: auth.payload.userId,
          },
        }
      );

      // Fire-and-forget: notify freelancer about payment release
      const tx = await db.collection("transactions").findOne({ _id: new ObjectId(transactionId) });
      const job = tx?.jobId ? await db.collection("jobs").findOne({ _id: new ObjectId(tx.jobId) }) : null;
      if (tx?.freelancerId) {
        const freelancer = await db.collection("users").findOne(
          { _id: new ObjectId(tx.freelancerId) },
          { projection: { email: 1, name: 1 } }
        );
        if (freelancer?.email) {
          sendEscrowReleasedEmail(
            freelancer.email, freelancer.name ?? "Freelancer",
            tx.netAmount ?? tx.grossAmount ?? 0,
            job?.title ?? "Your project", transactionId
          ).catch(() => {});
        }

        // Also send job completed summary to the client
        const client = await db.collection("users").findOne(
          { _id: new ObjectId(auth.payload.userId) },
          { projection: { email: 1, name: 1 } }
        );
        if (client?.email) {
          sendJobCompletedEmail(
            client.email, client.name ?? "Client",
            freelancer?.name ?? "Freelancer",
            job?.title ?? "Your project",
            tx.grossAmount ?? 0, tx.platformFee ?? 0,
            transactionId
          ).catch(() => {});
        }
      }

      return NextResponse.json({ ok: true, message: "Escrow released" });
    }

    if (action === "dispute") {
      await db.collection("transactions").updateOne(
        { _id: new ObjectId(transactionId) },
        { $set: { escrowStatus: "disputed" } }
      );
      const tx = await db.collection("transactions").findOne({ _id: new ObjectId(transactionId) });
      await db.collection("disputes").insertOne({
        transactionId,
        raisedBy: auth.payload.userId,
        reason: reason ?? "Quality dispute",
        status: "open",
        jobTitle: tx?.jobId ? (await db.collection("jobs").findOne({ _id: new ObjectId(tx.jobId) }))?.title : undefined,
        createdAt: new Date().toISOString(),
      });

      // Fire-and-forget: notify the other party
      if (tx) {
        const otherId = tx.clientId === auth.payload.userId ? tx.freelancerId : tx.clientId;
        if (otherId) {
          const other = await db.collection("users").findOne(
            { _id: new ObjectId(otherId) },
            { projection: { email: 1, name: 1 } }
          );
          const job = tx.jobId ? await db.collection("jobs").findOne({ _id: new ObjectId(tx.jobId) }) : null;
          if (other?.email) {
            sendDisputeEmail(
              other.email, other.name ?? "User",
              job?.title ?? "a project",
              reason ?? "Quality dispute",
              transactionId
            ).catch(() => {});
          }
        }
      }

      return NextResponse.json({ ok: true, message: "Dispute raised" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[Transactions PATCH Error]", err);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}
