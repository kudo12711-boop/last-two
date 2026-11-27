// アプリ用の準備を作りなおす: node tools/make_app.cjs
//  1) アイコン（<dir>/app/icon-192.png, icon-512.png, icon-maskable-512.png）… 仮の絵文字アイコン
//  2) 名札（<dir>/manifest.webmanifest）
//  3) オフライン用のファイル一覧（<dir>/app-files.json）… アプリとして開いたときに まとめて保存するもの
//  4) 各ゲームの <head> に、名札・アイコン・common/app.js を読むタグを入れる（<!-- app --> 〜 <!-- /app --> の間。何度実行しても同じ）
// 設定は tools/apps.json。ゲームのファイルを足したり変えたりしたら、もう一度実行する（app-files.json が変わる）。
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const { apps } = JSON.parse(fs.readFileSync(path.join(__dirname, 'apps.json'), 'utf8'));
const onlyIcons = process.argv.includes('--no-icons') ? false : true;

function walk(dir, base, out) {
  for (const n of fs.readdirSync(dir)) {
    if (n.startsWith('.')) continue;
    const p = path.join(dir, n), rel = base ? base + '/' + n : n, st = fs.statSync(p);
    if (st.isDirectory()) { walk(p, rel, out); continue; }
    if (/\.(md|py|mjs|cjs|txt)$/.test(n) && !/^land\d*\.txt$/.test(n)) continue;
    if (n === 'app-files.json' || n === 'tv-test.html') continue;
    out.push(rel);
  }
  return out;
}

function fileList(app) {
  const dir = path.join(ROOT, app.dir);
  let files;
  if (app.dir === '.') files = ['index.html', 'manifest.webmanifest', 'app/icon-192.png'];
  else files = walk(dir, '', []).sort();
  // 共通のもの（../ はゲームのフォルダから見た場所）
  const up = app.dir === '.' ? '' : '../';
  const common = [up + 'common/kakin.js', up + 'common/app.js', up + 'common/hikkoshi.js'];
  const h = crypto.createHash('sha1');
  for (const f of files) h.update(f + '\0').update(fs.readFileSync(path.join(dir, f)));
  for (const c of ['common/kakin.js', 'common/app.js', 'common/hikkoshi.js']) if (fs.existsSync(path.join(ROOT, c))) h.update(fs.readFileSync(path.join(ROOT, c)));
  const all = files.map(f => (f === 'index.html' ? './' : f)).concat(common);
  return { version: h.digest('hex').slice(0, 12), files: all };
}

function manifest(app) {
  return {
    name: app.name, short_name: app.short, description: app.desc, lang: app.lang || 'ja',
    id: './', start_url: './', scope: app.scope || './', display: 'standalone',
    background_color: app.theme, theme_color: app.theme,
    icons: [
      { src: 'app/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'app/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'app/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}

function inject(app) {
  const f = path.join(ROOT, app.dir, 'index.html');
  let s = fs.readFileSync(f, 'utf8');
  const up = app.dir === '.' ? '' : '../';
  const hasIcon = /<link rel="icon"/.test(s.replace(/<!-- app -->[\s\S]*?<!-- \/app -->\n?/, ''));
  const tags = ['<!-- app -->',
    '<link rel="manifest" href="manifest.webmanifest">',
    hasIcon ? '' : '<link rel="icon" href="app/icon-192.png">',
    '<link rel="apple-touch-icon" href="app/icon-192.png">',
    app.noOffline ? '' : `<script src="${up}common/app.js" defer></script>`,
    '<!-- /app -->'].filter(Boolean).join('\n') + '\n';
  if (/<!-- app -->[\s\S]*?<!-- \/app -->\n?/.test(s)) s = s.replace(/<!-- app -->[\s\S]*?<!-- \/app -->\n?/, tags);
  else s = s.replace('</head>', tags + '</head>');
  fs.writeFileSync(f, s);
}

// 記録の おひっこし（common/hikkoshi.js）は ゲームのプログラムより前に読む: <meta charset> のすぐ後
function injectHikkoshi(app) {
  const f = path.join(ROOT, app.dir, 'index.html');
  let s = fs.readFileSync(f, 'utf8');
  const up = app.dir === '.' ? '' : '../';
  const tag = `<!-- hikkoshi --><script src="${up}common/hikkoshi.js"></script><!-- /hikkoshi -->\n`;
  if (/<!-- hikkoshi -->.*?<!-- \/hikkoshi -->\n?/.test(s)) s = s.replace(/<!-- hikkoshi -->.*?<!-- \/hikkoshi -->\n?/, tag);
  else s = s.replace(/(<meta charset="utf-8">\n)/i, '$1' + tag);
  if (!s.includes('common/hikkoshi.js')) throw new Error('no charset in ' + f);
  fs.writeFileSync(f, s);
}

function iconHtml(app, size, maskable) {
  const [a, b] = app.bg;
  const r = maskable ? 0 : size * 0.22;
  const glyph = app.text || app.emoji;
  const fs_ = size * (maskable ? 0.46 : 0.6);
  const font = app.text ? `'WenQuanYi Zen Hei', sans-serif` : `'Noto Color Emoji'`;
  return `<html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px;border-radius:${r}px;background:linear-gradient(160deg,${a},${b});display:flex;align-items:center;justify-content:center;overflow:hidden">
  <div style="font-family:${font};font-size:${fs_}px;line-height:1;color:#fff;font-weight:700;text-shadow:0 ${size * 0.02}px ${size * 0.04}px rgba(0,0,0,.18)">${glyph}</div></div></body></html>`;
}

(async () => {
  let browser;
  if (onlyIcons) { browser = await require('playwright').chromium.launch(); }
  for (const app of apps) {
    const dir = path.join(ROOT, app.dir);
    fs.mkdirSync(path.join(dir, 'app'), { recursive: true });
    if (browser) {
      for (const [name, size, mask] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true]]) {
        const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
        await page.setContent(iconHtml(app, size, mask));
        await page.waitForTimeout(50);
        await page.screenshot({ path: path.join(dir, 'app', name), omitBackground: true });
        await page.close();
      }
    }
    fs.writeFileSync(path.join(dir, 'manifest.webmanifest'), JSON.stringify(manifest(app), null, 2) + '\n');
    inject(app);
    injectHikkoshi(app);
  }
  // 一覧は名札とアイコンができてから作る（それも中に入るので）
  for (const app of apps) {
    if (app.noOffline) continue;
    fs.writeFileSync(path.join(ROOT, app.dir, 'app-files.json'), JSON.stringify(fileList(app)) + '\n');
  }
  if (browser) await browser.close();
  console.log('done', apps.length);
})();
