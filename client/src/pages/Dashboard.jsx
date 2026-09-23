import { useEffect, useState } from 'react';
import { api } from '../api.js';
import CapsuleForm from '../components/CapsuleForm.jsx';

/**
 * Dashboard.jsx — the protected page at "/dashboard".
 *
 * All four CRUD operations live here:
 *   READ   — load() on mount, GET /api/capsules
 *   CREATE — handleSubmit with no `editing`, POST /api/capsules
 *   UPDATE — handleSubmit with `editing` set, PUT /api/capsules/:id
 *   DELETE — handleDelete, DELETE /api/capsules/:id
 *
 * None of these send a user id. The server takes the owner from the JWT.
 */
export default function Dashboard({ user }) {
  const [capsules, setCapsules] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setCapsules(await api.listCapsules());
      setError('');
    } catch (err) {
      if (err.status === 401) {
        window.location.href = '/';
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(form) {
    setBusy(true);
    try {
      if (editing) {
        await api.updateCapsule(editing.id, form);
        setEditing(null);
      } else {
        await api.createCapsule(form);
      }
      await load();
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(capsule) {
    if (!window.confirm(`Delete "${capsule.prompt_title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.deleteCapsule(capsule.id);
      if (editing && editing.id === capsule.id) setEditing(null);
      await load();
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await api.logout();
    window.location.href = '/';
  }

  return (
    <div className="page">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">◆</span>
          <span className="brand-name">AI Capsule</span>
        </div>
        <div className="user-box">
          {user.avatar && <img className="avatar" src={user.avatar} alt="" />}
          <span className="username">{user.name}</span>
          <button className="btn btn-ghost" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="dashboard">
        <div className="dash-intro">
          <h1>Your capsules</h1>
          <p className="muted">
            {capsules.length === 0
              ? 'Nothing saved yet — add your first prompt below.'
              : `${capsules.length} saved prompt${capsules.length === 1 ? '' : 's'}.`}
          </p>
        </div>

        {error && <div className="alert">{error}</div>}

        <CapsuleForm
          editing={editing}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
          busy={busy}
        />

        {loading ? (
          <div className="centered">
            <div className="spinner" aria-label="Loading" />
          </div>
        ) : (
          <ul className="capsule-list">
            {capsules.map((capsule) => (
              <li key={capsule.id} className="card capsule">
                <div className="capsule-head">
                  <div>
                    <h3>{capsule.prompt_title}</h3>
                    <p className="meta">
                      {capsule.project_name}
                      {capsule.prompt_version && ` · ${capsule.prompt_version}`}
                      {capsule.category && ` · ${capsule.category}`}
                    </p>
                  </div>
                  <div className="capsule-actions">
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        setEditing(capsule);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={busy}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(capsule)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <pre className="prompt-text">{capsule.prompt_text}</pre>

                {capsule.response_summary && (
                  <p className="summary">
                    <strong>Response:</strong> {capsule.response_summary}
                  </p>
                )}
                {capsule.notes && (
                  <p className="summary">
                    <strong>Notes:</strong> {capsule.notes}
                  </p>
                )}

                <div className="tags">
                  {capsule.usefulness && <span className="tag">{capsule.usefulness}</span>}
                  {capsule.reviewed && <span className="tag tag-ok">Reviewed</span>}
                  {capsule.improved && <span className="tag tag-ok">Improved</span>}
                  {capsule.screenshot_url && (
                    <a
                      className="tag tag-link"
                      href={capsule.screenshot_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Screenshot
                    </a>
                  )}
                  <span className="tag tag-quiet">#{capsule.id}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
