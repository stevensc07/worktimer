const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
export const AUTH_TOKEN_EXPIRED_EVENT = 'work-timer:auth-token-expired';

function notifyTokenExpired(message) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_TOKEN_EXPIRED_EVENT, {
      detail: { message }
    })
  );
}

export async function request(path, options = {}) {
  const { method = 'GET', token, body, isFormData = false } = options;

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined
  });

  const payload = await response
    .json()
    .catch(() => ({ ok: false, message: 'Respuesta no válida del servidor.' }));

  if (!response.ok) {
    if (response.status === 401 && token) {
      notifyTokenExpired('Se cerró la sesión porque el token expiró. Inicia sesión nuevamente.');
    }

    throw new Error(payload.message || 'Error inesperado del servidor.');
  }

  return payload.data;
}
