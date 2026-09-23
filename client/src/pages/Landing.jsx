/**
 * Landing.jsx — the public page at "/".
 * Explains what AI Capsule is and starts the OAuth login.
 *
 * The login button is a plain link to /login (not a fetch) because the OAuth
 * flow is a full browser redirect to GitHub and back.
 */
export default function Landing({ user }) {
  return (
    <div className="page">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">◆</span>
          <span className="brand-name">AI Capsule</span>
        </div>
        {user ? (
          <a className="btn btn-primary" href="/dashboard">
            Go to dashboard
          </a>
        ) : (
          <a className="btn btn-primary" href="/login">
            Sign in with GitHub
          </a>
        )}
      </header>

      <main className="hero">
        <h1>Keep the prompts that actually worked.</h1>
        <p className="lede">
          You write a prompt that finally gets ChatGPT, Claude or Copilot to do the right
          thing — then it disappears into a chat history you will never scroll back through.
          AI Capsule is a private library for the ones worth keeping.
        </p>

        {!user && (
          <a className="btn btn-primary btn-lg" href="/login">
            Sign in with GitHub to start
          </a>
        )}

        <section className="features">
          <article>
            <h2>Save with context</h2>
            <p>
              Store the prompt together with the project it belonged to, the version you
              landed on, a summary of what the AI returned and your own notes.
            </p>
          </article>
          <article>
            <h2>Track what you improved</h2>
            <p>
              Mark a capsule as reviewed once you have checked the output, and flag the
              ones where a rewrite genuinely made the answer better.
            </p>
          </article>
          <article>
            <h2>Private to you</h2>
            <p>
              Every record is tied to your GitHub identity on the server. You only ever
              see, edit and delete your own capsules.
            </p>
          </article>
        </section>
      </main>

      <footer className="site-footer">
        <p>
          AI Capsule · CSE3CWA / CSE5006 Assessment 3 ·{' '}
          <a href="/api/health">API health</a>
        </p>
      </footer>
    </div>
  );
}
