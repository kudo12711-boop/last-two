/*
 * engine.js — プログラムで描く「背景・模様」の部品（Backdrop）
 *
 * 画像ファイルも AI も使わず、前もって書いた描き方だけで背景を作ります。
 * 同じ設定（種類・色・たね・こさ・大きさ…）なら、どの大きさで描いても同じ絵になります。
 * もよう・背景メーカー（moyou/）と、そらタブ（sora-tab/、Chrome の新しいタブ）で共通に使います。
 * sora-tab/engine.js はこのファイルのコピーです（sora-tab/build.sh でコピー）。
 *
 * 使い方:
 *   Backdrop.render(canvas, { type:'waves', palette:['#fff', ...5色], seed:123,
 *                             density:0.5, scale:0.5, soft:0.5, grain:0, tile:false })
 *   Backdrop.render(canvas, { type:'sky', hour:14.5, weather:'cloudy', land:'mountains', seed:1 })
 */
(function (root) {
  'use strict';

  // ---- 小さな道具 ----
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hex2rgb(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgb2hex(c) {
    return '#' + c.map(function (v) {
      v = Math.max(0, Math.min(255, Math.round(v)));
      return (v < 16 ? '0' : '') + v.toString(16);
    }).join('');
  }
  function mix(a, b, t) {
    var A = hex2rgb(a), B = hex2rgb(b);
    return rgb2hex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
  }
  function rgba(h, a) { var c = hex2rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function lum(h) { var c = hex2rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sortByLum(p) { return p.slice().sort(function (a, b) { return lum(a) - lum(b); }); }

  // 端をまたぐ図形を反対側にも描く（つなぎ目なし＝タイル用）
  function wrap(E, x, y, rad, fn) {
    fn(x, y);
    if (!E.o.tile) return;
    var w = E.w, h = E.h, dx, dy;
    for (dx = -1; dx <= 1; dx++) for (dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      var nx = x + dx * w, ny = y + dy * h;
      if (nx + rad > 0 && nx - rad < w && ny + rad > 0 && ny - rad < h) fn(nx, ny);
    }
  }
  function vgrad(E, top, bottom) {
    var g = E.ctx.createLinearGradient(0, 0, 0, E.h);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    E.ctx.fillStyle = g; E.ctx.fillRect(0, 0, E.w, E.h);
  }
  function accents(p) { return p.length > 1 ? p.slice(1) : p; }

  // ---- 種類ごとの描き方 ----

  function waves(E) {
    var ctx = E.ctx, w = E.w, h = E.h, S = E.S, r = E.r, p = E.p, o = E.o;
    vgrad(E, mix(p[0], '#ffffff', 0.3), p[0]);
    var ac = accents(p), n = 3 + Math.round(o.density * 6);
    var amp0 = (18 + o.scale * 100) * S, TAU = Math.PI * 2;
    for (var i = 0; i < n; i++) {
      var t = (i + 1) / (n + 1), base = h * (0.08 + 0.92 * t);
      var col = ac[Math.min(ac.length - 1, Math.floor(i * ac.length / n))];
      var k1 = 1 + Math.floor(r() * 3), k2 = 2 + Math.floor(r() * 5), k3 = 5 + Math.floor(r() * 6);
      var p1 = r() * TAU, p2 = r() * TAU, p3 = r() * TAU;
      var a1 = amp0 * (0.6 + r() * 0.6), a2 = amp0 * 0.4 * r(), a3 = amp0 * 0.12 * r();
      var yAt = function (x) {
        var u = x / w * TAU;
        return base + a1 * Math.sin(k1 * u + p1) + a2 * Math.sin(k2 * u + p2) + a3 * Math.sin(k3 * u + p3);
      };
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,' + (0.18 * o.soft) + ')';
      ctx.shadowBlur = 40 * S * o.soft; ctx.shadowOffsetY = -6 * S * o.soft;
      ctx.beginPath(); ctx.moveTo(0, h + 10);
      var step = Math.max(1, w / 400), x;
      for (x = 0; x <= w + step; x += step) ctx.lineTo(x, yAt(x));
      ctx.lineTo(w, h + 10); ctx.closePath();
      var g = ctx.createLinearGradient(0, base - a1, 0, h);
      g.addColorStop(0, col); g.addColorStop(1, mix(col, '#000000', 0.12));
      ctx.fillStyle = g; ctx.fill();
      ctx.restore();
      if (o.soft < 0.6) { // ふちの白い線
        ctx.beginPath();
        for (x = 0; x <= w + step; x += step) { var yy = yAt(x) + 3 * S; if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 * (1 - o.soft)) + ')'; ctx.lineWidth = 3 * S; ctx.stroke();
      }
    }
  }

  function cloudShape(ctx, cx, cy, size, r, color, shade, soft, S) {
    var k = 5 + Math.floor(r() * 4), puffs = [], j;
    for (j = 0; j < k; j++) {
      var u = k === 1 ? 0.5 : j / (k - 1), arc = Math.sin(u * Math.PI);
      puffs.push([cx + (u - 0.5) * size * 2.3, cy - arc * size * 0.45 * (0.6 + r() * 0.7), size * (0.32 + 0.38 * arc) * (0.8 + r() * 0.4)]);
    }
    function draw(dy, col) {
      ctx.fillStyle = col; ctx.beginPath();
      puffs.forEach(function (q) { ctx.moveTo(q[0] + q[2], q[1] + dy); ctx.arc(q[0], q[1] + dy, q[2], 0, Math.PI * 2); });
      ctx.fill();
    }
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = size * 0.5 * soft + 2 * S;
    draw(size * 0.1, shade);
    draw(0, color);
    ctx.restore();
  }

  function clouds(E) {
    var ctx = E.ctx, w = E.w, h = E.h, S = E.S, r = E.r, p = E.p, o = E.o;
    var sp = sortByLum(p), dark = sp[0], mid = sp[Math.floor(sp.length / 2)];
    var top = lum(dark) > 0.75 ? mix(sp[0], '#000000', 0.25) : dark;
    vgrad(E, top, mix(mid, '#ffffff', 0.45));
    var n = 4 + Math.round(o.density * 16), list = [];
    for (var i = 0; i < n; i++) list.push({ x: r() * w, y: h * (0.08 + r() * 0.9), s: (35 + o.scale * 150) * S * (0.45 + r() * 0.9), rr: r() });
    list.sort(function (a, b) { return a.s - b.s; });
    var white = mix('#ffffff', sp[sp.length - 1], 0.25);
    list.forEach(function (c) {
      var col = mix(white, top, 0.35 * (1 - c.s / ((185) * S)));
      var shade = mix(col, top, 0.3);
      wrap(E, c.x, c.y, c.s * 1.6, function (x, y) { cloudShape(ctx, x, y, c.s, rng(Math.floor(c.rr * 1e9)), col, shade, o.soft, S); });
    });
  }

  function dots(E) {
    var ctx = E.ctx, S = E.S, r = E.r, p = E.p, o = E.o, ac = accents(p);
    ctx.fillStyle = p[0]; ctx.fillRect(0, 0, E.w, E.h);
    var n = 30 + Math.round(o.density * 420);
    for (var i = 0; i < n; i++) {
      var x = r() * E.w, y = r() * E.h, q = r();
      var rad = (3 + o.scale * 36) * S * (0.3 + q * q * 1.8), col = ac[Math.floor(r() * ac.length)], ring = r() < 0.18;
      wrap(E, x, y, rad, function (X, Y) {
        ctx.beginPath(); ctx.arc(X, Y, rad, 0, Math.PI * 2);
        if (ring) { ctx.strokeStyle = col; ctx.lineWidth = rad * 0.35; ctx.stroke(); }
        else { ctx.fillStyle = col; ctx.fill(); }
      });
    }
  }

  function polka(E) {
    var ctx = E.ctx, w = E.w, h = E.h, S = E.S, p = E.p, o = E.o, ac = accents(p);
    ctx.fillStyle = p[0]; ctx.fillRect(0, 0, w, h);
    var sp = (24 + (1 - o.density) * 140) * S;
    var cols = Math.max(1, Math.round(w / sp)), rows = Math.max(2, Math.round(h / sp));
    if (rows % 2) rows++;
    var sx = w / cols, sy = h / rows, rad = Math.min(sx, sy) * (0.1 + o.scale * 0.32);
    var multi = E.r() < 0.5;
    for (var j = -1; j <= rows; j++) for (var i = -1; i <= cols; i++) {
      var x = (i + (j % 2 ? 0.5 : 0)) * sx + sx / 2, y = j * sy + sy / 2;
      var jj = ((j % rows) + rows) % rows;
      ctx.fillStyle = multi ? ac[((i + jj) % ac.length + ac.length) % ac.length] : ac[0];
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    }
  }

  function stripes(E) {
    var ctx = E.ctx, w = E.w, h = E.h, S = E.S, r = E.r, p = E.p, o = E.o;
    var angs = E.o.tile ? [0, 90] : [-45, 45, 0, 90, -30, 30];
    var ang = angs[Math.floor(r() * angs.length)] * Math.PI / 180;
    ctx.fillStyle = p[0]; ctx.fillRect(0, 0, w, h);
    var L = Math.sqrt(w * w + h * h), base = (8 + o.scale * 70) * S;
    // 1周ぶんの しま（色と太さ）
    var unit = [], k = 2 + Math.round(o.density * 5), total = 0, i;
    for (i = 0; i < k; i++) { var bw = base * (0.4 + r() * 1.6); unit.push([bw, i % 2 ? p[0] : p[1 + Math.floor(r() * (p.length - 1))]]); total += bw; }
    if (E.o.tile) { // 幅で割り切れるように
      var span = Math.abs(Math.cos(ang)) > 0.5 ? h : w, reps = Math.max(1, Math.round(span / total)), f = span / reps / total;
      unit.forEach(function (u) { u[0] *= f; }); total *= f;
    }
    ctx.save();
    if (E.o.tile) { // 0度は横じま、90度は たてじま。0から はじめて ちょうど割り切る
      if (Math.abs(Math.cos(ang)) < 0.5) { ctx.translate(w, 0); ctx.rotate(Math.PI / 2); }
      for (var y = 0, end = (Math.abs(Math.cos(ang)) > 0.5 ? h : w) - 0.5; y < end; )
        for (i = 0; i < unit.length; i++) { ctx.fillStyle = unit[i][1]; ctx.fillRect(-2, y, L + 4, unit[i][0] + 0.5); y += unit[i][0]; }
    } else {
      ctx.translate(w / 2, h / 2); ctx.rotate(ang);
      for (var y2 = -L; y2 < L; )
        for (i = 0; i < unit.length; i++) { ctx.fillStyle = unit[i][1]; ctx.fillRect(-L, y2, 2 * L, unit[i][0] + 0.5); y2 += unit[i][0]; }
    }
    ctx.restore();
  }

  function geometric(E) {
    var ctx = E.ctx, S = E.S, r = E.r, p = E.p, o = E.o, ac = accents(p);
    ctx.fillStyle = p[0]; ctx.fillRect(0, 0, E.w, E.h);
    var n = 18 + Math.round(o.density * 130), kinds = ['circle', 'ring', 'tri', 'square', 'plus', 'zig', 'half', 'line', 'dots3'];
    for (var i = 0; i < n; i++) {
      var x = r() * E.w, y = r() * E.h, s = (8 + o.scale * 55) * S * (0.6 + r() * 0.9);
      var kind = kinds[Math.floor(r() * kinds.length)], rot = r() * Math.PI * 2, col = ac[Math.floor(r() * ac.length)];
      (function (kind, s, rot, col) {
        wrap(E, x, y, s * 1.6, function (X, Y) {
          ctx.save(); ctx.translate(X, Y); ctx.rotate(rot);
          ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = s * 0.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath();
          if (kind === 'circle') { ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2); ctx.fill(); }
          else if (kind === 'ring') { ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2); ctx.stroke(); }
          else if (kind === 'tri') { ctx.moveTo(0, -s * 0.7); ctx.lineTo(s * 0.65, s * 0.45); ctx.lineTo(-s * 0.65, s * 0.45); ctx.closePath(); ctx.fill(); }
          else if (kind === 'square') { ctx.rect(-s * 0.45, -s * 0.45, s * 0.9, s * 0.9); ctx.stroke(); }
          else if (kind === 'plus') { ctx.moveTo(-s * 0.55, 0); ctx.lineTo(s * 0.55, 0); ctx.moveTo(0, -s * 0.55); ctx.lineTo(0, s * 0.55); ctx.stroke(); }
          else if (kind === 'zig') { ctx.moveTo(-s, 0); for (var z = 1; z <= 6; z++) ctx.lineTo(-s + z * s / 3, z % 2 ? -s * 0.3 : s * 0.3); ctx.stroke(); }
          else if (kind === 'half') { ctx.arc(0, 0, s * 0.7, 0, Math.PI); ctx.closePath(); ctx.fill(); }
          else if (kind === 'line') { ctx.moveTo(-s * 0.8, 0); ctx.lineTo(s * 0.8, 0); ctx.stroke(); }
          else { for (var d = -1; d <= 1; d++) { ctx.moveTo(d * s * 0.5 + s * 0.14, 0); ctx.arc(d * s * 0.5, 0, s * 0.14, 0, Math.PI * 2); } ctx.fill(); }
          ctx.restore();
        });
      })(kind, s, rot, col);
    }
  }

  // 両はしが同じ高さになる でこぼこ（タイルでもつながる）
  function ridge(r, n, rough) {
    var N = 1 << n, a = new Array(N + 1), step, i, amp = 1;
    a[0] = a[N] = 0;
    for (step = N; step > 1; step >>= 1) {
      for (i = step / 2; i < N; i += step) a[i] = (a[i - step / 2] + a[i + step / 2]) / 2 + (r() * 2 - 1) * amp;
      amp *= rough;
    }
    return a;
  }

  function mountains(E) {
    var ctx = E.ctx, w = E.w, h = E.h, S = E.S, r = E.r, p = E.p, o = E.o;
    var sp = sortByLum(p), near = sp[0], skyTop = sp[Math.max(1, sp.length - 3)] || p[1], horizon = sp[sp.length - 1];
    vgrad(E, skyTop, horizon);
    // 太陽（または月）
    var sx = w * (0.15 + r() * 0.7), sy = h * (0.18 + r() * 0.25), sr = (25 + o.scale * 70) * S;
    var sunCol = mix(horizon, '#ffffff', 0.55);
    var g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 4);
    g.addColorStop(0, rgba(sunCol, 0.55)); g.addColorStop(1, rgba(sunCol, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = sunCol; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    var n = 3 + Math.round(o.density * 4);
    for (var i = 0; i < n; i++) {
      var t = n === 1 ? 1 : i / (n - 1), base = h * (0.42 + 0.48 * t);
      var col = mix(near, horizon, 0.78 * (1 - t));
      var hts = ridge(r, 8, 0.52 + 0.08 * (1 - o.soft)), amp = h * (0.07 + 0.1 * (1 - t)) * (0.6 + o.scale * 0.8);
      var mx = Math.max.apply(null, hts.map(Math.abs)) || 1;
      ctx.beginPath(); ctx.moveTo(0, h);
      for (var k = 0; k < hts.length; k++) ctx.lineTo(k / (hts.length - 1) * w, base - hts[k] / mx * amp);
      ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
      if (i < n - 1) { // もや
        var mg = ctx.createLinearGradient(0, base - amp * 0.2, 0, base + h * 0.12);
        mg.addColorStop(0, rgba(horizon, 0)); mg.addColorStop(1, rgba(horizon, 0.45 * o.soft + 0.1));
        ctx.fillStyle = mg; ctx.fillRect(0, base - amp * 0.2, w, h * 0.14 + amp * 0.2);
      }
    }
  }

  function stars(E) {
    var ctx = E.ctx, w = E.w, h = E.h, S = E.S, r = E.r, p = E.p, o = E.o;
    var sp = sortByLum(p), bg = mix(sp[0], '#000000', lum(sp[0]) > 0.3 ? 0.7 : 0.25);
    vgrad(E, bg, mix(sp[1] || bg, bg, 0.45));
    var tints = sp.slice(2);
    if (o.density > 0.25) { // 天の川
      var a = -0.5 + r(), cx = w / 2, cy = h / 2, ux = Math.cos(a), uy = Math.sin(a), L = Math.sqrt(w * w + h * h);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      var bg2 = ctx.createLinearGradient(0, -h * 0.25, 0, h * 0.25);
      var mc = tints[0] || '#a0b0ff';
      bg2.addColorStop(0, rgba(mc, 0)); bg2.addColorStop(0.5, rgba(mc, 0.18 * o.density)); bg2.addColorStop(1, rgba(mc, 0));
      ctx.fillStyle = bg2; ctx.fillRect(-L, -h * 0.25, 2 * L, h * 0.5); ctx.restore();
      var m = Math.round(800 * o.density);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (var i = 0; i < m; i++) {
        var d = (r() - 0.5) * L, off = (r() + r() + r() - 1.5) * h * 0.12;
        var x = cx + ux * d - uy * off, y = cy + uy * d + ux * off;
        ctx.fillRect(x, y, 1.1 * S, 1.1 * S);
      }
    }
    var n = 150 + Math.round(o.density * 1100);
    for (var j = 0; j < n; j++) {
      var X = r() * w, Y = r() * h, q = r(), rad = (0.4 + q * q * q * 2.2) * S * (0.6 + o.scale), col = tints.length && r() < 0.3 ? mix('#ffffff', tints[Math.floor(r() * tints.length)], 0.5) : '#ffffff';
      var bright = r() < 0.035;
      (function (rad, col, bright) {
        wrap(E, X, Y, rad * 8, function (x, y) {
          if (bright) {
            var gg = ctx.createRadialGradient(x, y, 0, x, y, rad * 7);
            gg.addColorStop(0, rgba(col, 0.6)); gg.addColorStop(1, rgba(col, 0));
            ctx.fillStyle = gg; ctx.fillRect(x - rad * 7, y - rad * 7, rad * 14, rad * 14);
            ctx.strokeStyle = rgba(col, 0.7); ctx.lineWidth = rad * 0.35; ctx.beginPath();
            ctx.moveTo(x - rad * 6, y); ctx.lineTo(x + rad * 6, y); ctx.moveTo(x, y - rad * 6); ctx.lineTo(x, y + rad * 6); ctx.stroke();
          }
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
        });
      })(rad, col, bright);
    }
    if (r() < 0.6 && !o.tile) { // 三日月
      var mx = w * (0.15 + r() * 0.7), my = h * (0.15 + r() * 0.35), mr = (20 + o.scale * 50) * S;
      var gm = ctx.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 3.5);
      gm.addColorStop(0, 'rgba(255,250,220,0.25)'); gm.addColorStop(1, 'rgba(255,250,220,0)');
      ctx.fillStyle = gm; ctx.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
      var mc2 = document.createElement('canvas'), R = Math.ceil(mr) + 2; mc2.width = mc2.height = R * 2;
      var m2 = mc2.getContext('2d');
      m2.fillStyle = '#fff6d8'; m2.beginPath(); m2.arc(R, R, mr, 0, Math.PI * 2); m2.fill();
      m2.globalCompositeOperation = 'destination-out';
      m2.beginPath(); m2.arc(R + mr * 0.45, R - mr * 0.2, mr * 0.92, 0, Math.PI * 2); m2.fill();
      ctx.drawImage(mc2, mx - R, my - R);
    }
  }

  function bokeh(E) {
    var ctx = E.ctx, w = E.w, h = E.h, S = E.S, r = E.r, p = E.p, o = E.o;
    var sp = sortByLum(p), bg = mix(sp[0], '#000000', lum(sp[0]) > 0.3 ? 0.75 : 0.35);
    vgrad(E, bg, mix(sp[1] || bg, bg, 0.6));
    var ac = sp.slice(1), n = 14 + Math.round(o.density * 70);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (var i = 0; i < n; i++) {
      var x = r() * w, y = r() * h, rad = (8 + o.scale * 90) * S * (0.35 + r() * 0.9), col = ac[Math.floor(r() * ac.length)], al = 0.15 + r() * 0.35;
      (function (rad, col, al) {
        wrap(E, x, y, rad, function (X, Y) {
          var g = ctx.createRadialGradient(X, Y, 0, X, Y, rad);
          var edge = 1 - 0.25 * o.soft;
          g.addColorStop(0, rgba(col, al * 0.7)); g.addColorStop(edge * 0.85, rgba(col, al * 0.8));
          g.addColorStop(edge, rgba(col, al * (1.2 - o.soft * 0.6))); g.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, rad, 0, Math.PI * 2); ctx.fill();
        });
      })(rad, col, al);
    }
    ctx.restore();
  }

  function blobs(E) {
    var ctx = E.ctx, w = E.w, h = E.h, r = E.r, p = E.p, o = E.o, ac = accents(p);
    ctx.fillStyle = p[0]; ctx.fillRect(0, 0, w, h);
    var k = 3 + Math.round(o.density * 6), D = Math.sqrt(w * w + h * h);
    for (var i = 0; i < k; i++) {
      var x = r() * w, y = r() * h, rad = D * (0.18 + o.scale * 0.4) * (0.6 + r() * 0.6), col = ac[i % ac.length];
      var g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, rgba(col, 0.95)); g.addColorStop(0.35 + 0.4 * (1 - o.soft), rgba(col, 0.55)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
  }

  // ---- そら（時刻と天気で変わる空と景色） ----
  var SKY_KEYS = [ // 時刻, 上の色, 地平線の色, 明るさ
    [0, '#070b24', '#1a2148', 0.08], [4.5, '#0d1333', '#2a2c58', 0.1], [5.4, '#232a5c', '#7b5a86', 0.22],
    [6.2, '#4a69a8', '#f7b27a', 0.5], [7.5, '#5b9ad8', '#f4dcb6', 0.8], [10, '#3d8be0', '#bfe1f8', 1],
    [15.5, '#4089dc', '#c6e3f6', 1], [17.2, '#4d7fc0', '#f2cf9c', 0.85], [18.3, '#3d4c8c', '#f08758', 0.6],
    [19.2, '#272c60', '#9c5579', 0.32], [20.3, '#0f1538', '#2c2d5c', 0.12], [24, '#070b24', '#1a2148', 0.08]
  ];
  function skyAt(hour) {
    hour = ((hour % 24) + 24) % 24;
    for (var i = 0; i < SKY_KEYS.length - 1; i++) {
      var a = SKY_KEYS[i], b = SKY_KEYS[i + 1];
      if (hour >= a[0] && hour <= b[0]) {
        var t = (hour - a[0]) / (b[0] - a[0] || 1);
        return { top: mix(a[1], b[1], t), bottom: mix(a[2], b[2], t), light: a[3] + (b[3] - a[3]) * t };
      }
    }
    return { top: SKY_KEYS[0][1], bottom: SKY_KEYS[0][2], light: 0.08 };
  }
  var WEATHER = { // 灰色にする量, 雲の数, 雲の暗さ
    clear: [0, 3, 0], cloudy: [0.5, 14, 0.25], rain: [0.7, 18, 0.5], snow: [0.55, 12, 0.1], fog: [0.65, 6, 0.15], storm: [0.85, 20, 0.7]
  };

  function sky(E) {
    var ctx = E.ctx, w = E.w, h = E.h, S = E.S, r = E.r, o = E.o;
    var hour = o.hour == null ? 12 : o.hour, wt = WEATHER[o.weather] || WEATHER.clear, k = skyAt(hour);
    var gray = k.light > 0.4 ? '#9aa3ae' : '#2a2e38';
    if (o.weather === 'snow') gray = k.light > 0.4 ? '#c7cfd8' : '#3a4050';
    var top = mix(k.top, gray, wt[0]), bot = mix(k.bottom, gray, wt[0] * 0.8);
    vgrad(E, top, bot);
    var horizonY = h * 0.72;
    // 星
    var night = clamp((0.35 - k.light) / 0.27, 0, 1) * (1 - wt[0]);
    if (night > 0.02) {
      var sr = rng(E.seed + 7);
      for (var i = 0; i < 350; i++) {
        var x = sr() * w, y = sr() * horizonY, q = sr();
        ctx.fillStyle = 'rgba(255,255,255,' + (night * (0.3 + q * 0.7)) + ')';
        var s = (0.5 + q * q * 1.8) * S; ctx.fillRect(x, y, s, s);
      }
    }
    // 太陽・月
    function body(t, isSun) {
      var x = w * (0.08 + 0.84 * t), y = horizonY - Math.sin(Math.PI * t) * h * 0.58;
      var rad = (isSun ? 34 : 26) * S, warm = isSun ? clamp(1 - Math.sin(Math.PI * t) * 2.2, 0, 1) : 0;
      var col = isSun ? mix('#fff6d6', '#ff9a4d', warm) : '#f4f1e2';
      var vis = 1 - wt[0] * 0.85;
      var g = ctx.createRadialGradient(x, y, rad * 0.5, x, y, rad * (isSun ? 7 : 4));
      g.addColorStop(0, rgba(col, (isSun ? 0.55 : 0.25) * vis)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(x - rad * 8, y - rad * 8, rad * 16, rad * 16);
      ctx.fillStyle = rgba(col, Math.max(0.15, vis)); ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
      return { x: x, y: y, col: col };
    }
    var sunT = (hour - 5.8) / 13, light = null;
    if (sunT > -0.02 && sunT < 1.02) light = body(clamp(sunT, 0, 1), true);
    var moonH = (hour + 24 - 18.5) % 24, moonT = moonH / 11;
    if (moonT >= 0 && moonT <= 1 && (sunT < 0 || sunT > 1)) body(moonT, false);
    // 雲
    var cn = wt[1] + Math.round(r() * 3), cloudBase = mix('#ffffff', bot, 0.25 + 0.4 * (1 - k.light));
    cloudBase = mix(cloudBase, '#5d636e', wt[2] * k.light + (1 - k.light) * 0.6);
    var cs = [];
    for (var c = 0; c < cn; c++) cs.push({ x: r() * w * 1.2 - w * 0.1, y: h * (0.05 + r() * 0.55), s: (40 + r() * 110) * S, rr: r() });
    cs.sort(function (a, b) { return a.s - b.s; });
    cs.forEach(function (q) {
      var col = mix(cloudBase, top, 0.3 * (1 - q.s / (150 * S)));
      if (light && k.light < 0.85) col = mix(col, light.col, 0.25 * (1 - k.light));
      cloudShape(ctx, q.x, q.y, q.s, rng(Math.floor(q.rr * 1e9)), col, mix(col, top, 0.25), 0.6, S);
    });
    // 地面
    drawLand(E, o.land || 'mountains', horizonY, k, top, bot, light);
    if (o.weather === 'fog') {
      var fg = ctx.createLinearGradient(0, h * 0.3, 0, h);
      fg.addColorStop(0, rgba(bot, 0)); fg.addColorStop(0.5, rgba(mix(bot, '#ffffff', 0.3), 0.75)); fg.addColorStop(1, rgba(mix(bot, '#ffffff', 0.3), 0.55));
      ctx.fillStyle = fg; ctx.fillRect(0, 0, w, h);
    }
  }

  function drawLand(E, land, hy, k, top, bot, light) {
    var ctx = E.ctx, w = E.w, h = E.h, S = E.S, o = E.o, lr = rng(E.seed * 31 + 5);
    var dim = 0.25 + 0.75 * k.light, snowy = o.weather === 'snow';
    function shade(c) { return mix(mix('#0b0f1c', c, dim), bot, 0.12); }
    if (land === 'none') return;
    if (land === 'sea') {
      var sea = ctx.createLinearGradient(0, hy, 0, h);
      sea.addColorStop(0, mix(bot, '#1d4f73', 0.45)); sea.addColorStop(1, shade('#123a59'));
      ctx.fillStyle = sea; ctx.fillRect(0, hy, w, h - hy);
      ctx.strokeStyle = rgba(mix(bot, '#ffffff', 0.4), 0.35); ctx.lineWidth = 1.5 * S;
      for (var i = 0; i < 40; i++) {
        var y = hy + Math.pow(lr(), 1.6) * (h - hy), len = (20 + lr() * 60) * S * (1 + (y - hy) / (h - hy) * 2), x = lr() * w;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
      }
      if (light) { // 光の道
        var g = ctx.createLinearGradient(0, hy, 0, h);
        g.addColorStop(0, rgba(light.col, 0.6)); g.addColorStop(1, rgba(light.col, 0));
        ctx.fillStyle = g;
        for (var j = 0; j < 26; j++) { var yy = hy + j * (h - hy) / 26, ww = (10 + j * 6) * S * (0.5 + lr()); ctx.fillRect(light.x - ww / 2, yy, ww, 2 * S); }
      }
      return;
    }
    if (land === 'city') {
      var fx = mix(shade('#3a4a66'), bot, 0.35);
      ctx.fillStyle = fx;
      for (var x0 = 0; x0 < w; ) { var bw = (25 + lr() * 50) * S, bh = (30 + lr() * 90) * S; ctx.fillRect(x0, hy - bh * 0.7, bw - 2 * S, h); x0 += bw; }
      var near = shade('#202a3c'), lit = k.light < 0.45;
      for (var x1 = 0; x1 < w; ) {
        var bw2 = (35 + lr() * 70) * S, bh2 = (20 + lr() * 105) * S, by = hy - bh2 + 50 * S;
        ctx.fillStyle = near; ctx.fillRect(x1, by, bw2 - 3 * S, h - by);
        if (lit) for (var wy = by + 8 * S; wy < h; wy += 12 * S) for (var wx = x1 + 6 * S; wx < x1 + bw2 - 10 * S; wx += 10 * S)
          if (lr() < 0.35) { ctx.fillStyle = 'rgba(255,214,140,' + (0.5 + lr() * 0.5) + ')'; ctx.fillRect(wx, wy, 4 * S, 5 * S); }
        x1 += bw2;
      }
      return;
    }
    if (land === 'hills') {
      for (var hl = 0; hl < 3; hl++) {
        var base = hy + hl * 40 * S, col = shade(mix(snowy ? '#e8eef5' : '#5f9a4f', bot, 0.45 - hl * 0.2));
        var a1 = (20 + lr() * 25) * S, f1 = 1 + Math.floor(lr() * 3), p1 = lr() * 7, f2 = 3 + Math.floor(lr() * 3), p2 = lr() * 7;
        ctx.beginPath(); ctx.moveTo(0, h);
        for (var x2 = 0; x2 <= w; x2 += w / 200) { var u = x2 / w * Math.PI * 2; ctx.lineTo(x2, base - a1 * Math.sin(f1 * u + p1) - a1 * 0.3 * Math.sin(f2 * u + p2)); }
        ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
        if (hl === 2) { // 木
          for (var t = 0; t < 14; t++) {
            var tx = lr() * w, u2 = tx / w * Math.PI * 2, ty = base - a1 * Math.sin(f1 * u2 + p1) - a1 * 0.3 * Math.sin(f2 * u2 + p2), ts = (10 + lr() * 14) * S;
            ctx.fillStyle = shade(snowy ? '#9fb2bf' : '#2f6a3a');
            ctx.beginPath(); ctx.moveTo(tx, ty - ts * 2.2); ctx.lineTo(tx + ts * 0.8, ty + 2 * S); ctx.lineTo(tx - ts * 0.8, ty + 2 * S); ctx.fill();
          }
        }
      }
      return;
    }
    // mountains
    for (var m = 0; m < 3; m++) {
      var base2 = hy + m * 45 * S, hts = ridge(lr, 7, 0.5), mx = Math.max.apply(null, hts.map(Math.abs)) || 1;
      var amp = (h * 0.16) * (1 - m * 0.25), col2 = shade(mix(snowy ? '#dfe7ef' : '#3f6a5a', bot, 0.55 - m * 0.25));
      ctx.beginPath(); ctx.moveTo(0, h);
      for (var q = 0; q < hts.length; q++) ctx.lineTo(q / (hts.length - 1) * w, base2 - (hts[q] / mx + 0.4) * amp * 0.75);
      ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = col2; ctx.fill();
    }
  }

  // 粒（フィルムのざらざら）
  function grain(E) {
    if (!(E.o.grain > 0)) return;
    var ctx = E.ctx, img;
    try { img = ctx.getImageData(0, 0, E.w, E.h); } catch (e) { return; }
    var d = img.data, amt = E.o.grain * 50, a = 12345;
    for (var i = 0; i < d.length; i += 4) {
      a = (a * 1103515245 + 12345) & 0x7fffffff;
      var n = ((a >> 8) / 8388608 - 0.5) * amt;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  }

  var TYPES = [
    { id: 'waves', ja: 'なみ', en: 'Waves', fn: waves, tile: 'x', pal: 'umi' },
    { id: 'clouds', ja: 'くも', en: 'Clouds', fn: clouds, tile: 'xy', pal: 'pastel' },
    { id: 'mountains', ja: 'やまなみ', en: 'Mountains', fn: mountains, tile: 'x', pal: 'yuyake' },
    { id: 'stars', ja: 'ほしぞら', en: 'Starry sky', fn: stars, tile: 'xy', pal: 'yozora' },
    { id: 'blobs', ja: 'グラデーション', en: 'Gradient', fn: blobs, tile: '', pal: 'sakura' },
    { id: 'bokeh', ja: 'ひかりの つぶ', en: 'Bokeh', fn: bokeh, tile: 'xy', pal: 'neon' },
    { id: 'dots', ja: 'つぶつぶ', en: 'Confetti', fn: dots, tile: 'xy', pal: 'vivid' },
    { id: 'polka', ja: 'みずたま', en: 'Polka dots', fn: polka, tile: 'xy', pal: 'kohaku' },
    { id: 'stripes', ja: 'しましま', en: 'Stripes', fn: stripes, tile: 'xy', pal: 'mint' },
    { id: 'geometric', ja: 'かたち', en: 'Shapes', fn: geometric, tile: 'xy', pal: 'vivid' },
    { id: 'sky', ja: 'そらと けしき', en: 'Sky & scenery', fn: sky, tile: '', pal: null }
  ];
  var PALETTES = [
    { id: 'pastel', ja: 'パステル', en: 'Pastel', c: ['#fdf6ec', '#f7c6c7', '#c3e5e0', '#f9e3a3', '#cdb4db'] },
    { id: 'umi', ja: 'うみ', en: 'Ocean', c: ['#e8f6fb', '#8fd3e8', '#3aa0c8', '#1d6a96', '#0b3c5d'] },
    { id: 'yuyake', ja: 'ゆうやけ', en: 'Sunset', c: ['#2b1d3a', '#6a2c70', '#b83b5e', '#f08a5d', '#f9c784'] },
    { id: 'mori', ja: 'もり', en: 'Forest', c: ['#eef3e2', '#a3c585', '#5b8c51', '#2f5233', '#c9a66b'] },
    { id: 'yozora', ja: 'よぞら', en: 'Night', c: ['#0b1030', '#24305e', '#f8e9a1', '#a8d0e6', '#f76c6c'] },
    { id: 'mono', ja: 'モノクロ', en: 'Mono', c: ['#f5f5f5', '#d9d9d9', '#9e9e9e', '#5c5c5c', '#1f1f1f'] },
    { id: 'vivid', ja: 'ビビッド', en: 'Vivid', c: ['#fff8e7', '#ff5e5b', '#00cecb', '#ffed66', '#3d5a80'] },
    { id: 'kusumi', ja: 'くすみ', en: 'Muted', c: ['#f2ede4', '#c8b6a6', '#a4907c', '#8d7b68', '#e1d4bb'] },
    { id: 'sakura', ja: 'さくら', en: 'Blossom', c: ['#fff5f7', '#ffc2d1', '#ff8fab', '#fb6f92', '#b5e48c'] },
    { id: 'neon', ja: 'ネオン', en: 'Neon', c: ['#0d0221', '#ff2a6d', '#05d9e8', '#d1f7ff', '#7700a6'] },
    { id: 'kohaku', ja: 'こはく', en: 'Amber', c: ['#fffbf0', '#ffd166', '#ef8354', '#8a5a44', '#4f6d7a'] },
    { id: 'mint', ja: 'ミント', en: 'Mint', c: ['#f1faee', '#a8dadc', '#457b9d', '#1d3557', '#e63946'] }
  ];

  function render(canvas, opts) {
    var ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    var o = {
      type: 'waves', palette: PALETTES[0].c, seed: 1, density: 0.5, scale: 0.5, soft: 0.5, grain: 0, tile: false
    };
    for (var key in opts) if (opts[key] !== undefined) o[key] = opts[key];
    var type = TYPES.filter(function (t) { return t.id === o.type; })[0] || TYPES[0];
    if (!type.tile) o.tile = false;
    var E = { ctx: ctx, w: w, h: h, S: Math.sqrt(w * h) / 1000, r: rng(o.seed * 2654435761 + 17), p: o.palette.slice(), o: o, seed: o.seed >>> 0 };
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    type.fn(E);
    ctx.restore();
    grain(E);
    return canvas;
  }

  root.Backdrop = { render: render, TYPES: TYPES, PALETTES: PALETTES, skyAt: skyAt, mix: mix, lum: lum, rng: rng, version: '0.1' };
})(typeof window !== 'undefined' ? window : this);
