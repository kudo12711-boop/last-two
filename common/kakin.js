/*
 * kakin.js — あそびのいりぐち の ゲームで共通に使う「課金」のしくみ（おためし版）
 *
 * いまは「買うふり」です。ボタンを押しても お金は動かず、買ったことは
 * この端末の localStorage（キー: asobi-kakin-v1）にだけ記録されます。
 * 同じサイト（kudo12711-boop.github.io/last-two/）の ゲームどうしで共有されるので、
 * ファミリーパスを1回買えば、ほかのゲームでも「ぜんぶ あそべる」になります。
 *
 * 本物の支払いにするとき（アプリ化のとき）は、Kakin.provider を差しかえます。
 *   Kakin.provider = {
 *     buy: (product) => Promise<boolean>,   // App Store / Google Play / Stripe などで購入
 *     restore: () => Promise<string[]>,      // 買ったものの id 一覧（サーバーやストアから）
 *   };
 * 価格（PRODUCTS の price）は いまは仮の数字です。
 *
 * ゲーム側の使い方:
 *   <script src="../common/kakin.js"></script>
 *   Kakin.setup({ game: 'meiro', lang: () => 'ja', onChange: () => renderTitle(),
 *     name: { ja: 'ゆびで めいろ', en: 'Finger Maze' },
 *     free: { ja: 'むりょうで あそべるもの', en: '...' },
 *     full: { ja: 'ぜんぶ版で ふえるもの', en: '...' } });
 *   （noFull: true にすると「ぜんぶ版」を出さず、ファミリーパスだけを案内する）
 *   Kakin.full()          … このゲームの「ぜんぶ版」を持っているか（ファミリーパスでも true）
 *   Kakin.ask()           … 子どもが 🔒 をさわったとき。「おうちのひとに きいてね」→ おうちのかた確認 → お店
 *   Kakin.open()          … おうちのかた確認 → お店（せってい画面のボタン用）
 *   Kakin.parentButton()  … 「🔓 ぜんぶ あそぶ」ボタンの要素を作って返す
 *
 * 子ども向けの約束: 広告は出さない／買う画面の前に かならず「おとなの かくにん」／
 * 遊びの とちゅうで 買い物を すすめない／勝ち負けに 関わるものは 売らない。
 */
