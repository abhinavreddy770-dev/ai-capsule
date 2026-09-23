/**
 * api.js — the only place the frontend talks to Express.
 *
 * Note `credentials: 'include'` on every call. That is what makes the browser
 * attach the HttpOnly "token" cookie. The React code never reads the JWT and
 * never sends an Authorization header — it cannot, the cookie is HttpOnly.
 * The browser handles it automatically and the server verifies it.
 */

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (response.status === 401) {
    const error = new Error('Not authenticated');
    error.status = 401;
    throw error;
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch {
      /* response had no JSON body */
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  me: () => request('/api/me'),
  health: () => request('/api/health'),

  listCapsules: () => request('/api/capsules'),

  createCapsule: (data) =>
    request('/api/capsules', { method: 'POST', body: JSON.stringify(data) }),

  updateCapsule: (id, data) =>
    request(`/api/capsules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteCapsule: (id) =>
    request(`/api/capsules/${id}`, { method: 'DELETE' }),

  logout: () => request('/auth/logout', { method: 'POST' }),
};
