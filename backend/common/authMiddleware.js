const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'geekbid-dev-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Signs a JWT access token with user claims.
 * @param {{ userId: string, role: string, email: string }} payload
 * @returns {string}
 */
function signAccessToken({ userId, role, email }) {
  return jwt.sign(
    { userId, role, email, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Signs a JWT refresh token with user claims.
 * @param {{ userId: string, role: string, email: string }} payload
 * @returns {string}
 */
function signRefreshToken({ userId, role, email }) {
  return jwt.sign(
    { userId, role, email, type: 'refresh' },
    JWT_SECRET + '-refresh',
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Verifies a JWT access token.
 * @param {string} token
 * @returns {{ userId: string, role: string, email: string } | null}
 */
function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== 'access') return null;
    return { userId: payload.userId, role: payload.role, email: payload.email };
  } catch {
    return null;
  }
}

/**
 * Verifies a JWT refresh token.
 * @param {string} token
 * @returns {{ userId: string, role: string, email: string } | null}
 */
function verifyRefreshToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET + '-refresh');
    if (payload.type !== 'refresh') return null;
    return { userId: payload.userId, role: payload.role, email: payload.email };
  } catch {
    return null;
  }
}

/**
 * Express middleware: extracts and verifies Bearer token.
 * Attaches `req.user` with { userId, role, email } on success.
 * Returns 401 on failure.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'ERR_UNAUTHORIZED', message: 'Authorization required' },
    });
  }

  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token);
  if (!payload) {
    return res.status(401).json({
      success: false,
      error: { code: 'ERR_TOKEN_EXPIRED', message: 'Access token expired or invalid' },
    });
  }

  req.user = payload;
  next();
}

/**
 * Express middleware: optional auth — attaches req.user if valid token present, else continues.
 */
function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const payload = verifyAccessToken(authHeader.slice(7));
    if (payload) req.user = payload;
  }
  next();
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  requireAuth,
  optionalAuth,
  JWT_SECRET,
};
