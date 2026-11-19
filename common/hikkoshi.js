/*
 * 記録の おひっこし（全ゲーム共通）
 * ブラウザは 遊びの記録を「アドレス（サイト）ごと」に分けて保存する。
 * kudo12711-boop.github.io/last-two/ から games.hajimaruyo.com へ移ると、そのままでは記録が見えなくなるので、
 * 新しいアドレスで はじめて開いたときに、前のアドレスの記録を うつす。
 *
 * しくみ
 * 1) 新しいアドレスで はじめて開くと、前のアドレスにある「おひっこしページ」（別リポジトリ hikkoshi）へ一瞬とぶ。
 *    そこで localStorage（進み具合・設定・コイン・シールなど）を読み、URL の # に入れて もとのページへ もどる。
 * 2) 写真・録音など大きなもの（IndexedDB）があれば、画面の上に「うつす」ボタンを出す。
 *    押すと おひっこしページが小さな窓で開き、写真や録音を この ページへ わたして閉じる。
 * 前のアドレスでは何もしない（新しいアドレスのときだけ動く）。おひっこしページが見つからないときも何もしない。
 * 各ページの <head> の はじめのほうで（ゲームのプログラムより前に）読む。
 */
(function () {
  var BRIDGE = 'https://kudo12711-boop.github.io/hikkoshi/';
  var OLD_ORIGIN = 'https://kudo12711-boop.github.io';
  var host = location.hostname;
  var test = /^(localhost|127\.0\.0\.1)$/.test(host) && /[?&]hk-test=([^&#]+)/.exec(location.search);
  if (test) { BRIDGE = decodeURIComponent(test[1]); OLD_ORIGIN = new URL(BRIDGE).origin; try { sessionStorage.setItem('hk-test', BRIDGE); } catch (e) { } }
  else if (/^(localhost|127\.0\.0\.1)$/.test(host)) { try { var t = sessionStorage.getItem('hk-test'); if (t) { BRIDGE = t; OLD_ORIGIN = new URL(t).origin; } else return; } catch (e) { return; } }
  else if (!/(^|\.)hajimaruyo\.com$/.test(host)) return;

  var FLAG = 'asobi-hikkoshi';      // 'done' = おわり、'idb' = 写真・録音が まだ
  var ls; try { ls = window.localStorage; } catch (e) { return; }
  var state = ls.getItem(FLAG);
  var E = !/^ja/i.test((ls.getItem('games-lang') || navigator.language || 'ja'));

  // 1) もどってきたとき: # の中の記録を書きこむ
  var m = /#hk=([^&]*)(?:&hkidb=(\d))?/.exec(location.hash);
  var mine = false; try { mine = sessionStorage.getItem('hk-tried') === '1'; } catch (e) { }
  if (m && !state && mine) {   // この窓で こちらから おひっこしページへ行って もどってきたときだけ（よそからのリンクは うけつけない）
    try {
      var data = m[1] === '0' ? null : JSON.parse(decodeURIComponent(m[1]));
      if (data) for (var k in data) if (k !== FLAG) ls.setItem(k, data[k]);
      ls.setItem(FLAG, m[2] === '1' ? 'idb' : 'done');
      ls.setItem('asobi-hikkoshi-at', String(Date.now()));
    } catch (e) { ls.setItem(FLAG, 'done'); }
    var clean = location.href.replace(/#hk=[^#]*$/, '');
    try { history.replaceState(history.state, '', clean); } catch (e) { }
    state = ls.getItem(FLAG);
    // このファイルは ゲームのプログラムより先に動くので、ゲームは うつした記録を そのまま読む（読みなおし不要）
  }

  // まだなら おひっこしページへ（ページが あることを先に確かめる。なければ何もしない）
  if (!state) {
    // アプリ（Google Play など）として開いたときは前のアドレスへ行かない（アプリの外に出てしまうため）
    try { if (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || document.referrer.indexOf('android-app://') === 0) { ls.setItem(FLAG, 'done'); return; } } catch (e) { }
    var tried = false; try { tried = sessionStorage.getItem('hk-tried') === '1'; } catch (e) { }
    if (tried) return;
    try { sessionStorage.setItem('hk-tried', '1'); } catch (e) { }
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 2500);
    // この確認のあいだ、ゲームは ふつうに始まる（ページが あれば すぐに とぶ）
    fetch(BRIDGE + 'ok.txt', { cache: 'no-store', signal: ctl ? ctl.signal : undefined }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) return;
      location.replace(BRIDGE + '?back=' + encodeURIComponent(location.href.replace(/#.*$/, '')));
    }).catch(function () { });
    return;
  }

  // 2) 写真・録音（IndexedDB）を うつすボタン
  if (state !== 'idb') return;
  var T = E ? { msg: 'Move your photos and recordings from the old address?', go: 'Move', no: 'Not now', busy: 'Moving…', ok: 'Done!' }
            : { msg: '前のアドレスで とった 写真や 録音を うつしますか？', go: 'うつす', no: 'あとで', busy: 'うつしています…', ok: 'うつしました' };
  function bar() {
    if (document.getElementById('hk-bar')) return;
    var d = document.createElement('div'); d.id = 'hk-bar';
    d.setAttribute('style', 'position:fixed;left:8px;right:8px;top:calc(8px + env(safe-area-inset-top,0px));z-index:2147483000;background:#fff;color:#333;border-radius:14px;box-shadow:0 4px 18px rgba(0,0,0,.25);padding:10px 12px;font:15px/1.4 sans-serif;display:flex;gap:8px;align-items:center;flex-wrap:wrap');
    var s = document.createElement('span'); s.textContent = T.msg; s.style.flex = '1 1 180px';
    var b1 = document.createElement('button'); b1.textContent = T.go;
    var b2 = document.createElement('button'); b2.textContent = T.no;
    [b1, b2].forEach(function (b, i) { b.type = 'button'; b.setAttribute('style', 'border:0;border-radius:10px;padding:8px 14px;font:inherit;font-weight:700;' + (i ? 'background:#eee;color:#555' : 'background:#ff9f43;color:#fff')); });
    d.appendChild(s); d.appendChild(b1); d.appendChild(b2); document.body.appendChild(d);
    b2.onclick = function () { d.remove(); };
    b1.onclick = function () {
      var w = window.open(BRIDGE + '?mode=idb&to=' + encodeURIComponent(location.origin), 'hikkoshi', 'width=420,height=320');
      if (!w) return;
      s.textContent = T.busy; b1.disabled = true;
    };
  }
  window.addEventListener('message', function (ev) {
    if (ev.origin !== OLD_ORIGIN || !ev.data || ev.data.type !== 'hikkoshi-idb') return;
    importAll(ev.data.dbs || []).then(function () {
      ls.setItem(FLAG, 'done');
      var s = document.querySelector('#hk-bar span'); if (s) s.textContent = T.ok;
      setTimeout(function () { location.reload(); }, 800);
    }).catch(function () { var s = document.querySelector('#hk-bar span'); if (s) s.textContent = 'x'; });
  });
  function importAll(dbs) {
    return dbs.reduce(function (p, db) { return p.then(function () { return importDb(db); }); }, Promise.resolve());
  }
  function openDb(name, ver, stores) {
    return new Promise(function (res, rej) {
      var r = ver ? indexedDB.open(name, ver) : indexedDB.open(name);
      r.onupgradeneeded = function () {
        var d = r.result;
        stores.forEach(function (st) {
          if (d.objectStoreNames.contains(st.name)) return;
          var os = d.createObjectStore(st.name, { keyPath: st.keyPath, autoIncrement: st.autoIncrement });
          (st.indexes || []).forEach(function (ix) { try { os.createIndex(ix.name, ix.keyPath, { unique: ix.unique, multiEntry: ix.multiEntry }); } catch (e) { } });
        });
      };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; r.onblocked = function () { rej(new Error('blocked')); };
    });
  }
  function importDb(db) {
    return openDb(db.name, 0, db.stores).then(function (d) {
      var missing = db.stores.some(function (st) { return !d.objectStoreNames.contains(st.name); });
      if (!missing && d.version >= db.version) return d;
      var v = Math.max(d.version + (missing ? 1 : 0), db.version); d.close();
      return openDb(db.name, v, db.stores);
    }).then(function (d) {
      return new Promise(function (res, rej) {
        var names = db.stores.map(function (s) { return s.name; });
        if (!names.length) { d.close(); return res(); }
        var tx = d.transaction(names, 'readwrite');
        db.stores.forEach(function (st) {
          var os = tx.objectStore(st.name);
          st.values.forEach(function (v, i) { if (st.keyPath != null) os.put(v); else os.put(v, st.keys[i]); });
        });
        tx.oncomplete = function () { d.close(); res(); }; tx.onerror = function () { d.close(); rej(tx.error); };
      });
    });
  }
  if (document.body) bar(); else document.addEventListener('DOMContentLoaded', bar);
})();
