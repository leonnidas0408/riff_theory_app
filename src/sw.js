// sw.js
// Service Worker que dá suporte a PWA/offline ao Riff Theory.
// Estratégia: cache-first com fallback de rede, e fallback final para o
// index.html quando offline e o recurso pedido não está em cache (útil para
// navegação SPA-like). Registrado em main.js via navigator.serviceWorker.register.

// Nome/versão do cache. Ao mudar algo relevante nos arquivos cacheados,
// incrementar esta versão força a limpeza do cache antigo em 'activate'.
const CACHE = 'rifftheory-v2';
// Arquivos pré-cacheados na instalação (o "app shell" mínimo para abrir offline).
// Observação: main.js, draw.js, util.js e resources.js não estão listados aqui,
// então só entram no cache dinamicamente na primeira vez que forem buscados
// (ver handler de 'fetch' abaixo).
const FILES = ['./', './index.html', './manifest.json'];

// Na instalação, baixa e guarda o app shell em cache, e ativa o novo SW
// imediatamente (sem esperar as abas antigas fecharem).
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES))
  );
  self.skipWaiting();
});

// Na ativação, remove caches de versões antigas (cujo nome != CACHE atual)
// e assume o controle das páginas já abertas.
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

// Estratégia de fetch: cache-first (serve do cache se existir), senão busca na
// rede, guarda uma cópia da resposta no cache para a próxima vez, e se a rede
// falhar (offline) cai para o index.html em cache (mantém o app "abrível").
self.addEventListener('fetch', e => e.respondWith(
  caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    const clone = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, clone));
    return res;
  }).catch(() => caches.match('./index.html')))
));
