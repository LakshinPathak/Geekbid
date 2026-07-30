const { createApp } = require('../../common/app');
const { ok, fail } = require('../../common/response');
const { getDb } = require('../../common/db');
const { authLimiter } = require('../../common/rateLimiter');
const { validateEmail, validateString, stripHtml } = require('../../common/validate');
const { asyncHandler } = require('../../common/errorHandler');
const { signAccessToken, signRefreshToken, verifyRefreshToken, requireAuth } = require('../../common/authMiddleware');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const app = createApp();

const BCRYPT_SALT_ROUNDS = 12;
const ACCESS_EXPIRY_SECONDS = 900; // 15 minutes

/** Password projection — never return these fields */
const PASSWORD_PROJECTION = { passwordHash: 0, password: 0 };

/** Normalize user document for API response */
const safeUser = (user) => {
  const u = { ...user, id: user._id.toString(), _id: user._id.toString() };
  delete u.passwordHash;
  delete u.password;
  return u;
};

// --- CREATE: Register ---

app.post('/v1/auth/register', authLimiter, asyncHandler(async (req, res) => {
  const { email, fullName, role, password } = req.body || {};

  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) return fail(res, 'ERR_VALIDATION', emailCheck.error, 400);

  const nameCheck = validateString(fullName, 'Full name', { minLength: 2, maxLength: 100 });
  if (!nameCheck.valid) return fail(res, 'ERR_VALIDATION', nameCheck.error, 400);

  const passCheck = validateString(password, 'Password', { minLength: 6, maxLength: 128 });
  if (!passCheck.valid) return fail(res, 'ERR_VALIDATION', passCheck.error, 400);

  if (!['client', 'freelancer'].includes(role)) {
    return fail(res, 'ERR_VALIDATION', 'Role must be client or freelancer', 400);
  }

  const db = await getDb();
  const existing = await db.collection('users').findOne({ email: email.toLowerCase().trim() });
  if (existing) return fail(res, 'ERR_CONFLICT', 'Email already registered', 409);

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const doc = {
    fullName: stripHtml(fullName.trim()),
    email: email.toLowerCase().trim(),
    password: passwordHash,
    role,
    avatarInitial: fullName.trim().split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2),
    geekScore: role === 'freelancer' ? 100 : 0,
    skills: [],
    bio: '',
    isVerified: false,
    availability: 'available',
    hourlyRateMin: 0,
    hourlyRateMax: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection('users').insertOne(doc);
  const userId = result.insertedId.toString();
  const user = safeUser({ ...doc, _id: result.insertedId });

  const accessToken = signAccessToken({ userId, role, email: doc.email });
  const refreshToken = signRefreshToken({ userId, role, email: doc.email });

  // Store refresh token in DB for rotation
  await db.collection('refresh_tokens').updateOne(
    { userId },
    { $set: { token: refreshToken, userId, createdAt: new Date() } },
    { upsert: true }
  );

  return ok(res, {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_EXPIRY_SECONDS,
    user,
  }, undefined, 201);
}));

// --- READ: Login ---

app.post('/v1/auth/login', authLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) return fail(res, 'ERR_VALIDATION', emailCheck.error, 400);

  if (!password) return fail(res, 'ERR_VALIDATION', 'Password is required', 400);

  const db = await getDb();
  const user = await db.collection('users').findOne({ email: email.toLowerCase().trim() });

  if (!user) return fail(res, 'ERR_INVALID_CREDENTIALS', 'Invalid email or password', 401);

  // Verify password (supports both field names for backward compat)
  const storedHash = user.password || user.passwordHash;
  if (!storedHash) return fail(res, 'ERR_INVALID_CREDENTIALS', 'Invalid email or password', 401);

  const passwordMatch = await bcrypt.compare(password, storedHash);
  if (!passwordMatch) return fail(res, 'ERR_INVALID_CREDENTIALS', 'Invalid email or password', 401);

  const userId = user._id.toString();
  const accessToken = signAccessToken({ userId, role: user.role, email: user.email });
  const refreshToken = signRefreshToken({ userId, role: user.role, email: user.email });

  await db.collection('refresh_tokens').updateOne(
    { userId },
    { $set: { token: refreshToken, userId, createdAt: new Date() } },
    { upsert: true }
  );

  return ok(res, {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_EXPIRY_SECONDS,
    user: safeUser(user),
  });
}));

// --- Refresh Token ---

