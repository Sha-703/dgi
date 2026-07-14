/**
 * Service API — DGI IPER
 * Connecté au backend Django sur http://localhost:8000/api/
 */

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8000/api' : '/api');

// ─── TOKEN STORAGE ────────────────────────────────────────────────
export const getToken = () => localStorage.getItem('dgi_token');
export const setToken = (t) => localStorage.setItem('dgi_token', t);
export const removeToken = () => localStorage.removeItem('dgi_token');

// ─── HTTP HELPER ──────────────────────────────────────────────────
async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Token ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);

  // Réponse vide (204 No Content)
  if (res.status === 204) return null;

  const data = await res.json();

  if (!res.ok) {
    // Extraire le message d'erreur Django
    const message =
      data?.detail ||
      data?.error ||
      data?.non_field_errors?.[0] ||
      Object.values(data)?.[0]?.[0] ||
      `Erreur ${res.status}`;
    throw new Error(message);
  }

  return data;
}

const get = (path) => request('GET', path);
const post = (path, body) => request('POST', path, body);
const patch = (path, body) => request('PATCH', path, body);

// ─── AUTH ─────────────────────────────────────────────────────────
export const apiLogin = (login, password) =>
  post('/auth/login/', { login, password });

export const apiLogout = () =>
  post('/auth/logout/');

// ─── CONTRIBUABLES ────────────────────────────────────────────────
export const apiRegisterContribuable = (data) =>
  post('/contribuables/register/', data);

export const apiGetContribuables = () =>
  get('/contribuables/');

export const apiGetMonProfil = () =>
  get('/contribuables/mon-profil/');

// ─── DÉCLARATIONS ─────────────────────────────────────────────────
export const apiGetDeclarations = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return get(`/declarations/${qs ? '?' + qs : ''}`);
};

export const apiSoumettreDeclaration = (data) =>
  post('/declarations/', data);

export const apiGetDeclaration = (id) =>
  get(`/declarations/${id}/`);

export const apiValiderDeclaration = (id, statut, motif_rejet = '') =>
  patch(`/declarations/${id}/`, { statut, motif_rejet });

// ─── PAIEMENTS ────────────────────────────────────────────────────
export const apiGetPaiements = () =>
  get('/paiements/');

export const apiEnregistrerPaiement = (data) =>
  post('/paiements/', data);

// ─── STATISTIQUES ─────────────────────────────────────────────────
export const apiGetStatistiques = (annee) =>
  get(`/statistiques/${annee ? '?annee=' + annee : ''}`);