// Minimalni service worker: omogućuje instalaciju PWA-a; sav sadržaj ide s mreže.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
