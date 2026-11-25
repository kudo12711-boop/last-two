/*
 * オフラインでも遊べるようにする service worker（全ゲーム共通、common/app.js が登録する）
 * - ページ（HTML）: まずネットから新しいものを取りにいく。つながらないときだけ 保存したものを出す
 *   → ゲームを直したら、ネットにつながっている人には すぐ新しい版が出る。
 * - 絵・声・プログラムなど: 保存したものを すぐ出し、うしろでネットから新しいものに入れかえる。
 * - よそのサイト（天気・地名・対戦サーバーなど）は さわらない。フォントと決まった CDN だけ保存する。
 * - アプリとして開いたときは、common/app.js から「このゲームのファイルを まとめて保存して」が届く。
 * キャンピングカーは自分の camper/sw.js（お知らせ用）を使うので、ここでは関係しない。
 */
const RT = 'asobi-files-v1', META = 'asobi-meta-v1';
const SCOPE = new URL('./', self.location).pathname;
const CDN = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)\//;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('asobi-') && k !== RT && k !== META) await caches.delete(k);
  await self.clients.claim();
})()));

// 同じサイトのファイルは「?v=2」などを外した名前で保存する（版の数字が変わっても同じ場所に上書き）
function keyOf(url) {
  const u = new URL(url);
  if (u.origin !== self.location.origin) return u.href;
  return u.origin + u.pathname;
}
function isPage(req, u) {
  return req.mode === 'navigate' || req.destination === 'document' || u.pathname.endsWith('/') || u.pathname.endsWith('.html');
}
async function put(key, res) {
  if (!res || !(res.ok || res.type === 'opaque')) return;
  try { const c = await caches.open(RT); await c.put(key, res); } catch (e) { }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  const same = u.origin === self.location.origin && u.pathname.startsWith(SCOPE);
  if (!same && !CDN.test(u.href)) return;
  if (same && (/\/(sw\.js|app-files\.json)$/.test(u.pathname) || u.pathname.startsWith(SCOPE + 'camper/'))) return;
  if (req.headers.has('range')) return;          // 動画・音の一部だけの読みこみは ネットにまかせる
  const key = keyOf(req.url);

  if (same && isPage(req, u)) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) e.waitUntil(put(key, res.clone()));
        return res;
      } catch (err) {
        const hit = await (await caches.open(RT)).match(key, { ignoreSearch: true });
        if (hit) return hit;
        throw err;
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const hit = await (await caches.open(RT)).match(key);
    const net = fetch(req).then(res => { e.waitUntil(put(key, res.clone())); return res; });
    if (hit) { net.catch(() => { }); return hit; }
    return net;
  })());
});

// アプリとして開いたとき: このゲームのファイルを まとめて保存する（前と同じ版なら何もしない）
self.addEventListener('message', e => {
  const m = e.data || {};
  if (m.type !== 'precache' || !Array.isArray(m.files) || !m.base) return;
  const base = new URL(m.base);
  if (base.origin !== self.location.origin || !base.pathname.startsWith(SCOPE)) return;
  e.waitUntil((async () => {
    const meta = await caches.open(META), mk = base.href + '__asobi-version__';
    const old = await meta.match(mk);
    const force = !old || (await old.text()) !== m.version;
    const c = await caches.open(RT);
    const urls = m.files.map(f => new URL(f, base).href).filter(h => h.startsWith(self.location.origin + SCOPE));
    let i = 0, fail = 0;
    const work = async () => {
      while (i < urls.length) {
        const url = urls[i++], key = keyOf(url);
        if (!force && await c.match(key)) continue;
        try { const res = await fetch(url, { cache: force ? 'no-cache' : 'default' }); if (res.ok) await c.put(key, res); else fail++; } catch (err) { fail++; }
      }
    };
    await Promise.all([work(), work(), work(), work()]);
    if (!fail) await meta.put(mk, new Response(m.version));
  })());
});
