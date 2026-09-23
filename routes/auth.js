/**
 * routes/auth.js — GitHub OAuth login and application-JWT issuing.
 *
 * The flow required by Section 9 of the specification:
 *
 *   1. GET /login
 *        Redirects the browser to GitHub's authorize page.
 *        A random "state" value is stored in a short-lived cookie so the
 *        callback can prove the response belongs to the request we started
 *        (CSRF protection on the OAuth handshake).
 *
 *   2. GET /auth/github/callback?code=...&state=...
 *        a. Verify the state matches.
 *        b. Exchange the one-time code for a GitHub access token
 *           (server-to-server, so the client secret never reaches the browser).
 *        c. Use that GitHub token ONCE to read the user's profile.
 *        d. Throw the GitHub token away and mint OUR OWN application JWT.
 *        e. Store the application JWT in a Secure, HttpOnly cookie named "token".
 *
 *   The GitHub access token is never stored and never sent to the browser.
 *   The cookie holds the application JWT that this Express app signed itself.
 */
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const router = express.Router();

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';

const isProduction = () => process.env.NODE_ENV === 'production';

/** Cookie settings for the application JWT. */
function tokenCookieOptions() {
  return {
    httpOnly: true,                 // JavaScript in the page cannot read it
    secure: isProduction(),         // HTTPS only in production (Render)
    sameSite: 'lax',                // sent on top-level navigation back from GitHub
    maxAge: 2 * 60 * 60 * 1000,     // 2 hours, matches the JWT expiry
    path: '/',
  };
}

/* ------------------------------------------------------------------ */
/* 1. Start the OAuth login                                            */
/* ------------------------------------------------------------------ */
router.get('/login', (req, res) => {
  if (!process.env.GITHUB_CLIENT_ID) {
    return res
      .status(500)
      .send('GITHUB_CLIENT_ID is not configured on the server.');
  }

  const state = crypto.randomBytes(16).toString('hex');

  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000, // 10 minutes is plenty to complete a login
    path: '/',
  });

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.APP_URL}/auth/github/callback`,
    scope: 'read:user',
    state,
  });

  res.redirect(`${GITHUB_AUTHORIZE_URL}?${params.toString()}`);
});

/* ------------------------------------------------------------------ */
/* 2. OAuth callback — exchange code, issue our own JWT                */
/* ------------------------------------------------------------------ */
router.get('/auth/github/callback', async (req, res) => {
  const { code, state } = req.query;
  const expectedState = req.cookies.oauth_state;

  res.clearCookie('oauth_state', { path: '/' });

  if (!code) {
    return res.status(400).send('OAuth error: no authorisation code returned.');
  }
  if (!state || !expectedState || state !== expectedState) {
    return res.status(400).send('OAuth error: state mismatch. Please try logging in again.');
  }

  try {
    // (b) Exchange the code for a GitHub access token — server side only.
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.APP_URL}/auth/github/callback`,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      console.error('[auth] GitHub token exchange failed:', tokenData);
      return res.status(401).send('OAuth error: could not obtain an access token from GitHub.');
    }

    // (c) Read the profile once.
    const userResponse = await fetch(GITHUB_USER_URL, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ai-capsule',
      },
    });

    if (!userResponse.ok) {
      console.error('[auth] GitHub profile fetch failed:', userResponse.status);
      return res.status(401).send('OAuth error: could not read your GitHub profile.');
    }

    const githubUser = await userResponse.json();

    // (d) Mint the APPLICATION JWT. This is our token, signed with our secret.
    //     The GitHub access token is discarded here and never persisted.
    const appJwt = jwt.sign(
      {
        sub: String(githubUser.id),      // stable GitHub user ID -> capsules.user_id
        username: githubUser.login,
        name: githubUser.name || githubUser.login,
        avatar: githubUser.avatar_url,
      },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // (e) Store it in the Secure, HttpOnly cookie named "token".
    res.cookie('token', appJwt, tokenCookieOptions());

    return res.redirect('/dashboard');
  } catch (err) {
    console.error('[auth] OAuth callback error:', err);
    return res.status(500).send('OAuth error: unexpected failure during login.');
  }
});

/* ------------------------------------------------------------------ */
/* 3. Logout — clear the application JWT cookie                        */
/* ------------------------------------------------------------------ */
router.post('/auth/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.status(204).end();
});

module.exports = router;
