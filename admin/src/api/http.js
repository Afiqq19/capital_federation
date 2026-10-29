import { API_URL } from '../config/env';

/** Wrapper fetch: melempar Error(pesan server) bila respons tidak OK. */
export async function request(path, { method = 'GET', body } = {}) {
  let res;
  const token = typeof window !== 'undefined' ? localStorage.getItem('cf_admin_token') : null;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server bursa');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* body kosong */
  }
  if (!res.ok) throw new Error((data && data.error) || `Permintaan gagal (${res.status})`);
  return data;
}
