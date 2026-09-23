/**
 * routes/capsules.js — the protected CRUD API.
 *
 * Every route in this file is mounted behind requireAuth in server.js, so
 * req.user is always present and always came from a verified JWT.
 *
 * Ownership rule (Section 9):
 *   - CREATE writes req.user.id into user_id.
 *   - READ / UPDATE / DELETE all carry "WHERE user_id = ?" so a user can only
 *     ever touch their own rows. A request for someone else's record id gets
 *     404, exactly like a record that does not exist — we never confirm that
 *     another user's record exists.
 */
const express = require('express');
const { db } = require('../db');

const router = express.Router();

/** Convert SQLite's 0/1 integers into real booleans for the frontend. */
function toClient(row) {
  if (!row) return row;
  return {
    ...row,
    reviewed: Boolean(row.reviewed),
    improved: Boolean(row.improved),
  };
}

/** Normalise and validate an incoming capsule payload. */
function readBody(body) {
  const errors = [];

  const project_name = (body.project_name || '').trim();
  const prompt_title = (body.prompt_title || '').trim();
  const prompt_text = (body.prompt_text || '').trim();

  if (!project_name) errors.push('project_name is required');
  if (!prompt_title) errors.push('prompt_title is required');
  if (!prompt_text) errors.push('prompt_text is required');

  return {
    errors,
    values: {
      project_name,
      prompt_title,
      prompt_version: (body.prompt_version || '').trim() || null,
      prompt_text,
      response_summary: (body.response_summary || '').trim() || null,
      category: (body.category || '').trim() || null,
      usefulness: (body.usefulness || '').trim() || null,
      reviewed: body.reviewed ? 1 : 0,
      improved: body.improved ? 1 : 0,
      screenshot_url: (body.screenshot_url || '').trim() || null,
      notes: (body.notes || '').trim() || null,
    },
  };
}

/* ------------------------------------------------------------------ */
/* READ — GET /api/capsules : only the authenticated user's records     */
/* ------------------------------------------------------------------ */
router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM capsules WHERE user_id = ? ORDER BY datetime(created_at) DESC, id DESC')
    .all(req.user.id);

  res.json(rows.map(toClient));
});

/* ------------------------------------------------------------------ */
/* READ ONE — GET /api/capsules/:id                                     */
/* ------------------------------------------------------------------ */
router.get('/:id', (req, res) => {
  const row = db
    .prepare('SELECT * FROM capsules WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!row) return res.status(404).json({ error: 'Capsule not found' });
  res.json(toClient(row));
});

/* ------------------------------------------------------------------ */
/* CREATE — POST /api/capsules                                          */
/* ------------------------------------------------------------------ */
router.post('/', (req, res) => {
  const { errors, values } = readBody(req.body || {});
  if (errors.length) return res.status(400).json({ error: errors.join(', ') });

  const result = db
    .prepare(
      `INSERT INTO capsules
        (user_id, project_name, prompt_title, prompt_version, prompt_text,
         response_summary, category, usefulness, reviewed, improved,
         screenshot_url, notes)
       VALUES
        (@user_id, @project_name, @prompt_title, @prompt_version, @prompt_text,
         @response_summary, @category, @usefulness, @reviewed, @improved,
         @screenshot_url, @notes)`
    )
    // The owner is the verified JWT identity — never a value from the request body.
    .run({ ...values, user_id: req.user.id });

  const created = db
    .prepare('SELECT * FROM capsules WHERE id = ?')
    .get(result.lastInsertRowid);

  res.status(201).json(toClient(created));
});

/* ------------------------------------------------------------------ */
/* UPDATE — PUT /api/capsules/:id                                       */
/* ------------------------------------------------------------------ */
router.put('/:id', (req, res) => {
  const { errors, values } = readBody(req.body || {});
  if (errors.length) return res.status(400).json({ error: errors.join(', ') });

  const result = db
    .prepare(
      `UPDATE capsules SET
         project_name     = @project_name,
         prompt_title     = @prompt_title,
         prompt_version   = @prompt_version,
         prompt_text      = @prompt_text,
         response_summary = @response_summary,
         category         = @category,
         usefulness       = @usefulness,
         reviewed         = @reviewed,
         improved         = @improved,
         screenshot_url   = @screenshot_url,
         notes            = @notes
       WHERE id = @id AND user_id = @user_id`
    )
    // "AND user_id = ?" is what stops one user updating another user's record.
    .run({ ...values, id: req.params.id, user_id: req.user.id });

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Capsule not found' });
  }

  const updated = db
    .prepare('SELECT * FROM capsules WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  res.json(toClient(updated));
});

/* ------------------------------------------------------------------ */
/* DELETE — DELETE /api/capsules/:id                                    */
/* ------------------------------------------------------------------ */
router.delete('/:id', (req, res) => {
  const result = db
    .prepare('DELETE FROM capsules WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Capsule not found' });
  }

  res.json({ success: true, id: Number(req.params.id) });
});

module.exports = router;
