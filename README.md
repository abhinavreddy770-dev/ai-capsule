~# AI Capsule — Cloud-Deployed AI Prompt Manager

**CSE3CWA / CSE5006 — Assessment 3**
**Student:** Abhinav Reddy Vanja (22598759)
**Semester 2, 2026**

A small full-stack web application for saving, reviewing and improving AI prompts.
A signed-in user can create, read, update and delete their own prompt records.
All records are tied to the user's GitHub identity on the server.

---

## 1. Deployed application

| | |
|---|---|
| **Public URL** | `https://REPLACE-ME.onrender.com` |
| **Cloud platform** | Render — free Web Service (Node) |
| **Health check** | `https://REPLACE-ME.onrender.com/api/health` → `{ "status": "ok" }` |

> The React frontend and the Express API are served from **the same deployed
> application and the same public URL**, as recommended in Section 8 of the
> specification. This avoids CORS configuration and cross-origin cookie issues,
> because the browser treats the API as same-origin with the page.

> **Note on free-tier startup:** Render's free web service sleeps after a period
> of inactivity. The first request after a sleep may take 30–60 seconds to
> respond while the service wakes up. Subsequent requests are immediate.

---

## 2. Technology

| Component | Implementation |
|---|---|
| Frontend | React 18 (built with Vite) |
| Backend | Node.js + Express 4 |
| Authentication | GitHub OAuth |
| Application session | JWT issued by Express, stored in a `Secure`, `HttpOnly` cookie named `token` |
| Storage | SQLite (`better-sqlite3`) |
| Deployment | Render (free Web Service) |

---

## 3. Installation and run instructions

### Prerequisites
- Node.js 20 or later
- A GitHub OAuth App (see step 2 below)

### Step 1 — Install dependencies

```bash
# from the project root
npm install

# frontend dependencies
cd client
npm install
cd ..
```

### Step 2 — Register a GitHub OAuth App

Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App** and set:

| Field | Local value |
|---|---|
| Application name | AI Capsule (local) |
| Homepage URL | `http://localhost:3000` |
| Authorization callback URL | `http://localhost:3000/auth/github/callback` |

Copy the **Client ID** and generate a **Client Secret**.

### Step 3 — Create the environment file

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Step 4 — Build the frontend and start the server

```bash
npm run build     # builds the React app into client/dist
npm start         # starts Express on http://localhost:3000
```

Open <http://localhost:3000>.

### Optional — frontend dev server with hot reload

```bash
# terminal 1
npm start

# terminal 2
cd client && npm run dev     # http://localhost:5173, proxies /api and /login to :3000
```

---

## 4. Required API routes

The API paths below are exactly as specified in Section 5 and have not been
renamed or moved under a different prefix.

| Route | Access | Purpose |
|---|---|---|
| `GET /` | Public | Landing page explaining AI Capsule |
| `GET /login` | Public | Starts the GitHub OAuth login |
| `GET /auth/github/callback` | Public | OAuth callback; issues the application JWT |
| `GET /dashboard` | Protected | Shows the authenticated user's records |
| `GET /api/health` | Public | Returns `{ "status": "ok" }` |
| `GET /api/me` | Protected | Returns the identity taken from the verified JWT |
| `GET /api/capsules` | Protected | Read own records |
| `POST /api/capsules` | Protected | Create own record |
| `PUT /api/capsules/:id` | Protected | Update own record |
| `DELETE /api/capsules/:id` | Protected | Delete own record |
| `POST /auth/logout` | Public | Clears the `token` cookie |

### How the React frontend communicates with Express

All API calls are made from `client/src/api.js` using `fetch` with
`credentials: 'include'`, which tells the browser to attach the `token` cookie.
Because the frontend and API share one origin, these are same-origin requests
and no CORS configuration is required.

The React code **never reads the JWT** — it cannot, the cookie is `HttpOnly`.
It also never sends a user id. The browser attaches the cookie automatically and
the server derives the user from the verified token.

