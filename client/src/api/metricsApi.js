import { request } from './httpClient';

export function getHoursMetrics(token, workerId) {
  const query = workerId ? `?workerId=${workerId}` : '';

  return request(`/metrics/hours${query}`, {
    token
  });
}

export function getWorkersOverview(token, workerId) {
  const query = workerId ? `?workerId=${workerId}` : '';

  return request(`/metrics/workers-overview${query}`, {
    token
  });
}

export function getActiveWorkerLocations(token) {
  return request('/metrics/active-locations', {
    token
  });
}
