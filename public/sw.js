/* Pinz: service worker do app instalável.
 * Regras (simples de propósito, para nunca mostrar dado velho):
 *  - Páginas (navegação): sempre a rede; se estiver sem internet, mostra /offline.html.
 *  - /_next/static e /icons (arquivos com versão no nome ou que quase não mudam): cache primeiro.
 *  - /img (fundos, logos): usa o cache e atualiza em segundo plano.
 *  - Tudo mais (API, Supabase, pagamentos, login, vídeo/áudio, outros sites, POST): nem passa por aqui.
 */
const VERSION = "pinz-v1";
const STATIC = `${VERSION}-static`;
const IMAGES = `${VERSION}-img`;
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll([OFFLINE, "/icons/icon-192.png"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // outros sites (Supabase, mapas, fontes…): direto na rede
  if (req.headers.has("range")) return; // vídeo e áudio

  if (req.mode === "navigate") {
    if (url.pathname.startsWith("/api/")) return;
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (url.pathname.startsWith("/img/")) {
    event.respondWith(
      caches.open(IMAGES).then(async (cache) => {
        const hit = await cache.match(req);
        const net = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || net;
      }),
    );
  }
});

// Notificações no aparelho (lembrete do hábito): mostra o aviso e, ao tocar, abre (ou volta para) o mural
self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch (e) {
    d = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(d.title || "Pinz", {
      body: d.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "pinz-habit",
      data: { url: d.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url).catch(() => undefined);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
