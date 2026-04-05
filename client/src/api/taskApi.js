import { request } from './httpClient';

function toQuery(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return query ? `?${query}` : '';
}

export function createTask(token, payload) {
  return request('/tasks', {
    method: 'POST',
    token,
    body: payload
  });
}

export function listTasks(token, filters = {}) {
  return request(`/tasks/me${toQuery(filters)}`, {
    token
  });
}

export function updateTaskStatus(token, taskId, status) {
  return request(`/tasks/${taskId}/status`, {
    method: 'PATCH',
    token,
    body: { status }
  });
}
