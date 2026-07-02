const { createApp } = require('../../common/app');
const { ok, fail } = require('../../common/response');
const { getDb } = require('../../common/db');
const { validateString, validatePositiveNumber, stripHtml } = require('../../common/validate');
const { asyncHandler } = require('../../common/errorHandler');
const { requireAuth, optionalAuth } = require('../../common/authMiddleware');
const { ObjectId } = require('mongodb');

const app = createApp();

/** Helper: build ObjectId filter safely */
const toObjectIdFilter = (id) => {
  try {
    return { _id: new ObjectId(id) };
  } catch {
    return { _id: id };
  }
};

// --- READ: List jobs (public feed; invite-only jobs hidden from outsiders) ---
// optionalAuth: anonymous callers see only public jobs; a signed-in caller also
// sees their own invite-only jobs and any they were invited to; admins see all.

app.get('/v1/jobs', optionalAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const { category } = req.query || {};

  const filter = {};
  if (category && category !== 'all') filter.category = category;

  const callerId = req.user ? req.user.userId : null;
  const isAdmin = req.user ? req.user.role === 'admin' : false;

  if (!isAdmin) {
    const orClauses = [{ visibility: { $ne: 'invite_only' } }];
    if (callerId) {
      orClauses.push({ visibility: 'invite_only', clientId: callerId });
      const invitedJobIds = await db.collection('invites').distinct('jobId', { freelancerId: callerId });
      const invitedObjectIds = invitedJobIds
        .map((jid) => { try { return new ObjectId(jid); } catch { return null; } })
        .filter(Boolean);
      if (invitedObjectIds.length > 0) {
        orClauses.push({ visibility: 'invite_only', _id: { $in: invitedObjectIds } });
      }
    }
    filter.$or = orClauses;
  }

  const jobs = await db.collection('jobs')
    .find(filter)
    .sort({ featured: -1, postedAt: -1 })
    .limit(100)
    .toArray();

  const normalized = jobs.map((j) => ({ ...j, id: j._id.toString(), _id: j._id.toString() }));
  return ok(res, { jobs: normalized });
}));

// --- READ: Get single job by ID ---

app.get('/v1/jobs/:id', asyncHandler(async (req, res) => {
  const db = await getDb();
  const job = await db.collection('jobs').findOne(toObjectIdFilter(req.params.id));
  if (!job) return fail(res, 'ERR_NOT_FOUND', 'Job not found', 404);

  return ok(res, { job: { ...job, id: job._id.toString(), _id: job._id.toString() } });
}));

// --- CREATE: Post a new job (client-only; plan-limit enforced atomically) ---
// Parity with the app's POST /api/jobs. The BFF fires the "job posted" email
// from the returned job; the transactional write lives here.

const VALID_CATEGORIES = ['ai_ml', 'web_dev', 'mobile', 'devops', 'security', 'data_eng', 'blockchain', 'design', 'qa', 'other'];

app.post('/v1/jobs', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'client') {
    return fail(res, 'ERR_FORBIDDEN', 'Only clients can post jobs', 403);
  }
  const body = req.body || {};
  if (!body.title) return fail(res, 'ERR_VALIDATION', 'Title required', 400);

  const jobCategory = VALID_CATEGORIES.includes(body.category) ? body.category : 'other';
  const db = await getDb();

  // Plan-limit: free plan = 3 jobs/month, enforced with an atomic cap-and-increment.
  const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.userId) });
  let jobQuotaReserved = false;
  if (user && (user.plan ?? 'free') === 'free') {
    const limits = user.planLimits ?? { jobsPostedThisMonth: 0, monthResetAt: new Date(0).toISOString() };
    if (new Date(limits.monthResetAt) < new Date()) {
      await db.collection('users').updateOne({ _id: user._id }, {
        $set: { 'planLimits.jobsPostedThisMonth': 0, 'planLimits.bidsPlacedThisMonth': 0, 'planLimits.monthResetAt': new Date(Date.now() + 30 * 24 * 3600000).toISOString() },
      });
    }
    const capped = await db.collection('users').findOneAndUpdate(
      { _id: user._id, $or: [{ 'planLimits.jobsPostedThisMonth': { $lt: 3 } }, { 'planLimits.jobsPostedThisMonth': { $exists: false } }] },
      { $inc: { 'planLimits.jobsPostedThisMonth': 1 } }
    );
    if (!capped) return fail(res, 'ERR_FORBIDDEN', 'Free plan limit: 3 jobs/month. Upgrade to Pro for unlimited.', 403);
    jobQuotaReserved = true;
  }

  const now = new Date().toISOString();
  const validVisibility = ['public', 'invite_only'];
  const doc = {
    clientId: req.user.userId,
    title: body.title,
    description: body.description ?? '',
    skillsRequired: body.skillsRequired ?? [],
    startingPrice: Number(body.startingPrice),
    minimumPrice: Number(body.minimumPrice),
    decayRatePerHour: Number(body.decayRatePerHour),
    estimatedHours: Number(body.estimatedHours),
    postedAt: now,
    deadlineAt: body.deadlineAt ?? new Date(Date.now() + 48 * 3600000).toISOString(),
    status: 'open',
    category: jobCategory,
    featured: false,
    visibility: validVisibility.includes(body.visibility) ? body.visibility : 'public',
    pricingMode: body.pricingMode === 'fixed' ? 'fixed' : 'adaptive',
    bidCount: 0,
    uniqueBidderCount: 0,
    lastBidAt: null,
    lowestCounterBid: null,
    priceHistory: [{ price: Number(body.startingPrice), at: now, event: 'posted' }],
  };

  const result = await db.collection('jobs').insertOne(doc);
  const jobId = result.insertedId.toString();
  if (!jobQuotaReserved) {
    await db.collection('users').updateOne({ _id: new ObjectId(req.user.userId) }, { $inc: { 'planLimits.jobsPostedThisMonth': 1 } });
  }

  return ok(res, { job: { ...doc, id: jobId, _id: jobId } }, undefined, 201);
}));