app.post('/v1/auth/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return fail(res, 'ERR_VALIDATION', 'refreshToken is required', 400);

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) return fail(res, 'ERR_TOKEN_EXPIRED', 'Refresh token expired or invalid', 401);

  const db = await getDb();

  // Validate stored token (rotation check)
  const stored = await db.collection('refresh_tokens').findOne({
    userId: payload.userId,
    token: refreshToken,
  });
  if (!stored) {
    // Potential token theft — revoke all tokens
    await db.collection('refresh_tokens').deleteMany({ userId: payload.userId });
    return fail(res, 'ERR_TOKEN_REVOKED', 'Refresh token revoked. Please login again.', 401);
  }

  // Verify user still exists
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(payload.userId) },
    { projection: PASSWORD_PROJECTION }
  );
  if (!user) return fail(res, 'ERR_NOT_FOUND', 'User not found', 404);

  // Issue new token pair (rotation)
  const newAccessToken = signAccessToken({ userId: payload.userId, role: user.role, email: user.email });
  const newRefreshToken = signRefreshToken({ userId: payload.userId, role: user.role, email: user.email });

  await db.collection('refresh_tokens').updateOne(
    { userId: payload.userId },
    { $set: { token: newRefreshToken, createdAt: new Date() } },
    { upsert: true }
  );

  return ok(res, {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: ACCESS_EXPIRY_SECONDS,
    user: safeUser(user),
  });
}));

// --- Logout ---

app.post('/v1/auth/logout', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  await db.collection('refresh_tokens').deleteMany({ userId: req.user.userId });
  return ok(res, { loggedOut: true });
}));

// --- READ: Get current user profile ---

app.get('/v1/auth/me', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(req.user.userId) },
    { projection: PASSWORD_PROJECTION }
  );

  if (!user) return fail(res, 'ERR_NOT_FOUND', 'User not found', 404);
  return ok(res, { user: safeUser(user) });
}));

// --- READ: Get user by ID ---

app.get('/v1/users/:id', asyncHandler(async (req, res) => {
  const db = await getDb();

  let filter;
  try {
    filter = { _id: new ObjectId(req.params.id) };
  } catch {
    filter = { _id: req.params.id };
  }

  const user = await db.collection('users').findOne(filter, {
    projection: PASSWORD_PROJECTION,
  });

  if (!user) return fail(res, 'ERR_NOT_FOUND', 'User not found', 404);
  return ok(res, { user: safeUser(user) });
}));

// --- READ: List users (with optional role filter) ---

app.get('/v1/users', asyncHandler(async (req, res) => {
  const db = await getDb();
  const { role, page = '1', limit = '20' } = req.query || {};

  const filter = {};
  if (role) filter.role = role;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    db.collection('users')
      .find(filter, { projection: PASSWORD_PROJECTION })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray(),
    db.collection('users').countDocuments(filter),
  ]);

  const normalized = users.map(safeUser);
  return ok(res, { users: normalized }, { page: pageNum, limit: limitNum, total });
}));

// --- UPDATE: Update user profile ---

app.patch('/v1/users/:id', requireAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const updates = req.body || {};

  // Users can only update their own profile (admins can update anyone)
  if (req.user.role !== 'admin' && req.user.userId !== req.params.id) {
    return fail(res, 'ERR_FORBIDDEN', 'Cannot update another user', 403);
  }

  let filter;
  try {
    filter = { _id: new ObjectId(req.params.id) };
  } catch {
    filter = { _id: req.params.id };
  }

  const allowedFields = [
    'fullName', 'bio', 'skills', 'company', 'availability',
    'hourlyRateMin', 'hourlyRateMax', 'githubUsername',
  ];

  const safeUpdates = {};
  for (const key of allowedFields) {
    if (key in updates) {
      safeUpdates[key] = typeof updates[key] === 'string' ? stripHtml(updates[key]) : updates[key];
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return fail(res, 'ERR_VALIDATION', 'No valid fields to update', 400);
  }

  safeUpdates.updatedAt = new Date();

  const result = await db.collection('users').updateOne(filter, { $set: safeUpdates });
  if (result.matchedCount === 0) return fail(res, 'ERR_NOT_FOUND', 'User not found', 404);

  return ok(res, { updated: Object.keys(safeUpdates).filter((k) => k !== 'updatedAt') });
}));

// --- DELETE: Delete user account ---

app.delete('/v1/users/:id', requireAuth, asyncHandler(async (req, res) => {
  // Users can only delete their own account (admins can delete anyone)
  if (req.user.role !== 'admin' && req.user.userId !== req.params.id) {
    return fail(res, 'ERR_FORBIDDEN', 'Cannot delete another user', 403);
  }

  const db = await getDb();

  let filter;
  try {
    filter = { _id: new ObjectId(req.params.id) };
  } catch {
    filter = { _id: req.params.id };
  }

  const result = await db.collection('users').deleteOne(filter);
  if (result.deletedCount === 0) return fail(res, 'ERR_NOT_FOUND', 'User not found', 404);

  // Revoke all refresh tokens for deleted user
  await db.collection('refresh_tokens').deleteMany({ userId: req.params.id });

  return res.status(204).send();
}));

app.attachErrorHandler();

const port = Number(process.env.AUTH_PORT || 3001);
app.listen(port, () => console.log(`[auth-service] running on :${port}`));
