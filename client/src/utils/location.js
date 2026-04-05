export function toLatLngFromGeoJsonPoint(point) {
  if (!point?.coordinates || point.coordinates.length !== 2) {
    return null;
  }

  return {
    lng: point.coordinates[0],
    lat: point.coordinates[1]
  };
}

export function formatCoordinates(location) {
  if (!location) {
    return 'Sin coordenadas';
  }

  const lat = Number(location.lat).toFixed(6);
  const lng = Number(location.lng).toFixed(6);

  return `${lat}, ${lng}`;
}

export function buildOpenStreetMapEmbedUrl(location) {
  if (!location) {
    return '';
  }

  const delta = 0.008;
  const minLng = location.lng - delta;
  const minLat = location.lat - delta;
  const maxLng = location.lng + delta;
  const maxLat = location.lat + delta;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${location.lat}%2C${location.lng}`;
}
