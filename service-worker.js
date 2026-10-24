// v2: основният файл вече е index.html вместо aquaassistant.html (за чист адрес
// aquaassist.app без наставка) — смяната на CACHE_NAME изхвърля старото кеширано
// v1 съдържание, за да не остане "призрачна" стара версия в офлайн кеша.
// v22: Font Awesome вече е локален файл (fontawesome/) вместо cdnjs.cloudflare.com —
// същата причина като Tailwind по-горе (v15): да не зависи от външен CDN.
// v23: Компактен избор на аквариум (index.html) — нова версия на CACHE_NAME, за
// да вземат потребителите веднага новия HTML вместо стария кеширан.
// v24: Поправка на дублиращите се записи в историята на параметрите.
// v25: Преработен "Изтрий записи" за дневника на водата/обитателите (чекбоксове
// направо върху записите), преместен бутон за изтриване на параметър-история.
// v26: Премахнато отделното изтриване от историята на параметрите; "Изтрий
// записи" вече има бутон и в дневника на обитателите, не само на водата.
// v27: Светла тема, снимка на аквариума (IndexedDB), тенденция (нагоре/надолу)
// до параметрите на водата.
const CACHE_NAME = "aquaassistant-cache-v27";
const CORE_ASSETS = [
  "./index.html",
  "./manifest.json",
  "./tailwind.css",
  "./fontawesome/css/all.min.css",
  "./fontawesome/webfonts/fa-solid-900.woff2",
  "./fontawesome/webfonts/fa-regular-400.woff2",
  "./fontawesome/webfonts/fa-brands-400.woff2",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png"
];
// Критични външни ресурси (CDN) — без тях приложението изглежда счупено офлайн
// (без стилове/икони). Кешират се веднага при инсталация, не само след първо
// зареждане, за да работи офлайн дори при прекъснато първо посещение.
// (Tailwind вече не е тук от v15, Font Awesome — от v22; и двата са локални файлове по-горе.)
const CDN_ASSETS = [
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