(function () {
  'use strict';
  var KEY = 'asobi-kakin-v1';
  var PASS_DAYS = 30;

  // 値段は仮。ゲームごとの「ぜんぶ版」は買い切り、ファミリーパスは月ごと。
  var PRICES = { full: 480, pass: 380 };

  var TEXT = {
    ja: {
      lockTitle: 'これは「ぜんぶ版」で あそべるよ',
      lockSub: 'おうちの ひとに きいてみてね',
      parentBtn: 'おうちのかた',
      back: 'もどる',
      gateTitle: 'おうちのかたへ',
      gateQ: (a, b) => '確認のため、こたえを えらんでください。\n' + a + ' × ' + b + ' = ?',
      gateNg: 'ちがうようです。もういちど どうぞ。',
      shopTitle: '🔓 もっと あそぶ',
      trial: 'いまは おためし版です。ボタンを押しても お金は かかりません（本物の支払いは、アプリにするときに入ります）。',
      freeHead: 'むりょうで あそべるもの',
      fullHead: 'ぜんぶ版で ふえるもの',
      fullName: (n) => '「' + n + '」ぜんぶ版',
      fullDesc: 'いちど買えば、ずっと ぜんぶ あそべます（買い切り）。',
      passName: '👪 ファミリーパス',
      passDesc: 'あそびのいりぐちの 子ども向けゲームが、ぜんぶ あそべます。キャンピングカーの追加ルートも ふくまれます。月ごと・いつでも やめられます。',
      perMonth: '／月',
      once: '（買い切り）',
      buy: (p) => '¥' + p + ' で買う',
      owned: '✓ もっています',
      passOn: (d) => '✓ 利用中（つぎの更新 ' + d + '）',
      passEnd: (d) => '✓ ' + d + ' まで使えます（更新しない）',
      cancel: '更新を とめる',
      resume: '更新を つづける',
      confirm: (name, p, sub) => name + '\n¥' + p + (sub ? ' ／月' : '') + ' で買いますか？\n（おためし: お金は かかりません）',
      yes: '買う（おためし）', no: 'やめる',
      thanks: 'ありがとうございます！ ぜんぶ あそべるように なりました',
      restore: '購入を復元', restored: '復元しました',
      reset: 'おためしの購入を ぜんぶ消す（テスト用）', resetDone: '消しました',
      close: 'とじる',
      promise: '広告は出しません。遊んでいる とちゅうに 買い物を すすめることも ありません。',
      unlockBtn: '🔓 ぜんぶ あそぶ（おうちのかたへ）',
      fullOk: '🔓 ぜんぶ版（ありがとうございます）',
    },
    en: {
      lockTitle: 'This is in the full version',
      lockSub: 'Ask a grown-up!',
      parentBtn: 'For grown-ups',
      back: 'Back',
      gateTitle: 'For grown-ups',
      gateQ: (a, b) => 'To continue, please choose the answer.\n' + a + ' × ' + b + ' = ?',
      gateNg: "That's not right. Please try again.",
      shopTitle: '🔓 Play more',
      trial: 'This is a trial version. Buttons do not charge any money (real payments will come with the app version).',
      freeHead: 'Free to play',
      fullHead: 'Added in the full version',
      fullName: (n) => n + ' — Full version',
      fullDesc: 'Buy once, play everything forever.',
      passName: '👪 Family Pass',
      passDesc: 'Unlocks every kids game in the game corner, plus the extra camper routes. Monthly, cancel anytime.',
      perMonth: '/mo',
      once: ' (one-time)',
      buy: (p) => 'Buy for ¥' + p,
      owned: '✓ Owned',
      passOn: (d) => '✓ Active (renews ' + d + ')',
      passEnd: (d) => '✓ Active until ' + d + ' (not renewing)',
      cancel: 'Stop renewing',
      resume: 'Keep renewing',
      confirm: (name, p, sub) => name + '\nBuy for ¥' + p + (sub ? ' /mo' : '') + '?\n(Trial: no money is charged)',
      yes: 'Buy (trial)', no: 'Cancel',
      thanks: 'Thank you! Everything is unlocked.',
      restore: 'Restore purchases', restored: 'Restored',
      reset: 'Clear all trial purchases (for testing)', resetDone: 'Cleared',
      close: 'Close',
      promise: 'No ads. We never suggest purchases in the middle of play.',
      unlockBtn: '🔓 Unlock everything (grown-ups)',
      fullOk: '🔓 Full version (thank you!)',
    },
  };

  var cfg = { game: 'game', lang: null, name: {}, free: {}, full: {}, onChange: null, noFull: false };

  function lang() {
    var l = (cfg.lang && cfg.lang()) || document.documentElement.lang || 'ja';
    l = String(l).slice(0, 2);
    return TEXT[l] ? l : 'en';
  }
  function T() { return TEXT[lang()]; }
  function pick(o) { if (!o) return ''; if (typeof o === 'string') return o; return o[lang()] || o.en || o.ja || ''; }

  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.owned) return s; } catch (e) {}
    return { owned: {}, pass: null };
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  // パスの期限（おためし版では、更新をとめていなければ期限が来たら自動で1か月のばす）
  function passState() {
    var s = load(); var p = s.pass; if (!p) return null;
    var now = Date.now();
    if (now > p.until) {
      if (p.renew) { while (now > p.until) p.until += PASS_DAYS * 864e5; save(s); }
      else return null;
    }
    return p;
  }
  function hasPass() { return !!passState(); }
  function owns(id) { return !!load().owned[id] || hasPass(); }
  function full(game) { return owns('full:' + (game || cfg.game)); }

  function changed() {
    try { if (cfg.onChange) cfg.onChange(); } catch (e) { console.error(e); }
    try { window.dispatchEvent(new CustomEvent('kakin-change')); } catch (e) {}
  }

  // 本物の支払いに差しかえる場所（いまは すぐ成功する「ふり」）
  var provider = {
    buy: function () { return Promise.resolve(true); },
    restore: function () { return Promise.resolve(Object.keys(load().owned)); },
  };

  /* ---------- 見た目 ---------- */
  var css = [
    '.kk-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(40,30,20,.55);display:flex;align-items:center;justify-content:center;padding:16px;',
    'font-family:"Hiragino Maru Gothic ProN","Rounded Mplus 1c","Kosugi Maru","Hiragino Sans","Noto Sans JP",system-ui,sans-serif;color:#3d3328;-webkit-user-select:none;user-select:none}',
    '.kk-box{background:#fffdf7;border-radius:22px;box-shadow:0 10px 40px rgba(0,0,0,.3);width:min(440px,100%);max-height:calc(100% - 8px);overflow:auto;padding:20px 18px 16px;text-align:left;line-height:1.55;font-size:15px}',
    '.kk-box h2{margin:0 0 8px;font-size:21px}.kk-box h3{margin:14px 0 4px;font-size:15px}',
    '.kk-note{font-size:13px;opacity:.75;margin:6px 0}',
    '.kk-trial{background:#fff1c9;border-radius:12px;padding:8px 10px;font-size:13px;margin:6px 0 10px}',
    '.kk-btn{display:block;width:100%;border:0;border-radius:16px;padding:13px 14px;margin:8px 0 0;font:inherit;font-size:17px;font-weight:700;cursor:pointer;background:#ff8a3d;color:#fff;box-shadow:0 3px 0 rgba(0,0,0,.18);touch-action:manipulation}',
    '.kk-btn.ghost{background:#efe6d6;color:#3d3328}.kk-btn.small{font-size:14px;padding:9px 12px;font-weight:600}',
    '.kk-link{display:block;margin:12px auto 0;border:0;background:none;font:inherit;font-size:12px;color:#8a7a66;text-decoration:underline;cursor:pointer}',
    '.kk-card{border:2px solid #f0dfbf;border-radius:16px;padding:12px;margin:10px 0;background:#fff}',
    '.kk-card b{font-size:17px}.kk-price{display:block;font-weight:700;color:#d2601a;margin-top:2px}',
    '.kk-tag{display:inline-block;margin-top:8px;padding:6px 10px;border-radius:10px;background:#dff5e6;color:#1f7a45;font-weight:700;font-size:14px}',
    '.kk-list{margin:2px 0;padding-left:1.2em;font-size:14px}',
    '.kk-q{white-space:pre-line;font-size:17px;margin:6px 0 4px}.kk-q b{font-size:26px}',
    '.kk-ans{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:10px}.kk-ans .kk-btn{margin:0;font-size:22px;background:#5a8dee}',
    '.kk-kid{text-align:center}.kk-kid .kk-big{font-size:72px;line-height:1.1;margin:4px 0}.kk-kid h2{font-size:22px}',
    '.kk-toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483001;background:#2f9e5b;color:#fff;padding:12px 18px;border-radius:16px;font:600 15px system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:calc(100% - 32px);text-align:center}',
    '.kk-lock{position:relative}.kk-lock::after{content:"🔒";position:absolute;right:4px;top:2px;font-size:18px;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.25));pointer-events:none}',
    '.kk-locked{opacity:.55;filter:grayscale(.5)}',
    '.kk-parent{border:0;border-radius:14px;padding:10px 14px;font:inherit;font-size:15px;font-weight:700;cursor:pointer;background:#fff1c9;color:#7a4a12;box-shadow:0 2px 0 rgba(0,0,0,.12)}',
  ].join('\n');
  function injectCss() {
    if (document.getElementById('kk-css')) return;
    var st = document.createElement('style'); st.id = 'kk-css'; st.textContent = css; document.head.appendChild(st);
  }
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(text, cls, fn) { var b = h('button', 'kk-btn' + (cls ? ' ' + cls : ''), text); b.type = 'button'; b.onclick = function (ev) { ev.stopPropagation(); fn && fn(); }; return b; }

  var ov = null;
  function overlay() {
    injectCss(); closeAll();
    ov = h('div', 'kk-ov'); var box = h('div', 'kk-box'); ov.appendChild(box);
    // 下のゲームに タッチが とおらないように
    ['pointerdown', 'touchstart', 'mousedown', 'click'].forEach(function (k) { ov.addEventListener(k, function (e) { e.stopPropagation(); }, { passive: true }); });
    document.body.appendChild(ov);
    return box;
  }
  function closeAll() { if (ov) { ov.remove(); ov = null; } }
  function toast(msg) {
    injectCss(); var t = h('div', 'kk-toast', msg); document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  function fmtDate(ms) { var d = new Date(ms); return lang() === 'ja' ? (d.getMonth() + 1) + '/' + d.getDate() : d.toLocaleDateString('en', { month: 'short', day: 'numeric' }); }

  /* ---------- 子どもが 🔒 をさわったとき ---------- */
  function ask(after) {
    var t = T(), box = overlay(); box.classList.add('kk-kid');
    box.appendChild(h('div', 'kk-big', '🔒'));
    box.appendChild(h('h2', null, t.lockTitle));
    box.appendChild(h('p', null, t.lockSub));
    box.appendChild(btn(t.back, '', closeAll));
    box.appendChild(btn('👪 ' + t.parentBtn, 'ghost small', function () { open(after); }));
  }

  /* ---------- おとなの かくにん（かけ算） ---------- */
  function gate(onOk) {
    var t = T(), box = overlay();
    var a = 3 + Math.floor(Math.random() * 7), b = 3 + Math.floor(Math.random() * 7), ans = a * b;
    var opts = [ans]; while (opts.length < 4) { var x = ans + (Math.floor(Math.random() * 9) - 4) * (Math.random() < .5 ? 1 : a); if (x > 0 && opts.indexOf(x) < 0) opts.push(x); }
    opts.sort(function () { return Math.random() - .5; });
    box.appendChild(h('h2', null, '👪 ' + t.gateTitle));
    box.appendChild(h('div', 'kk-q', t.gateQ(a, b)));
    var msg = h('div', 'kk-note', ''); box.appendChild(msg);
    var grid = h('div', 'kk-ans'); box.appendChild(grid);
    opts.forEach(function (v) {
      grid.appendChild(btn(String(v), '', function () {
        if (v === ans) onOk(); else { msg.textContent = t.gateNg; setTimeout(function () { gate(onOk); }, 900); }
      }));
    });
    box.appendChild(btn(t.close, 'ghost small', closeAll));
  }

  /* ---------- お店 ---------- */
  function open(after) { gate(function () { shop(after); }); }

  function shop(after) {
    var t = T(), box = overlay(), s = load(), p = passState();
    box.appendChild(h('h2', null, t.shopTitle));
    box.appendChild(h('div', 'kk-trial', t.trial));
    function list(head, o) {
      var items = pick(o); if (!items) return;
      box.appendChild(h('h3', null, head));
      var ul = h('ul', 'kk-list'); (Array.isArray(items) ? items : [items]).forEach(function (x) { ul.appendChild(h('li', null, x)); }); box.appendChild(ul);
    }
    list(t.freeHead, cfg.free); list(t.fullHead, cfg.full);

    // このゲームの ぜんぶ版（cfg.noFull のゲームは パスだけ）
    if (!cfg.noFull) {
    var name = pick(cfg.name), fid = 'full:' + cfg.game;
    var c1 = h('div', 'kk-card');
    c1.appendChild(h('b', null, t.fullName(name))); c1.appendChild(h('span', 'kk-price', '¥' + PRICES.full + t.once));
    c1.appendChild(h('div', 'kk-note', t.fullDesc));
    if (s.owned[fid]) c1.appendChild(h('div', 'kk-tag', t.owned));
    else c1.appendChild(btn(t.buy(PRICES.full), '', function () { buy(fid, t.fullName(name), PRICES.full, false, after); }));
    box.appendChild(c1);
    }

    // ファミリーパス
    var c2 = h('div', 'kk-card');
    c2.appendChild(h('b', null, t.passName)); c2.appendChild(h('span', 'kk-price', '¥' + PRICES.pass + t.perMonth));
    c2.appendChild(h('div', 'kk-note', t.passDesc));
    if (p) {
      c2.appendChild(h('div', 'kk-tag', p.renew ? t.passOn(fmtDate(p.until)) : t.passEnd(fmtDate(p.until))));
      c2.appendChild(btn(p.renew ? t.cancel : t.resume, 'ghost small', function () { var s2 = load(); s2.pass.renew = !s2.pass.renew; save(s2); shop(after); }));
    } else c2.appendChild(btn(t.buy(PRICES.pass) + t.perMonth, '', function () { buy('pass:family', t.passName, PRICES.pass, true, after); }));
    box.appendChild(c2);

    box.appendChild(h('div', 'kk-note', t.promise));
    box.appendChild(btn(t.close, 'ghost', closeAll));
    var r = h('button', 'kk-link', t.restore); r.type = 'button';
    r.onclick = function () { provider.restore().then(function () { toast(t.restored); changed(); shop(after); }); };
    box.appendChild(r);
    var z = h('button', 'kk-link', t.reset); z.type = 'button';
    z.onclick = function () { save({ owned: {}, pass: null }); toast(t.resetDone); changed(); shop(after); };
    box.appendChild(z);
  }

  function buy(id, name, price, sub, after) {
    var t = T(), box = overlay();
    box.appendChild(h('div', 'kk-q', t.confirm(name, price, sub)));
    box.appendChild(btn(t.yes, '', function () {
      provider.buy({ id: id, price: price, subscription: sub }).then(function (ok) {
        if (!ok) { shop(after); return; }
        var s = load();
        if (sub) s.pass = { since: Date.now(), until: Date.now() + PASS_DAYS * 864e5, renew: true };
        else s.owned[id] = Date.now();
        save(s); closeAll(); toast(t.thanks); changed();
        if (typeof after === 'function') after();
      });
    }));
    box.appendChild(btn(t.no, 'ghost', function () { shop(after); }));
  }

  function parentButton(cls) {
    var b = h('button', cls || 'kk-parent'); b.type = 'button';
    function upd() { b.textContent = full() ? T().fullOk : T().unlockBtn; }
    upd(); b.onclick = function (e) { e.stopPropagation(); open(); };
    window.addEventListener('kakin-change', upd); b._kkUpdate = upd;
    injectCss(); return b;
  }

  // ほかのタブで買ったときも反映
  window.addEventListener('storage', function (e) { if (e.key === KEY) changed(); });

  window.Kakin = {
    setup: function (o) { for (var k in o) cfg[k] = o[k]; injectCss(); return window.Kakin; },
    full: full, owns: owns, hasPass: hasPass,
    ask: ask, open: open, shop: shop, close: closeAll, parentButton: parentButton,
    prices: PRICES,
    get provider() { return provider; }, set provider(p) { provider = p; },
  };
})();