// --- UPDATE: Edit job (title, description, skills, deadline — only if still open) ---

app.patch('/v1/jobs/:id', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const updates = req.body || {};
  const filter = toObjectIdFilter(req.params.id);

  const job = await db.collection('jobs').findOne(filter);
  if (!job) return fail(res, 'ERR_NOT_FOUND', 'Job not found', 404);
  if (job.status !== 'open') return fail(res, 'ERR_INVALID_STATE', 'Cannot edit a non-open job', 409);
  if (req.user.role !== 'admin' && job.clientId.toString() !== req.user.userId) {
    return fail(res, 'ERR_FORBIDDEN', 'Cannot edit another user\'s job', 403);
  }

  const allowedFields = [
    'title', 'description', 'skillsRequired', 'startingPrice',
    'minimumPrice', 'decayRatePerHour', 'deadlineAt', 'estimatedHours',
    'visibility', 'status',
  ];

  const safeUpdates = {};
  for (const key of allowedFields) {
    if (key in updates) {
      safeUpdates[key] = typeof updates[key] === 'string' ? stripHtml(updates[key]) : updates[key];
    }
  }

  // Validate title if updating
  if (safeUpdates.title) {
    const titleCheck = validateString(safeUpdates.title, 'Title', { minLength: 5, maxLength: 200 });
    if (!titleCheck.valid) return fail(res, 'ERR_VALIDATION', titleCheck.error, 422);
  }

  if (Object.keys(safeUpdates).length === 0) {
    return fail(res, 'ERR_VALIDATION', 'No valid fields to update', 400);
  }

  safeUpdates.updatedAt = new Date();

  await db.collection('jobs').updateOne(filter, { $set: safeUpdates });
  return ok(res, { updated: Object.keys(safeUpdates).filter((k) => k !== 'updatedAt') });
}));

// --- DELETE: Remove a job (only if open, no bids accepted) ---

app.delete('/v1/jobs/:id', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const filter = toObjectIdFilter(req.params.id);

  const job = await db.collection('jobs').findOne(filter);
  if (!job) return fail(res, 'ERR_NOT_FOUND', 'Job not found', 404);
  if (job.status !== 'open') return fail(res, 'ERR_INVALID_STATE', 'Cannot delete a non-open job', 409);
  if (req.user.role !== 'admin' && job.clientId.toString() !== req.user.userId) {
    return fail(res, 'ERR_FORBIDDEN', 'Cannot delete another user\'s job', 403);
  }

  await db.collection('jobs').deleteOne(filter);

  // Also clean up any bids referencing this job
  await db.collection('bids').deleteMany({ jobId: req.params.id });

  return res.status(204).send();
}));

// --- Watchlist ---

app.post('/v1/jobs/:id/watch', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const userId = (req.body || {}).userId;
  if (userId) {
    try {
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $addToSet: { watchedJobs: new ObjectId(req.params.id) } }
      );
    } catch {
      // silently skip if IDs are invalid
    }
  }
  return ok(res, { watching: true }, undefined, 201);
}));

app.delete('/v1/jobs/:id/watch', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const userId = (req.body || {}).userId || (req.query || {}).userId;
  if (userId) {
    try {
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $pull: { watchedJobs: new ObjectId(req.params.id) } }
      );
    } catch {
      // silently skip
    }
  }
  return res.status(204).send();
}));

app.attachErrorHandler();

const port = Number(process.env.JOB_PORT || 3003);
app.listen(port, () => console.log(`[job-service] running on :${port}`));