| Operation | React call | Express route |
|---|---|---|
| CREATE | `api.createCapsule(form)` | `POST /api/capsules` |
| READ | `api.listCapsules()` | `GET /api/capsules` |
| UPDATE | `api.updateCapsule(id, form)` | `PUT /api/capsules/:id` |
| DELETE | `api.deleteCapsule(id)` | `DELETE /api/capsules/:id` |

---

## 5. OAuth provider, and how the application JWT is issued, stored and verified

**OAuth provider used: GitHub** (the recommended option in Section 9).

### Issued — `routes/auth.js`

1. `GET /login` generates a random `state` value, stores it in a short-lived
   cookie, and redirects the browser to GitHub's authorize page.
2. GitHub redirects back to `GET /auth/github/callback` with a one-time `code`.
3. The server verifies the `state` matches (CSRF protection on the handshake).
4. The server exchanges the `code` for a GitHub access token **server-to-server**,
   so the client secret never reaches the browser.
5. The GitHub access token is used **once** to read the user's profile, then
   discarded. It is never stored and never sent to the browser.
6. Express signs **its own application JWT** with `JWT_SECRET`, containing the
   GitHub user id (`sub`), username, display name and avatar URL. Expiry: 2 hours.

The token used by this application is the **application JWT issued by Express**,
not the GitHub OAuth access token.

### Stored

```js
res.cookie('token', appJwt, {
  httpOnly: true,            // page JavaScript cannot read it
  secure: isProduction(),    // HTTPS only in production
  sameSite: 'lax',
  maxAge: 2 * 60 * 60 * 1000,
  path: '/',
});
```

`localStorage` and `Authorization: Bearer` headers are **not** used.

### Verified — `middleware/auth.js`

Every `/api/capsules` route is mounted behind a single `requireAuth` middleware
in `server.js`:

```js
app.use('/api/capsules', requireAuth, capsuleRoutes);
```

`requireAuth` reads the `token` cookie, calls `jwt.verify(token, JWT_SECRET)`,
and attaches the decoded identity to `req.user`. A missing token, a tampered
token or an expired token returns **401 Unauthorized** with no capsule data.

Because there is one gate in front of the whole router, GET, POST, PUT and
DELETE all receive identical protection — there is no route that bypasses it.

### Ownership

`req.user.id` comes from the verified JWT and nowhere else. A `user_id` sent in
a request body, query string or header is ignored.

- **CREATE** writes `req.user.id` into `user_id`.
- **READ / UPDATE / DELETE** all include `WHERE user_id = ?`.

A request for another user's record id returns **404**, the same response as a
record that does not exist, so the API never confirms that another user's
record exists.

---

## 6. Environment variables

Names only — no values are included in this repository or README.

| Variable | Purpose |
|---|---|
| `PORT` | Port Express listens on (set automatically by Render) |
| `APP_URL` | Public base URL; used to build the OAuth callback URL |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `JWT_SECRET` | Secret used to sign and verify the application JWT |
| `NODE_ENV` | `production` on Render, which enables the `Secure` cookie flag |

`.env` is listed in `.gitignore` and is never committed. On Render these are set
as Environment Variables in the service settings.

---

## 7. Database: creation, ownership and persistence

### How it is created

`db.js` opens a SQLite database file and runs `CREATE TABLE IF NOT EXISTS` at
startup, so the schema is created automatically on first run — there is no
manual migration step. The schema matches Section 6 of the specification:

