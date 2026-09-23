/**
 * middleware/auth.js — JWT authentication middleware.
 *
 * This is the single gate in front of every /api/capsules route.
 *
 * It does three things, in this order:
 *   1. Reads the application JWT out of the HttpOnly cookie named "token".
 *   2. Verifies the signature with JWT_SECRET. A forged or tampered token
 *      fails here — this is why "token=fake-token-123" returns 401 and not 200.
 *   3. Attaches the authenticated identity to req.user.
 *
 * Any failure returns 401 and no capsule data, as required by Section 9.
 */
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.token;

  // No cookie at all -> Test 1 in the assignment (curl with no auth)
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: no authentication token' });
  }

  try {
    // jwt.verify throws if the signature is invalid or the token has expired.
    // This is the check that Test 2 (fake / invalid JWT) exercises.
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // The record owner comes from HERE — the verified token — and nowhere else.
    // We never read a user_id out of req.body, req.query or a request header.
    req.user = {
      id: String(payload.sub),
      username: payload.username,
      name: payload.name,
      avatar: payload.avatar,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }
}

/**
 * Soft variant used only for serving the protected /dashboard PAGE.
 * Returns true/false rather than ending the response, so the server can
 * redirect a signed-out visitor to the landing page instead of sending JSON.
 */
function isAuthenticated(req) {
  const token = req.cookies && req.cookies.token;
  if (!token) return false;
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

module.exports = { requireAuth, isAuthenticated };
