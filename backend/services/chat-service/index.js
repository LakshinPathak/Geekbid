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

// --- READ: List chat rooms ---

app.get('/v1/chat/rooms', asyncHandler(async (req, res) => {
  const db = await getDb();
  const { userId } = req.query || {};

  const filter = {};
  if (userId) filter.participantIds = userId;

  const rooms = await db.collection('chat_rooms')
    .find(filter)
    .sort({ updatedAt: -1 })
    .limit(50)
    .toArray();

  const normalized = rooms.map((r) => ({
    ...r,
    id: r._id.toString(),
    _id: r._id.toString(),
  }));

  return ok(res, { rooms: normalized });
}));

// --- CREATE: Create a chat room ---

app.post('/v1/chat/rooms', requireAuth, asyncHandler(async (req, res) => {
  const { jobId, participantIds } = req.body || {};

  if (!jobId) return fail(res, 'ERR_VALIDATION', 'jobId is required', 400);
  if (!Array.isArray(participantIds) || participantIds.length < 2) {
    return fail(res, 'ERR_VALIDATION', 'participantIds must be an array with at least 2 users', 400);
  }

  const db = await getDb();

  // Check if a room already exists for this job + participants
  const existing = await db.collection('chat_rooms').findOne({ jobId });
  if (existing) {
    return ok(res, {
      room: { ...existing, id: existing._id.toString(), _id: existing._id.toString() },
    });
  }

  const doc = {
    jobId,
    participantIds,
    updatedAt: new Date().toISOString(),
  };

  const result = await db.collection('chat_rooms').insertOne(doc);
  const room = { ...doc, id: result.insertedId.toString(), _id: result.insertedId.toString() };

  return ok(res, { room }, undefined, 201);
}));

// --- READ: Get messages for a room ---

app.get('/v1/chat/:roomId/messages', asyncHandler(async (req, res) => {
  const db = await getDb();
  const { roomId } = req.params;
  const { page = '1', limit = '50' } = req.query || {};

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const roomObjId = toObjectId(roomId);

  const [messages, total] = await Promise.all([
    db.collection('chatmessages')
      .find({ roomId: roomObjId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limitNum)
      .toArray(),
    db.collection('chatmessages').countDocuments({ roomId: roomObjId }),
  ]);

  const normalized = messages.map((m) => ({
    ...m,
    id: m._id.toString(),
    _id: m._id.toString(),
    senderId: m.senderId?.toString(),
    roomId: m.roomId?.toString(),
  }));

  return ok(res, { messages: normalized }, { page: pageNum, limit: limitNum, total });
}));

// --- CREATE: Send a message ---

app.post('/v1/chat/:roomId/messages', requireAuth, asyncHandler(async (req, res) => {
  const textCheck = validateString((req.body || {}).text, 'Message', { minLength: 1, maxLength: 2000 });
  if (!textCheck.valid) return fail(res, 'ERR_VALIDATION', textCheck.error, 422);

  const db = await getDb();
  const { roomId } = req.params;
  const { text, senderId } = req.body;
  const cleanText = stripHtml(text.trim());

  const roomObjId = toObjectId(roomId);
  const senderObjId = senderId ? toObjectId(senderId) : toObjectId('000000000000000000000001');

  const doc = {
    roomId: roomObjId,
    senderId: senderObjId,
    text: cleanText,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection('chatmessages').insertOne(doc);

  // Update room's last activity timestamp
  await db.collection('chat_rooms').updateOne(
    { _id: roomObjId },
    { $set: { updatedAt: new Date().toISOString() } }
  );

  const message = {
    id: result.insertedId.toString(),
    _id: result.insertedId.toString(),
    roomId: roomId,
    senderId: senderObjId.toString(),
    text: cleanText,
    createdAt: doc.createdAt.toISOString(),
  };

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
