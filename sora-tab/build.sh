#!/bin/sh
# 共通の描く部品をコピーして、Chrome に読みこめる zip を作る
# 使い方: sh sora-tab/build.sh  （リポジトリのいちばん上で）
set -e
cd "$(dirname "$0")"
cp ../moyou/engine.js engine.js
mkdir -p ../downloads && rm -f ../downloads/sora-tab.zip
zip -qr ../downloads/sora-tab.zip manifest.json newtab.html newtab.css newtab.js engine.js icons _locales
echo "ok: downloads/sora-tab.zip"
