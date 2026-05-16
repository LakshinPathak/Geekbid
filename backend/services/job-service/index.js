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

// --- READ: List jobs (with filtering, sorting, pagination) ---

app.get('/v1/jobs', asyncHandler(async (req, res) => {
  const db = await getDb();
  const { status, skills, clientId, sort, page = '1', limit = '20' } = req.query || {};

  const filter = {};
  if (status) filter.status = status;
  if (clientId) filter.clientId = clientId;
  if (skills) {
    const skillList = Array.isArray(skills) ? skills : skills.split(',');
    filter.skillsRequired = { $in: skillList };
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  let sortObj = { postedAt: -1 };
  if (sort === 'price_high') sortObj = { startingPrice: -1 };
  if (sort === 'price_low') sortObj = { startingPrice: 1 };
  if (sort === 'deadline') sortObj = { deadlineAt: 1 };

  const [jobs, total] = await Promise.all([
    db.collection('jobs').find(filter).sort(sortObj).skip(skip).limit(limitNum).toArray(),
    db.collection('jobs').countDocuments(filter),
  ]);

  const normalized = jobs.map((j) => ({ ...j, id: j._id.toString(), _id: j._id.toString() }));
  return ok(res, { jobs: normalized }, { page: pageNum, limit: limitNum, total });
}));

// --- READ: Get single job by ID ---

app.get('/v1/jobs/:id', asyncHandler(async (req, res) => {
  const db = await getDb();
  const job = await db.collection('jobs').findOne(toObjectIdFilter(req.params.id));
  if (!job) return fail(res, 'ERR_NOT_FOUND', 'Job not found', 404);

  return ok(res, { job: { ...job, id: job._id.toString(), _id: job._id.toString() } });
}));

// --- CREATE: Post a new job ---

app.post('/v1/jobs', requireAuth, asyncHandler(async (req, res) => {
  const payload = req.body || {};

  const titleCheck = validateString(payload.title, 'Title', { minLength: 5, maxLength: 200 });
  if (!titleCheck.valid) return fail(res, 'ERR_VALIDATION', titleCheck.error, 422);

  if (payload.description) {
    const descCheck = validateString(payload.description, 'Description', { minLength: 0, maxLength: 5000 });
    if (!descCheck.valid) return fail(res, 'ERR_VALIDATION', descCheck.error, 422);
  }

  if (payload.startingPrice) {
    const priceCheck = validatePositiveNumber(payload.startingPrice, 'Starting price');
    if (!priceCheck.valid) return fail(res, 'ERR_VALIDATION', priceCheck.error, 422);
  }

  const db = await getDb();
  const doc = {
    clientId: payload.clientId || req.user.userId,
    title: stripHtml(payload.title),
    description: stripHtml(payload.description || ''),
    skillsRequired: Array.isArray(payload.skillsRequired) ? payload.skillsRequired : [],
    startingPrice: Number(payload.startingPrice || 0),
    minimumPrice: Number(payload.minimumPrice || 0),
    decayRatePerHour: Number(payload.decayRatePerHour || 0),
    postedAt: new Date().toISOString(),
    deadlineAt: payload.deadlineAt || new Date().toISOString(),
    estimatedHours: Number(payload.estimatedHours || 0),
    status: 'open',
    visibility: payload.visibility || 'public',
    createdAt: new Date().toISOString(),
  };

  const result = await db.collection('jobs').insertOne(doc);
  const created = { ...doc, id: result.insertedId.toString(), _id: result.insertedId.toString() };

  return ok(res, { job: created }, undefined, 201);
}));

// --- UPDATE: Edit job (title, description, skills, deadline — only if still open) ---

app.patch('/v1/jobs/:id', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const updates = req.body || {};
  const filter = toObjectIdFilter(req.params.id);

  const job = await db.collection('jobs').findOne(filter);
  if (!job) return fail(res, 'ERR_NOT_FOUND', 'Job not found', 404);
  if (job.status !== 'open') return fail(res, 'ERR_INVALID_STATE', 'Cannot edit a non-open job', 409);

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
