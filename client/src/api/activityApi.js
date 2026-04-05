import { request } from './httpClient';

export function uploadActivityPhoto(token, { file, taskId, workSessionId }) {
  const formData = new FormData();

  formData.append('photo', file);

  if (taskId) {
    formData.append('taskId', taskId);
  }

  if (workSessionId) {
    formData.append('workSessionId', workSessionId);
  }

  return request('/activities/upload-activity-photo', {
    method: 'POST',
    token,
    body: formData,
    isFormData: true
  });
}
