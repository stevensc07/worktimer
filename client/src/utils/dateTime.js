export const BOSTON_TIME_ZONE = 'America/New_York';

export function formatBostonDate(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('es-US', {
    timeZone: BOSTON_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatBostonDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('es-US', {
    timeZone: BOSTON_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}
