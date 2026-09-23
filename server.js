/**
 * server.js — AI Capsule
 * CSE3CWA / CSE5006 Assessment 3
 *
 * A single Express application that serves BOTH the built React frontend and
 * the JSON API from one public URL. Serving both from one origin is the
 * approach recommended in Section 8 of the specification: it removes the need
 * for CORS configuration and avoids cross-origin cookie problems, because the
 * browser treats the API as same-origin with the page.
 *
 * Route map (Section 5):
 *   GET  /                     public   React landing page
 *   GET  /login                public   starts GitHub OAuth
 *   GET  /auth/github/callback public   OAuth callback, issues application JWT
 *   GET  /dashboard            protected React dashboard
 *   GET  /api/health           public   { "status": "ok" }
 *   GET  /api/me               protected current user from the verified JWT
 *   GET    /api/capsules       protected read own records
 *   POST   /api/capsules       protected create own record
 *   PUT    /api/capsules/:id   protected update own record
 *   DELETE /api/capsules/:id   protected delete own record
 */
require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const { initDb } = require('./db');
const { requireAuth, isAuthenticated } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const capsuleRoutes = require('./routes/capsules');

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------------------------- startup checks ---------------------------- */
const required = ['JWT_SECRET', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'APP_URL'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.warn(`[server] WARNING: missing environment variables: ${missing.join(', ')}`);
  console.warn('[server] Login will not work until these are set.');
}

initDb();

/* ------------------------------ middleware ------------------------------ */
// Render terminates TLS at its proxy, so trust the X-Forwarded-Proto header.
// Without this, Express would think the connection is plain HTTP and refuse
// to send the Secure cookie.
app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());

/* ------------------------------ public API ------------------------------ */
// Health check stays public so the deployed backend can be verified
// independently, as required by Section 7.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* ------------------------------ OAuth routes ---------------------------- */
app.use('/', authRoutes);

/* ---------------------------- protected API ----------------------------- */
// Who am I? Used by the frontend to render the signed-in user.
app.get('/api/me', requireAuth, (req, res) => {
  res.json(req.user);
});

// Every CRUD route below is behind the JWT middleware — one gate, no gaps.
app.use('/api/capsules', requireAuth, capsuleRoutes);

// Any other /api/* path is a genuine 404 in JSON (not the React index.html).
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/* ------------------------- static React frontend ------------------------ */
const clientDist = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDist));

// The dashboard page itself is protected: a visitor with no valid JWT is sent
// back to the landing page instead of being shown the app shell.
app.get('/dashboard', (req, res) => {
  if (!isAuthenticated(req)) return res.redirect('/');
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Everything else falls through to the React app (client-side routing).
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res
        .status(500)
        .send('Frontend build not found. Run "npm run build" before starting the server.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`[server] AI Capsule listening on port ${PORT}`);
  console.log(`[server] APP_URL = ${process.env.APP_URL}`);
  console.log(`[server] NODE_ENV = ${process.env.NODE_ENV || 'development'}`);
});
