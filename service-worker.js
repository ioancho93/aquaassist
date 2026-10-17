// v2: основният файл вече е index.html вместо aquaassistant.html (за чист адрес
// aquaassist.app без наставка) — смяната на CACHE_NAME изхвърля старото кеширано
// v1 съдържание, за да не остане "призрачна" стара версия в офлайн кеша.
const CACHE_NAME = "aquaassistant-cache-v16";
const CORE_ASSETS = [
  "./index.html",
  "./manifest.json",
  "./tailwind.css",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png"
];
// Критични външни ресурси (CDN) — без тях приложението изглежда счупено офлайн
// (без стилове/икони). Кешират се веднага при инсталация, не само след първо
// зареждане, за да работи офлайн дори при прекъснато първо посещение.
// (Tailwind вече не е тук от v15 — заменен с локалния ./tailwind.css по-горе.)
const CDN_ASSETS = [
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all([
        cache.addAll(CORE_ASSETS).catch(() => {}),
        // Всеки CDN ресурс поотделно — ако един падне (напр. временно недостъпен),
        // да не провали кеширането на останалите.
        ...CDN_ASSETS.map((url) => cache.add(new Request(url, { mode: "no-cors" })).catch(() => {}))
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Стратегия: network-first за HTML (винаги най-новата версия при връзка),
// cache-first за всичко останало (шрифтове, CDN скриптове, икони) — за бързо офлайн зареждане.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
    })
  );
});
