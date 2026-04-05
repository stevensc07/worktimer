import { request } from './httpClient';

export function listWorkers(token) {
  return request('/users/workers', {
    token
  });
}
