/*
 * ACL service worker. Hand-written and small on purpose.
 *  - Pages: network first, fall back to the cached copy, then /offline.
 *  - Ticket wallet (/tickets/my, /tickets/t/...): always kept for offline entry.
 *  - Build assets and icons: cache first.
 *  - Admin, account, auth and API calls are never cached.
 * Bump VERSION to drop old caches.
 */
const VERSION = "acl-v1";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const TICKETS = "acl-tickets"; // survives version bumps on purpose
const IMAGES = `${VERSION}-images`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon.svg"];
const PRIVATE = /^\/(admin|account|auth|api)(\/|$)/;
const TICKET_PAGES = /^\/tickets\/(my|t\/)/;
const MAX_IMAGES = 60;
const MAX_PAGES = 30;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION) && key !== TICKETS).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((key) => cache.delete(key)));
}

async function pageStrategy(request, url) {
  const cacheName = TICKET_PAGES.test(url.pathname) ? TICKETS : PAGES;
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
      if (cacheName === PAGES) trim(PAGES, MAX_PAGES);
    }
    return response;
  } catch {
    return (
      (await caches.match(request, { ignoreSearch: true })) ||
      (await caches.match(OFFLINE_URL)) ||
      new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
    );
  }
}

async function cacheFirst(request, cacheName, max) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    if (max) trim(cacheName, max);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || PRIVATE.test(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(pageStrategy(request, url));
  } else if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request, STATIC));
  } else if (url.pathname.startsWith("/_next/image") || request.destination === "image") {
    event.respondWith(cacheFirst(request, IMAGES, MAX_IMAGES).catch(() => Response.error()));
  }
});
