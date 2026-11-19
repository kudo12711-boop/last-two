/*
 * アプリ用の小さなしくみ（全ゲーム共通）
 * - オフラインでも動くように、サイトの いちばん上の sw.js（service worker）を登録する。
 *   ふつうのブラウザでは「一度ひらいたもの」だけを保存する（スマホの通信量を むだにしないため）。
 * - アプリとして開いたとき（ホーム画面から・Google Play のアプリから）は、
 *   このゲームの app-files.json に書いてあるファイルを まとめて保存し、次からはネットなしでも遊べる。
 * 各ゲームの <head> に <script src="../common/app.js" defer></script>（tools/make_app.cjs が入れる）。
 */
(function () {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  var me = document.currentScript;
  if (!me || !me.src) return;
  var root = new URL('../', me.src);            // common/ の1つ上 = サイトの いちばん上
  var mm = function (q) { try { return matchMedia(q).matches; } catch (e) { return false; } };
  var isApp = mm('(display-mode: standalone)') || mm('(display-mode: fullscreen)') || mm('(display-mode: minimal-ui)') ||
    navigator.standalone === true || document.referrer.indexOf('android-app://') === 0 || /[?&]app=1(&|$)/.test(location.search);
  try { if (isApp) sessionStorage.setItem('asobi-app', '1'); else if (sessionStorage.getItem('asobi-app') === '1') isApp = true; } catch (e) { }

  function precache() {
    var dir = location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
    fetch(dir + 'app-files.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (list) {
      if (!list || !list.files) return;
      return navigator.serviceWorker.ready.then(function (reg) {
        if (reg.active) reg.active.postMessage({ type: 'precache', base: dir, version: list.version, files: list.files });
      });
    }).catch(function () { });
  }

  window.addEventListener('load', function () {
    navigator.serviceWorker.register(new URL('sw.js', root).href, { scope: root.href }).then(function () {
      if (isApp) precache();
    }).catch(function () { });
  });
})();
