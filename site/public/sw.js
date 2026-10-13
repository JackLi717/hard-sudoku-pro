// Retire ReadyTradie's root-scoped worker at its original update URL.
// New website pages do not register a worker. Do not add a fetch handler here.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const windows = await self.clients.matchAll({ type: 'window' });
      await self.registration.unregister();
      await Promise.allSettled(
        windows.map(window => window.navigate(window.url)),
      );
    })(),
  );
});
