/* Service worker: guarda o app no aparelho para abrir e fazer chamada sem internet.
   Estratégia: tenta a rede primeiro (pega atualizações); sem rede, usa a cópia guardada. */
const CACHE = 'icm-app-v13';
const ARQUIVOS = [
  './', 'index.html', 'manifest.webmanifest', 'assets/favicon.svg', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/favicon.png', 'assets/apple-touch-icon.png', 'assets/icm-marca.png', 'assets/icm-logo-branca.png', 'assets/icm-logo-escura.png',
  'css/design-system.css', 'css/app.css', 'css/report.css', 'css/revista.css',
  'js/config.js', 'js/vendor/supabase.js', 'js/vendor/qrcode.min.js', 'js/vendor/jsQR.js',
  'js/core/util.js', 'js/core/icons.js', 'js/core/marca.js', 'js/core/auth.js', 'js/core/auth-supabase.js', 'js/core/ui.js',
  'js/data/constants.js', 'js/data/seed.js', 'js/data/seed-comunidade.js', 'js/data/seed-gestao.js', 'js/data/store.js', 'js/data/store-supabase.js',
  'js/data/api.js', 'js/data/api-comunidade.js', 'js/data/api-gestao.js', 'js/data/api-rotina.js', 'js/data/api-chat.js', 'js/data/api-financeiro.js', 'js/data/seed-financeiro.js',
  'js/pages/login.js', 'js/pages/dashboard.js', 'js/pages/alunos.js', 'js/pages/aluno-form.js', 'js/pages/aluno-detalhe.js',
  'js/pages/projetos.js', 'js/pages/turma.js', 'js/pages/eventos.js', 'js/pages/relatorios.js', 'js/pages/patrimonio.js',
  'js/pages/voluntarios.js', 'js/pages/espera.js', 'js/pages/reunioes.js', 'js/pages/certificados.js', 'js/pages/doadores.js',
  'js/pages/associados.js', 'js/pages/pesquisas.js', 'js/pages/agenda.js', 'js/pages/estoque.js', 'js/pages/equipe.js',
  'js/pages/avisos.js', 'js/pages/portal.js', 'js/pages/assinaturas.js', 'js/pages/rotina.js', 'js/pages/chamada.js',
  'js/pages/dados.js', 'js/pages/admin.js', 'js/pages/chat.js', 'js/pages/financeiro.js', 'js/pages/compras.js', 'js/pages/campanhas.js', 'js/pages/social.js', 'js/reports/reports-financeiro.js', 'js/reports/reports.js', 'js/reports/reports-comunidade.js', 'js/reports/relatorio-anual.js', 'js/app.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ARQUIVOS.map(a => c.add(a).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // só arquivos do próprio sistema
  e.respondWith(
    fetch(req).then(res => { if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
