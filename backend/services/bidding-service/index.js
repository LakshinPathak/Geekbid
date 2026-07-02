const { createServer } = require('http');
const { Server } = require('socket.io');
const { createApp } = require('../../common/app');
const { ok, fail } = require('../../common/response');
const { getDb } = require('../../common/db');
const { validatePositiveNumber, stripHtml } = require('../../common/validate');
const { asyncHandler } = require('../../common/errorHandler');
const { requireAuth } = require('../../common/authMiddleware');
const { ObjectId } = require('mongodb');

const app = createApp();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

/** Helper: build ObjectId filter safely */
const toObjectIdFilter = (id) => {
  try {
    return { _id: new ObjectId(id) };
  } catch {
    return { _id: id };
  }
};

const toObjectId = (id) => {
  try {
    return new ObjectId(id);
  } catch {
    return id;
  }
};

const computeCurrentPrice = (job) => {
  const elapsedHours = Math.max(
    (Date.now() - new Date(job.postedAt).getTime()) / (60 * 60 * 1000),
    0
  );
  return Math.max(
    job.startingPrice - job.decayRatePerHour * elapsedHours,
    job.minimumPrice
  );
};

// --- READ: bids (protected — bids carry freelancer ids + private messages) ---

app.get('/v1/bids', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const { jobId } = req.query || {};
  const filter = jobId ? { jobId } : {};

  const bids = await db.collection('bids')
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();

  const normalized = bids.map((b) => ({ ...b, id: b._id.toString(), _id: b._id.toString() }));
  return ok(res, { bids: normalized });
}));

// --- READ: the caller's own bid history, with job details joined ---

app.get('/v1/bids/my', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'freelancer' && req.user.role !== 'admin') {
    return fail(res, 'ERR_FORBIDDEN', 'Only freelancers can view their bid history', 403);
  }
  const db = await getDb();
  const bids = await db.collection('bids')
    .find({ freelancerId: req.user.userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  const jobObjectIds = [...new Set(bids.map((b) => b.jobId))]
    .map((jid) => { try { return new ObjectId(jid); } catch { return null; } })
    .filter(Boolean);
  const jobDocs = await db.collection('jobs').find({ _id: { $in: jobObjectIds } }).toArray();
  const jobsById = new Map(jobDocs.map((j) => [j._id.toString(), j]));

  const enriched = bids.map((bid) => {
    const job = jobsById.get(bid.jobId);
    return {
      ...bid,
      _id: bid._id.toString(),
      id: bid._id.toString(),
      job: job ? {
        _id: job._id.toString(), id: job._id.toString(),
        title: job.title, status: job.status, category: job.category,
        skillsRequired: job.skillsRequired, acceptedBy: job.acceptedBy,
        startingPrice: job.startingPrice, minimumPrice: job.minimumPrice,
        postedAt: job.postedAt, deadlineAt: job.deadlineAt,
      } : null,
    };
  });

  return ok(res, { bids: enriched });
}));

// --- READ: Get single bid by ID ---

app.get('/v1/bids/:id', asyncHandler(async (req, res) => {
  const db = await getDb();
  const bid = await db.collection('bids').findOne(toObjectIdFilter(req.params.id));
  if (!bid) return fail(res, 'ERR_NOT_FOUND', 'Bid not found', 404);

  return ok(res, {
    bid: { ...bid, id: bid._id.toString(), _id: bid._id.toString() },
  });
}));

// --- CREATE: Accept job at current price ---

app.post('/v1/bids/accept', requireAuth, asyncHandler(async (req, res) => {
  const body = req.body || {};
  const job_id = body.job_id || body.jobId;
  if (!job_id) return fail(res, 'ERR_VALIDATION', 'job_id is required', 400);

  const db = await getDb();
  const job = await db.collection('jobs').findOne(toObjectIdFilter(job_id));
  if (!job) return fail(res, 'ERR_NOT_FOUND', 'Job not found', 404);
  if (job.status !== 'open') return fail(res, 'ERR_INVALID_STATE', 'Job already closed', 409);

  const finalPrice = Number(computeCurrentPrice(job).toFixed(2));

  // Update job status
  await db.collection('jobs').updateOne(
    { _id: job._id },
    {
      $set: {
        status: 'accepted',
        acceptedBy: req.user.userId,
        acceptedAt: new Date().toISOString(),
        finalPrice,
        updatedAt: new Date(),
      },
    }
  );

  // Create bid record
  const bid = {
    jobId: job._id.toString(),
    freelancerId: req.user.userId,
    bidType: 'accept',
    bidPrice: finalPrice,
    createdAt: new Date().toISOString(),
  };
  const bidResult = await db.collection('bids').insertOne(bid);
  bid._id = bidResult.insertedId.toString();
  bid.id = bid._id;

  // Create transaction
  const platformFee = Number((finalPrice * 0.1).toFixed(2));
  const tx = {
    jobId: job._id.toString(),
    clientId: job.clientId,
    freelancerId: req.user.userId,
    grossAmount: finalPrice,
    platformFee,
    netAmount: Number((finalPrice - platformFee).toFixed(2)),
    escrowStatus: 'held',
    createdAt: new Date().toISOString(),
  };
  await db.collection('transactions').insertOne(tx);

  io.emit('job_accepted', {
    job_id: job._id.toString(),
    freelancer_id: req.user.userId,
    final_price: finalPrice,
  });

  return ok(res, { bid, final_price: finalPrice });
}));