```sql
CREATE TABLE IF NOT EXISTS capsules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  prompt_title TEXT NOT NULL,
  prompt_version TEXT,
  prompt_text TEXT NOT NULL,
  response_summary TEXT,
  category TEXT,
  usefulness TEXT,
  reviewed INTEGER DEFAULT 0,
  improved INTEGER DEFAULT 0,
  screenshot_url TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

An index on `user_id` supports the "list only this user's records" query.

### How user ownership is stored

`user_id` holds the **GitHub numeric user ID** as text, taken from the `sub`
claim of the verified application JWT. It is a stable identifier that does not
change if the user renames their GitHub account.

### Is the deployed storage persistent or ephemeral?

**Ephemeral.** The SQLite file lives on Render's local container filesystem,
which is temporary. Capsule records are lost whenever the service restarts,
redeploys, or wakes from sleep on the free tier. The schema is recreated
automatically on the next start, so the application continues to work correctly —
but previously saved records will not be there.

For genuinely persistent storage the database would need to move to Render
PostgreSQL or a mounted persistent disk. SQLite is the stated minimum for this
assessment and was chosen deliberately for that reason.

---

## 8. Required cURL checks and results

Both checks were run against the deployed `GET /api/capsules` endpoint.
Replace `REPLACE-ME` with the deployed host before running.

### Test 1 — no authentication

```bash
curl -i https://REPLACE-ME.onrender.com/api/capsules
```

**Result:**

```
HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8

{"error":"Unauthorized: no authentication token"}
```

### Test 2 — fake / invalid JWT

```bash
curl -i -H "Cookie: token=fake-token-123" https://REPLACE-ME.onrender.com/api/capsules
```

**Result:**

```
HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8

{"error":"Unauthorized: invalid or expired token"}
```

Test 1 confirms the backend requires authentication. Test 2 confirms the backend
actually **validates the signature** rather than only checking that a cookie
exists — `fake-token-123` is not a validly signed JWT, so `jwt.verify` throws and
the request is rejected. No capsule data is returned in either case.

The same protection applies to `POST`, `PUT` and `DELETE`, which are mounted
behind the identical middleware (see `server.js`).

---

## 9. One honest limitation

**Saved capsules do not survive a restart of the deployed application.**

The deployment uses SQLite on Render's free web service, where the local
filesystem is temporary. When the service sleeps and wakes, redeploys, or
restarts, the database file is discarded and recreated empty. Login continues to
work and new records can be created immediately, but records saved before the
restart are gone.

This is a deliberate trade-off: SQLite is the stated minimum for this assessment
and the specification notes that a more complex database solution does not earn
additional marks. In a production version the storage layer would move to Render
PostgreSQL, which would require changing the queries in `routes/capsules.js` to a
Postgres client but would not change the API surface or the authentication
design.

---

## 10. Project structure

```
ai-capsule/
├── server.js                      Express app: routes, static files, startup
├── db.js                          SQLite connection and schema creation
├── middleware/
│   └── auth.js                    JWT verification middleware (the single gate)
├── routes/
│   ├── auth.js                    GitHub OAuth flow and JWT issuing
│   └── capsules.js                Protected CRUD API
├── client/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                Chooses landing vs dashboard
│       ├── api.js                 All fetch calls to Express
│       ├── styles.css
│       ├── pages/
│       │   ├── Landing.jsx        Public page at /
│       │   └── Dashboard.jsx      Protected page, all four CRUD operations
│       └── components/
│           └── CapsuleForm.jsx    Shared create/edit form
├── .env.example                   Variable names only, no secrets
├── .gitignore
└── package.json
```

---

## 11. Security notes

- `JWT_SECRET`, `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are read from
  environment variables and are never committed.
- `.env` is git-ignored; only `.env.example` (names, no values) is in the repo.
- The application JWT is stored in a `Secure`, `HttpOnly`, `SameSite=Lax` cookie,
  so page JavaScript cannot read it and it is not exposed to XSS.
- `app.set('trust proxy', 1)` is required on Render, which terminates TLS at its
  proxy — without it Express would treat the connection as plain HTTP and refuse
  to send the `Secure` cookie.
- The OAuth handshake uses a random `state` value verified on callback.
- All SQL uses parameterised statements, so user input cannot be injected.
- The GitHub access token is discarded after the profile lookup and is never
  stored or sent to the browser.
