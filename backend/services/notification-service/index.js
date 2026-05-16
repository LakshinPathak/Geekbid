const { createApp } = require('../../common/app');
const { ok, fail } = require('../../common/response');
const { getDb } = require('../../common/db');
const { validateString, stripHtml } = require('../../common/validate');
const { asyncHandler } = require('../../common/errorHandler');
const { requireAuth } = require('../../common/authMiddleware');
const { ObjectId } = require('mongodb');

const app = createApp();

/** Helper */
const toObjectId = (id) => {
  try {
    return new ObjectId(id);
  } catch {
    return id;
  }
};

// --- READ: List notifications (with optional filters) ---

app.get('/v1/notifications', asyncHandler(async (req, res) => {
  const db = await getDb();
  const { userId, unread, type, page = '1', limit = '50' } = req.query || {};

  const filter = {};
  if (userId) filter.userId = toObjectId(userId);
  if (unread === 'true') filter.isRead = false;
  if (type) filter.type = type;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const [notifications, total] = await Promise.all([
    db.collection('notifications')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray(),
    db.collection('notifications').countDocuments(filter),
  ]);

  const normalized = notifications.map((n) => ({
    ...n,
    id: n._id.toString(),
    _id: n._id.toString(),
    userId: n.userId?.toString(),
    jobId: n.jobId?.toString(),
  }));

  return ok(res, { notifications: normalized }, { page: pageNum, limit: limitNum, total });
}));

// --- READ: Get single notification ---

app.get('/v1/notifications/:id', asyncHandler(async (req, res) => {
  const db = await getDb();
  const notification = await db.collection('notifications').findOne({ _id: toObjectId(req.params.id) });
  if (!notification) return fail(res, 'ERR_NOT_FOUND', 'Notification not found', 404);

  return ok(res, {
    notification: {
      ...notification,
      id: notification._id.toString(),
      _id: notification._id.toString(),
      userId: notification.userId?.toString(),
      jobId: notification.jobId?.toString(),
    },
  });
}));

// --- CREATE: Create a notification ---

app.post('/v1/notifications', requireAuth, asyncHandler(async (req, res) => {
  const { userId, title, body, type, jobId } = req.body || {};

  if (!userId) return fail(res, 'ERR_VALIDATION', 'userId is required', 400);

  const titleCheck = validateString(title, 'Title', { minLength: 1, maxLength: 200 });
  if (!titleCheck.valid) return fail(res, 'ERR_VALIDATION', titleCheck.error, 400);

  const bodyCheck = validateString(body, 'Body', { minLength: 1, maxLength: 1000 });
  if (!bodyCheck.valid) return fail(res, 'ERR_VALIDATION', bodyCheck.error, 400);

  const db = await getDb();
  const doc = {
    userId: toObjectId(userId),
    title: stripHtml(title),
    body: stripHtml(body),
    type: type || 'general',
    jobId: jobId ? toObjectId(jobId) : undefined,
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection('notifications').insertOne(doc);
  const created = { ...doc, id: result.insertedId.toString(), _id: result.insertedId.toString() };

  return ok(res, { notification: created }, undefined, 201);
}));

// --- UPDATE: Mark notification as read ---

app.patch('/v1/notifications/:id/read', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const result = await db.collection('notifications').updateOne(
    { _id: toObjectId(req.params.id) },
    { $set: { isRead: true, updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) return fail(res, 'ERR_NOT_FOUND', 'Notification not found', 404);
  return ok(res, { updated: true });
}));

// --- UPDATE: Mark ALL notifications as read for a user ---

app.patch('/v1/notifications/read-all', requireAuth, asyncHandler(async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return fail(res, 'ERR_VALIDATION', 'userId is required', 400);

  const db = await getDb();
  const result = await db.collection('notifications').updateMany(
    { userId: toObjectId(userId), isRead: false },
    { $set: { isRead: true, updatedAt: new Date() } }
  );

  return ok(res, { markedRead: result.modifiedCount });
}));

// --- DELETE: Delete a single notification ---

app.delete('/v1/notifications/:id', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const result = await db.collection('notifications').deleteOne({ _id: toObjectId(req.params.id) });
  if (result.deletedCount === 0) return fail(res, 'ERR_NOT_FOUND', 'Notification not found', 404);

  return res.status(204).send();
}));

// --- DELETE: Clear all notifications for a user ---

app.delete('/v1/notifications', requireAuth, asyncHandler(async (req, res) => {
  const { userId } = req.query || {};
  if (!userId) return fail(res, 'ERR_VALIDATION', 'userId query param is required', 400);

  const db = await getDb();
  const result = await db.collection('notifications').deleteMany({ userId: toObjectId(userId) });

  return ok(res, { deleted: result.deletedCount });
}));

app.attachErrorHandler();

const port = Number(process.env.NOTIFICATION_PORT || 3006);
app.listen(port, () => console.log(`[notification-service] running on :${port}`));
