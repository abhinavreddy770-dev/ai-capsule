import { useEffect, useState } from 'react';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { api } from './api.js';

/**
 * Minimal routing: the app only has two pages, so we read the pathname
 * directly rather than pulling in a router library.
 *
 * On load we ask /api/me who the current user is. That call is protected by
 * the JWT middleware, so a 401 simply means "not signed in" and we show the
 * public landing page.
 */
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const path = window.location.pathname;

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="centered">
        <div className="spinner" aria-label="Loading" />
      </div>
    );
  }

  if (path === '/dashboard' && user) {
    return <Dashboard user={user} />;
  }

  return <Landing user={user} />;
}
