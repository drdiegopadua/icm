// Cache do "esqueleto" do app; notícias e imagens vêm sempre da rede.
const CACHE = "icmapp-v1";
const ARQUIVOS = ["./", "index.html", "css/app.css?v=7", "js/config.js?v=8", "js/data.js?v=4", "js/rota.js?v=4", "js/db.js?v=12", "js/app.js?v=13", "manifest.json", "icons/logo-transparente.png", "icons/icon-192.png", "icons/favicon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("icmapp-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // Página, manifest e o próprio sw sempre conferem no servidor (ignora o cache de
  // ~10 min do GitHub Pages): assim o app pega a versão nova na hora.
  const pagina = e.request.mode === "navigate" || url.pathname.endsWith("/") || /\.(html|json)$/.test(url.pathname);
  const pedido = pagina ? fetch(url.href, { cache: "no-cache", credentials: "same-origin" }) : fetch(e.request);
  e.respondWith(
    pedido
      .then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});
