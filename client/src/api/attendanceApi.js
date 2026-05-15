import { request } from './httpClient';

export function getCurrentSession(token) {
  return request('/attendance/current', { token });
}

export function checkIn(token, location) {
  return request('/attendance/check-in', {
    method: 'POST',
    token,
    body: { location }
  });
}

export function checkOut(token, location) {
  return request('/attendance/check-out', {
    method: 'POST',
    token,
    body: { location }
  });
}

export function closeWorkSession(token, sessionId) {
  return request(`/attendance/sessions/${sessionId}/close`, {
    method: 'PATCH',
    token,
    body: { reason: 'Cierre manual desde supervisión.' }
  });
}
