export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/service-worker.js');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('No se pudo registrar el Service Worker', error);
    }
  });
}
