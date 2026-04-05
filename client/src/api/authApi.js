import { request } from './httpClient';

export function loginRequest({ employeeId, pin }) {
  return request('/auth/login', {
    method: 'POST',
    body: { employeeId, pin }
  });
}
