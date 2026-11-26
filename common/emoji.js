/* そろった 絵（2026-11-26〜）: 絵文字を Twemoji（CC-BY 4.0、© Twitter, Inc and other contributors）の SVG で 描く。
   スマホごとに 絵文字の 見た目が ちがう問題を なくす。ファイルは common/twemoji/<コード>.svg（つかうものだけ 置く）。
   つかいかた: Emo.draw(ctx, '🐶', x, y, size) … 中心に描く。まだ 読みこみ中・ファイルが ないときは false（そのときは ふつうの 絵文字で 描く）。
              Emo.prefetch(['🐶','🐱'])、Emo.img('🐶') で <img> 用の URL */
(function () {
  var base = (function () { var s = document.currentScript && document.currentScript.src; return s ? s.replace(/emoji\.js.*$/, 'twemoji/') : '../common/twemoji/'; })();
  var cache = {};
  function code(e) {
    var cps = Array.from(e).map(function (c) { return c.codePointAt(0).toString(16); });
    if (cps.indexOf('200d') < 0) cps = cps.filter(function (c) { return c !== 'fe0f'; });
    return cps.join('-');
  }
  function get(e) {
    var k = code(e), it = cache[k];
    if (!it) { it = cache[k] = { img: new Image(), ok: false, bad: false }; it.img.onload = function () { it.ok = true; }; it.img.onerror = function () { it.bad = true; }; it.img.src = base + k + '.svg'; }
    return it;
  }
  window.Emo = {
    url: function (e) { return base + code(e) + '.svg'; },
    prefetch: function (list) { list.forEach(get); },
    ready: function (e) { return get(e).ok; },
    draw: function (c, e, x, y, size) { var it = get(e); if (!it.ok) return false; c.drawImage(it.img, x - size / 2, y - size / 2, size, size); return true; },
    credit: 'Twemoji © Twitter, Inc and other contributors (CC-BY 4.0)'
  };
})();
