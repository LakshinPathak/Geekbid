/**
 * Input validation and sanitization utilities.
 * Prevents NoSQL injection and XSS attacks.
 */

/**
 * Strips MongoDB operator keys ($) from objects to prevent NoSQL injection.
 * @param {unknown} value - Input to sanitize
 * @returns {unknown} Sanitized value
 */
function sanitize(value) {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (typeof value === 'object') {
    const clean = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith('$')) continue;
      clean[key] = sanitize(val);
    }
    return clean;
  }

  return value;
}

/**
 * Strips HTML tags to prevent XSS.
 * @param {string} str - Input string
 * @returns {string} Sanitized string
 */
function stripHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Validates that a string field is present and within length bounds.
 * @param {unknown} value - Value to check
 * @param {string} fieldName - Name for error messages
 * @param {object} opts - { minLength, maxLength }
 * @returns {{ valid: boolean, error?: string }}
 */
function validateString(value, fieldName, { minLength = 1, maxLength = 500 } = {}) {
  if (typeof value !== 'string' || !value.trim()) {
    return { valid: false, error: `${fieldName} is required.` };
  }
  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters.` };
  }
  if (trimmed.length > maxLength) {
    return { valid: false, error: `${fieldName} must be at most ${maxLength} characters.` };
  }
  return { valid: true };
}

/**
 * Validates that a value is a positive number.
 * @param {unknown} value - Value to check
 * @param {string} fieldName - Name for error messages
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePositiveNumber(value, fieldName) {
  const num = Number(value);
  if (isNaN(num) || num <= 0) {
    return { valid: false, error: `${fieldName} must be a positive number.` };
  }
  return { valid: true };
}

/**
 * Validates an email format.
 * @param {string} email
 * @returns {{ valid: boolean, error?: string }}
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof email !== 'string' || !emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format.' };
  }
  return { valid: true };
}

/**
 * Express middleware that sanitizes req.body, req.query, and req.params.
 */
function sanitizeMiddleware(req, _res, next) {
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  next();
}

module.exports = {
  sanitize,
  stripHtml,
  validateString,
  validatePositiveNumber,
  validateEmail,
  sanitizeMiddleware,
};
