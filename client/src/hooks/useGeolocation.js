export function getCurrentPosition(options = {}) {
  const geolocationOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
    ...options
  };

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Este dispositivo no soporta geolocalización.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, geolocationOptions);
  });
}
