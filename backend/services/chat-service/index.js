const { createServer } = require('http');
const { Server } = require('socket.io');
const { createApp } = require('../../common/app');
const { ok, fail } = require('../../common/response');
const { getDb } = require('../../common/db');
const { validateString, stripHtml } = require('../../common/validate');
const { asyncHandler } = require('../../common/errorHandler');
const { requireAuth } = require('../../common/authMiddleware');
const { ObjectId } = require('mongodb');

const app = createApp();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

/** Helper */
const toObjectId = (id) => {
  try {
    return new ObjectId(id);
  } catch {
    return id;
  }
};

// SCHEMA NOTE: the app stores chat under `chat_rooms` + `chat_messages`
// (underscore) with STRING roomId/senderId/participantIds. These handlers match
// that exactly so they operate on the same data the Next.js app wrote.

/** Resolve a room by string id or ObjectId, scoped to a participant. */
async function findParticipantRoom(db, roomId, userId) {
  return db.collection('chat_rooms').findOne({
    $or: [{ _id: toObjectId(roomId) }, { id: roomId }],
    participantIds: userId,
  });
}

// --- READ: List the caller's chat rooms (scoped by token) ---

app.get('/v1/chat/rooms', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const rooms = await db.collection('chat_rooms')
    .find({ participantIds: req.user.userId })
    .sort({ updatedAt: -1 })
    .limit(50)
    .toArray();

  const normalized = rooms.map((r) => ({ ...r, id: r._id.toString(), _id: r._id.toString() }));
  return ok(res, { rooms: normalized });
}));

// --- CREATE: Create a chat room (caller + job-association authorization) ---

app.post('/v1/chat/rooms', requireAuth, asyncHandler(async (req, res) => {
  const { jobId, participantIds } = req.body || {};
  if (!jobId || !Array.isArray(participantIds) || participantIds.length !== 2) {
    return fail(res, 'ERR_VALIDATION', 'jobId and exactly two participantIds are required', 400);
  }
  if (!participantIds.includes(req.user.userId)) {
    return fail(res, 'ERR_FORBIDDEN', 'You must be one of the room participants', 403);
  }

  const db = await getDb();
  let job;
  try { job = await db.collection('jobs').findOne({ _id: new ObjectId(jobId) }); }
  catch { job = await db.collection('jobs').findOne({ id: jobId }); }
  if (!job) return fail(res, 'ERR_NOT_FOUND', 'Job not found', 404);

  // Every participant must be tied to the job: client, accepted freelancer, or bidder.
  const isAssociated = async (uid) => {
    if (job.clientId === uid || job.acceptedBy === uid) return true;
    return !!(await db.collection('bids').findOne({ jobId, freelancerId: uid }));
  };
  for (const uid of participantIds) {
    if (!(await isAssociated(uid))) {
      return fail(res, 'ERR_FORBIDDEN', 'All participants must be associated with this job', 403);
    }
  }

  const existing = await db.collection('chat_rooms').findOne({
    jobId, participantIds: { $all: participantIds },
  });
  if (existing) {
    return ok(res, { room: { ...existing, id: existing._id.toString(), _id: existing._id.toString() } });
  }

  const doc = { jobId, participantIds, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() };
  const result = await db.collection('chat_rooms').insertOne(doc);
  const room = { ...doc, id: result.insertedId.toString(), _id: result.insertedId.toString() };
  return ok(res, { room }, undefined, 201);
}));

// --- READ: messages for a room (?roomId=...) — participant-gated ---

app.get('/v1/chat/messages', requireAuth, asyncHandler(async (req, res) => {
  const { roomId } = req.query || {};
  if (!roomId) return fail(res, 'ERR_VALIDATION', 'roomId query parameter required', 400);

  const db = await getDb();
  const room = await findParticipantRoom(db, roomId, req.user.userId);
  if (!room) return fail(res, 'ERR_NOT_FOUND', 'Room not found or access denied', 404);

  const messages = await db.collection('chat_messages')
    .find({ roomId: room._id.toString() })
    .sort({ createdAt: 1 })
    .limit(500)
    .toArray();

  const normalized = messages.map((m) => ({ ...m, id: m._id.toString(), _id: m._id.toString() }));
  return ok(res, { messages: normalized });
}));

// --- CREATE: send a message (body { roomId, text }) — participant-gated ---

app.post('/v1/chat/messages', requireAuth, asyncHandler(async (req, res) => {
  const { roomId, text } = req.body || {};
  if (!roomId || !text || !String(text).trim()) {
    return fail(res, 'ERR_VALIDATION', 'roomId and text are required', 400);
  }

  const db = await getDb();
  const room = await findParticipantRoom(db, roomId, req.user.userId);
  if (!room) return fail(res, 'ERR_NOT_FOUND', 'Room not found or access denied', 404);

  const doc = {
    roomId,
    senderId: req.user.userId,
    text: String(text).trim(),
    createdAt: new Date().toISOString(),
  };
  const result = await db.collection('chat_messages').insertOne(doc);

  await db.collection('chat_rooms').updateOne(
    { _id: room._id },
    { $set: { updatedAt: new Date().toISOString() } }
  );

  const message = { ...doc, id: result.insertedId.toString(), _id: result.insertedId.toString() };
  io.to(roomId).emit('chat_message', message);
  return ok(res, { message }, undefined, 201);
}));

// --- UPDATE: Edit a message ---

app.patch('/v1/chat/messages/:messageId', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const { text } = req.body || {};

  const textCheck = validateString(text, 'Message', { minLength: 1, maxLength: 2000 });
  if (!textCheck.valid) return fail(res, 'ERR_VALIDATION', textCheck.error, 422);

  const filter = { _id: toObjectId(req.params.messageId) };
  const result = await db.collection('chatmessages').updateOne(filter, {
    $set: { text: stripHtml(text.trim()), updatedAt: new Date() },
  });

  if (result.matchedCount === 0) return fail(res, 'ERR_NOT_FOUND', 'Message not found', 404);

  return ok(res, { updated: true });
}));

// --- DELETE: Delete a message ---

app.delete('/v1/chat/messages/:messageId', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const filter = { _id: toObjectId(req.params.messageId) };

  const result = await db.collection('chatmessages').deleteOne(filter);
  if (result.deletedCount === 0) return fail(res, 'ERR_NOT_FOUND', 'Message not found', 404);

  return res.status(204).send();
}));

// --- DELETE: Delete a chat room (and all messages) ---

app.delete('/v1/chat/rooms/:roomId', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const roomObjId = toObjectId(req.params.roomId);

  const result = await db.collection('chat_rooms').deleteOne({ _id: roomObjId });
  if (result.deletedCount === 0) return fail(res, 'ERR_NOT_FOUND', 'Room not found', 404);

  // Cascade: delete all messages in this room
  await db.collection('chatmessages').deleteMany({ roomId: roomObjId });

  return res.status(204).send();
}));

io.on('connection', (socket) => {
  socket.on('join_room', (roomId) => socket.join(roomId));
});

app.attachErrorHandler();

const port = Number(process.env.CHAT_PORT || 3007);
httpServer.listen(port, () => console.log(`[chat-service] running on :${port}`));
