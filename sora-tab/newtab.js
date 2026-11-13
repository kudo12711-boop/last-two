/*
 * そらタブ（Sky Tab）— 新しいタブを開くたびに、いまの時刻と天気の空が見えるページ
 * 空と景色は engine.js（もよう・背景メーカーと同じ部品）でプログラムが描きます。
 * Chrome 拡張では chrome.storage と chrome.search を使い、ふつうのページでは localStorage と Google 検索に切りかえます。
 * テスト用: ?hour=18.5&weather=rain&land=sea&lang=en
 */
(function () {
  'use strict';
  var B = window.Backdrop;
  var hasChrome = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  var KEY = 'soratab-v1';
  var T = {
    ja: {
      settings: 'せってい', place: '天気の場所', useHere: 'いまの場所を使う', noWeather: '天気を使わない', cityPh: '都市の名前（例: 大阪）', find: 'さがす',
      scenery: 'けしき', display: '表示', h12: '12時間表示（午前・午後）', showSearch: '検索ボックスを出す', anim: '雨や雪を動かす', language: 'ことば',
      privacy: '天気を使うときだけ、場所（緯度・経度）を Open-Meteo（無料の天気サービス）に送ります。それ以外は、この端末の中だけで動きます。',
      close: 'とじる', search: '検索', noPlace: '場所が決まっていません（天気なし）', notFound: '見つかりませんでした', geoFail: '場所がわかりませんでした。都市の名前でさがしてください',
      morning: 'おはようございます', day: 'こんにちは', evening: 'こんばんは', night: 'おやすみなさい',
      am: '午前', pm: '午後',
      w: { clear: 'はれ', cloudy: 'くもり', rain: 'あめ', snow: 'ゆき', fog: 'きり', storm: 'かみなり' },
      l: { auto: '日がわり', mountains: 'やま', sea: 'うみ', hills: 'おか', city: 'まち', none: 'そらだけ' }
    },
    en: {
      settings: 'Settings', place: 'Weather location', useHere: 'Use my location', noWeather: 'No weather', cityPh: 'City name (e.g. Paris)', find: 'Search',
      scenery: 'Scenery', display: 'Display', h12: '12-hour clock', showSearch: 'Show search box', anim: 'Animate rain and snow', language: 'Language',
      privacy: 'Only when weather is on, your location (latitude and longitude) is sent to Open-Meteo, a free weather service. Everything else stays on this device.',
      close: 'Close', search: 'Search the web', noPlace: 'No location set (weather off)', notFound: 'No results', geoFail: 'Could not get your location. Please search by city name.',
      morning: 'Good morning', day: 'Good afternoon', evening: 'Good evening', night: 'Good night',
      am: 'AM', pm: 'PM',
      w: { clear: 'Clear', cloudy: 'Cloudy', rain: 'Rain', snow: 'Snow', fog: 'Fog', storm: 'Thunderstorm' },
      l: { auto: 'Changes daily', mountains: 'Mountains', sea: 'Sea', hills: 'Hills', city: 'City', none: 'Sky only' }
    }
  };
  var q = new URLSearchParams(location.search);
  var cfg = { lang: 'auto', land: 'auto', h12: false, showSearch: true, anim: true, place: null, wx: null };
  var $ = function (id) { return document.getElementById(id); };

  function L() {
    var l = q.get('lang') || cfg.lang;
    if (l === 'auto') l = /^ja/i.test(navigator.language || '') ? 'ja' : 'en';
    return T[l] ? T[l] : T.en;
  }
  function langCode() { return L() === T.ja ? 'ja' : 'en'; }

  // ---- 保存 ----
  function load(cb) {
    if (hasChrome) chrome.storage.local.get(KEY, function (r) { if (r && r[KEY]) merge(r[KEY]); cb(); });
    else { try { merge(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {} cb(); }
  }
  function merge(o) { for (var k in o) if (k in cfg) cfg[k] = o[k]; }
  function save() {
    if (hasChrome) { var o = {}; o[KEY] = cfg; chrome.storage.local.set(o); }
    else { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} }
  }

  // ---- 時刻と空 ----
  function nowHour() {
    if (q.get('hour')) return +q.get('hour');
    var d = new Date(); return d.getHours() + d.getMinutes() / 60;
  }
  function daySeed() { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  function landNow() {
    if (q.get('land')) return q.get('land');
    if (cfg.land !== 'auto') return cfg.land;
    var lands = ['mountains', 'sea', 'hills', 'city'];
    return lands[daySeed() % lands.length];
  }
  function weatherNow() {
    if (q.get('weather')) return q.get('weather');
    return cfg.place && cfg.wx ? cfg.wx.kind : 'clear';
  }

  var sky = $('sky'), fx = $('fx'), lastSky = '';
  function drawSky(force) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
    var hour = Math.round(nowHour() * 12) / 12; // 5分ごとに描きなおす
    var key = [w, h, hour, weatherNow(), landNow()].join('|');
    if (!force && key === lastSky) return;
    lastSky = key;
    sky.width = w; sky.height = h; fx.width = w; fx.height = h;
    B.render(sky, { type: 'sky', hour: hour, weather: weatherNow(), land: landNow(), seed: daySeed() });
    var k = B.skyAt(hour);
    document.body.style.background = k.top;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function drawClock() {
    var d = new Date(), t = L(), hh = d.getHours(), mm = d.getMinutes();
    if (q.get('hour')) { var hq = +q.get('hour'); hh = Math.floor(hq); mm = Math.round((hq % 1) * 60); }
    var c = $('clock');
    if (cfg.h12) c.innerHTML = (hh % 12 || 12) + ':' + pad(mm) + '<small>' + (hh < 12 ? t.am : t.pm) + '</small>';
    else c.textContent = hh + ':' + pad(mm);
    $('greet').textContent = hh < 4 ? t.night : hh < 11 ? t.morning : hh < 17 ? t.day : hh < 23 ? t.evening : t.night;
    $('date').textContent = d.toLocaleDateString(langCode() === 'ja' ? 'ja-JP' : undefined, { month: 'long', day: 'numeric', weekday: 'long' });
    var wx = $('wx');
    if (cfg.place && cfg.wx) {
      wx.textContent = cfg.place.name + '  ' + t.w[cfg.wx.kind] + (cfg.wx.temp != null ? '  ' + Math.round(cfg.wx.temp) + '°' : '');
    } else if (q.get('weather')) wx.textContent = t.w[q.get('weather')] || '';
    else wx.textContent = '';
  }

  // ---- 天気（Open-Meteo、無料・登録なし） ----
  function kindOf(code) {
    if (code <= 1) return 'clear';
    if (code <= 3) return 'cloudy';
    if (code === 45 || code === 48) return 'fog';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if (code >= 95) return 'storm';
    return 'rain';
  }
  function fetchWeather(force) {
    if (!cfg.place) return;
    if (!force && cfg.wx && Date.now() - cfg.wx.at < 30 * 60 * 1000) return;
    var u = 'https://api.open-meteo.com/v1/forecast?latitude=' + cfg.place.lat.toFixed(2) + '&longitude=' + cfg.place.lon.toFixed(2) +
      '&current=temperature_2m,weather_code&timezone=auto';
    fetch(u).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.current) return;
      cfg.wx = { kind: kindOf(j.current.weather_code), temp: j.current.temperature_2m, at: Date.now() };
      save(); drawSky(); drawClock(); startFx();
    }).catch(function () {});
  }

  // ---- 雨と雪 ----
  var parts = [], fxOn = false, fxRaf = 0;
  function startFx() {
    var w = weatherNow(), ctx = fx.getContext('2d');
    var want = cfg.anim && (w === 'rain' || w === 'snow' || w === 'storm');
    cancelAnimationFrame(fxRaf);
    ctx.clearRect(0, 0, fx.width, fx.height);
    fxOn = want;
    if (!want) return;
    var n = w === 'snow' ? 140 : w === 'storm' ? 260 : 170, S = Math.sqrt(fx.width * fx.height) / 1000;
    parts = [];
    for (var i = 0; i < n; i++) parts.push({ x: Math.random() * fx.width, y: Math.random() * fx.height, z: 0.4 + Math.random() * 0.6, p: Math.random() * 6.28 });
    var last = performance.now(), flash = 0;
    function step(t) {
      if (!fxOn) return;
      var dt = Math.min(50, t - last) / 16.7; last = t;
      ctx.clearRect(0, 0, fx.width, fx.height);
      if (w === 'snow') {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        parts.forEach(function (o) {
          o.y += (0.6 + o.z * 1.2) * S * dt; o.p += 0.02 * dt; o.x += Math.sin(o.p) * 0.5 * S * dt;
          if (o.y > fx.height) { o.y = -5; o.x = Math.random() * fx.width; }
          ctx.beginPath(); ctx.arc(o.x, o.y, (1.2 + o.z * 2.2) * S, 0, 6.283); ctx.fill();
        });
      } else {
        ctx.strokeStyle = 'rgba(210,225,240,0.45)'; ctx.lineWidth = 1.2 * S; ctx.beginPath();
        parts.forEach(function (o) {
          var v = (14 + o.z * 12) * S * dt;
          o.y += v; o.x -= v * 0.12;
          if (o.y > fx.height) { o.y = -20 * S; o.x = Math.random() * fx.width * 1.1; }
          ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + 2.4 * o.z * S, o.y - 18 * o.z * S);
        });
        ctx.stroke();
        if (w === 'storm') {
          if (flash <= 0 && Math.random() < 0.002 * dt) flash = 1;
          if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (flash * 0.35) + ')'; ctx.fillRect(0, 0, fx.width, fx.height); flash -= 0.06 * dt; }
        }
      }
      fxRaf = requestAnimationFrame(step);
    }
    fxRaf = requestAnimationFrame(step);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { fxOn = false; cancelAnimationFrame(fxRaf); }
    else { drawSky(); drawClock(); fetchWeather(); startFx(); }
  });

  // ---- 検索 ----
  $('search').addEventListener('submit', function (e) {
    e.preventDefault();
    var text = $('q').value.trim(); if (!text) return;
    if (typeof chrome !== 'undefined' && chrome.search && chrome.search.query) chrome.search.query({ text: text, disposition: 'CURRENT_TAB' });
    else location.href = 'https://www.google.com/search?q=' + encodeURIComponent(text);
  });

  // ---- せってい ----
  function texts() {
    var t = L();
    document.documentElement.lang = langCode();
    document.title = langCode() === 'ja' ? 'そらタブ' : 'Sky Tab';
    document.querySelectorAll('[data-t]').forEach(function (el) { el.textContent = t[el.getAttribute('data-t')] || el.textContent; });
    document.querySelectorAll('[data-ph]').forEach(function (el) { el.placeholder = t[el.getAttribute('data-ph')] || ''; });
    $('q').placeholder = t.search;
    $('gear').title = t.settings;
    var ls = $('land'); ls.innerHTML = '';
    Object.keys(t.l).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = t.l[k]; ls.appendChild(o); });
    ls.value = cfg.land;
    $('h12').checked = cfg.h12; $('showSearch').checked = cfg.showSearch; $('anim').checked = cfg.anim; $('langSel').value = cfg.lang;
    $('search').style.display = cfg.showSearch ? '' : 'none';
    $('placeNow').textContent = cfg.place ? '📍 ' + cfg.place.name : t.noPlace;
  }
  function setPlace(p) {
    cfg.place = p; cfg.wx = null; save(); texts(); drawClock();
    if (p) fetchWeather(true); else { drawSky(); startFx(); }
  }
  $('gear').onclick = function () { $('panel').classList.remove('hidden'); };
  $('close').onclick = function () { $('panel').classList.add('hidden'); };
  $('panel').addEventListener('click', function (e) { if (e.target === $('panel')) $('panel').classList.add('hidden'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('panel').classList.add('hidden'); });
  $('geo').onclick = function () {
    if (!navigator.geolocation) { $('cities').textContent = L().geoFail; return; }
    navigator.geolocation.getCurrentPosition(function (pos) {
      var name = langCode() === 'ja' ? 'いまの場所' : 'My location';
      setPlace({ name: name, lat: pos.coords.latitude, lon: pos.coords.longitude });
      $('cities').textContent = '';
    }, function () { $('cities').textContent = L().geoFail; }, { timeout: 10000, maximumAge: 3600000 });
  };
  $('noWx').onclick = function () { setPlace(null); };
  $('cityForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('city').value.trim(); if (!name) return;
    var box = $('cities'); box.textContent = '…';
    fetch('https://geocoding-api.open-meteo.com/v1/search?count=6&language=' + langCode() + '&name=' + encodeURIComponent(name))
      .then(function (r) { return r.json(); }).then(function (j) {
        box.innerHTML = '';
        if (!j.results || !j.results.length) { box.textContent = L().notFound; return; }
        j.results.forEach(function (c) {
          var b = document.createElement('button'); b.className = 'btn';
          b.textContent = c.name + (c.admin1 ? ', ' + c.admin1 : '') + (c.country ? ', ' + c.country : '');
          b.onclick = function () { setPlace({ name: c.name, lat: c.latitude, lon: c.longitude }); box.innerHTML = ''; };
          box.appendChild(b);
        });
      }).catch(function () { box.textContent = L().notFound; });
  });
  $('land').onchange = function (e) { cfg.land = e.target.value; save(); drawSky(true); };
  $('h12').onchange = function (e) { cfg.h12 = e.target.checked; save(); drawClock(); };
  $('showSearch').onchange = function (e) { cfg.showSearch = e.target.checked; save(); texts(); };
  $('anim').onchange = function (e) { cfg.anim = e.target.checked; save(); startFx(); };
  $('langSel').onchange = function (e) { cfg.lang = e.target.value; save(); texts(); drawClock(); };

  var rs = 0;
  window.addEventListener('resize', function () { clearTimeout(rs); rs = setTimeout(function () { drawSky(true); startFx(); }, 150); });

  load(function () {
    texts(); drawSky(true); drawClock(); startFx(); fetchWeather();
    setInterval(function () { if (!document.hidden) { drawClock(); drawSky(); fetchWeather(); } }, 15000);
  });
})();
