import { request } from './httpClient';

export function listWorkers(token) {
  return request('/users/workers', {
    token
  });
}

export function createUser(token, payload) {
  return request('/users', {
    method: 'POST',
    token,
    body: payload
  });
}
