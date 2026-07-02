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

// NOTE: the app persists notification.userId as a STRING (not ObjectId) — see
// the Next.js writers (job accept, bids, etc.). All queries here match on the
// string userId so results align with what the app actually stored.

// --- READ: List notifications (admin sees all, else own; scoped by token) ---

app.get('/v1/notifications', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const filter = req.user.role === 'admin' ? {} : { userId: req.user.userId };

  const notifications = await db.collection('notifications')
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  const normalized = notifications.map((n) => ({
    ...n,
    id: n._id.toString(),
    _id: n._id.toString(),
  }));

  return ok(res, { notifications: normalized });
}));

// --- READ: Unread count for the navbar badge ---

app.get('/v1/notifications/count', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const unread = await db.collection('notifications').countDocuments({
    userId: req.user.userId,
    isRead: { $ne: true },
  });
  return ok(res, { unread });
}));

// --- UPDATE: mark read — body { notificationId } or { markAll } (matches app) ---

app.patch('/v1/notifications', requireAuth, asyncHandler(async (req, res) => {
  const { notificationId, markAll } = req.body || {};
  const db = await getDb();

  if (markAll) {
    await db.collection('notifications').updateMany(
      { userId: req.user.userId, isRead: false },
      { $set: { isRead: true } }
    );
    return ok(res, { message: 'All marked read' });
  }

  if (notificationId) {
    await db.collection('notifications').updateOne(
      { _id: toObjectId(notificationId), userId: req.user.userId },
      { $set: { isRead: true } }
    );
    return ok(res, { ok: true });
  }

  return fail(res, 'ERR_VALIDATION', 'Provide notificationId or markAll', 400);
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
  const { title, body, type, jobId } = req.body || {};
  // App semantics: a caller creates a notification for THEMSELVES; only title
  // is required. userId is the string token id to stay schema-consistent.
  if (!title) return fail(res, 'ERR_VALIDATION', 'title is required', 400);

  const db = await getDb();
  const doc = {
    userId: req.user.userId,
    type: type || 'general',
    title,
    body: body || '',
    jobId: jobId ?? null,
    isRead: false,
    createdAt: new Date().toISOString(),
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
  const userId = req.user.userId;

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
  const db = await getDb();
  const result = await db.collection('notifications').deleteMany({ userId: toObjectId(req.user.userId) });

  return ok(res, { deleted: result.deletedCount });
}));

app.attachErrorHandler();

const port = Number(process.env.NOTIFICATION_PORT || 3006);
app.listen(port, () => console.log(`[notification-service] running on :${port}`));