// --- CREATE: Counter bid ---

app.post('/v1/bids/counter', requireAuth, asyncHandler(async (req, res) => {
  const payload = req.body || {};
  const jobId = payload.job_id || payload.jobId;
  const bidPrice = payload.bid_price ?? payload.bidPrice;

  if (!jobId) return fail(res, 'ERR_VALIDATION', 'job_id is required', 400);

  const priceCheck = validatePositiveNumber(bidPrice, 'Bid price');
  if (!priceCheck.valid) return fail(res, 'ERR_VALIDATION', priceCheck.error, 422);

  const db = await getDb();
  const job = await db.collection('jobs').findOne(toObjectIdFilter(jobId));
  if (!job) return fail(res, 'ERR_NOT_FOUND', 'Job not found', 404);

  const bid = {
    jobId: jobId,
    freelancerId: req.user.userId,
    bidType: 'counter',
    bidPrice: Number(bidPrice),
    message: stripHtml(payload.message || ''),
    createdAt: new Date().toISOString(),
  };

  const result = await db.collection('bids').insertOne(bid);
  bid._id = result.insertedId.toString();
  bid.id = bid._id;

  return ok(res, { bid }, undefined, 201);
}));

// --- UPDATE: Update a bid (only counter bids, before acceptance) ---

app.patch('/v1/bids/:id', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const filter = toObjectIdFilter(req.params.id);
  const updates = req.body || {};

  const bid = await db.collection('bids').findOne(filter);
  if (!bid) return fail(res, 'ERR_NOT_FOUND', 'Bid not found', 404);
  if (bid.bidType !== 'counter') return fail(res, 'ERR_INVALID_STATE', 'Only counter bids can be updated', 409);

  const safeUpdates = {};
  const rawPrice = updates.bid_price ?? updates.bidPrice;
  if (rawPrice != null) {
    const priceCheck = validatePositiveNumber(rawPrice, 'Bid price');
    if (!priceCheck.valid) return fail(res, 'ERR_VALIDATION', priceCheck.error, 422);
    safeUpdates.bidPrice = Number(rawPrice);
  }
  if (updates.message != null) {
    safeUpdates.message = stripHtml(updates.message);
  }

  if (Object.keys(safeUpdates).length === 0) {
    return fail(res, 'ERR_VALIDATION', 'No valid fields to update', 400);
  }

  safeUpdates.updatedAt = new Date();
  await db.collection('bids').updateOne(filter, { $set: safeUpdates });

  return ok(res, { updated: Object.keys(safeUpdates).filter((k) => k !== 'updatedAt') });
}));

// --- DELETE: Withdraw/delete a bid ---

app.delete('/v1/bids/:id', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const filter = toObjectIdFilter(req.params.id);

  const bid = await db.collection('bids').findOne(filter);
  if (!bid) return fail(res, 'ERR_NOT_FOUND', 'Bid not found', 404);
  if (bid.bidType === 'accept') return fail(res, 'ERR_INVALID_STATE', 'Cannot delete accepted bids', 409);

  await db.collection('bids').deleteOne(filter);
  return res.status(204).send();
}));

// Price decay broadcast
setInterval(async () => {
  try {
    const db = await getDb();
    const openJobs = await db.collection('jobs').find({ status: 'open' }).toArray();
    openJobs.forEach((job) => {
      const current = Number(computeCurrentPrice(job).toFixed(2));
      io.emit('price_update', {
        job_id: job._id.toString(),
        current_price: current,
      });
    });
  } catch (err) {
    console.error('[bidding-service] Price update error:', err.message);
  }
}, 15000);

io.on('connection', () => {});

app.attachErrorHandler();

const port = Number(process.env.BIDDING_PORT || 3004);
httpServer.listen(port, () => console.log(`[bidding-service] running on :${port}`));
