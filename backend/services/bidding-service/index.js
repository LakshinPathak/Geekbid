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

// --- READ: Get all bids for a job ---

app.get('/v1/bids', asyncHandler(async (req, res) => {
  const db = await getDb();
  const { jobId, freelancerId, page = '1', limit = '20' } = req.query || {};

  const filter = {};
  if (jobId) filter.jobId = jobId;
  if (freelancerId) filter.freelancerId = freelancerId;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [bids, total] = await Promise.all([
    db.collection('bids').find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
    db.collection('bids').countDocuments(filter),
  ]);

  const normalized = bids.map((b) => ({
    ...b,
    id: b._id.toString(),
    _id: b._id.toString(),
    jobId: b.jobId?.toString(),
    freelancerId: b.freelancerId?.toString(),
  }));

  return ok(res, { bids: normalized }, { page: pageNum, limit: limitNum, total });
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
  const { job_id } = req.body || {};
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

  if (!payload.job_id) return fail(res, 'ERR_VALIDATION', 'job_id is required', 400);

  const priceCheck = validatePositiveNumber(payload.bid_price, 'Bid price');
  if (!priceCheck.valid) return fail(res, 'ERR_VALIDATION', priceCheck.error, 422);

  const db = await getDb();
  const job = await db.collection('jobs').findOne(toObjectIdFilter(payload.job_id));
  if (!job) return fail(res, 'ERR_NOT_FOUND', 'Job not found', 404);

  const bid = {
    jobId: payload.job_id,
    freelancerId: req.user.userId,
    bidType: 'counter',
    bidPrice: Number(payload.bid_price),
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
  if (updates.bid_price != null) {
    const priceCheck = validatePositiveNumber(updates.bid_price, 'Bid price');
    if (!priceCheck.valid) return fail(res, 'ERR_VALIDATION', priceCheck.error, 422);
    safeUpdates.bidPrice = Number(updates.bid_price);
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
