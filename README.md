# ラスト・ツー

ババ抜きの「最後の2人」だけを遊ぶ、表情の読み合いゲームの試作です。

遊ぶ: https://kudo12711-boop.github.io/last-two/

- CPU（ポン太・ミケ・クロ）と1対1で対戦します。
- 「カメラで表情を映す」を押すと、あなたの表情をキャラクターがまねします。映像は端末の中だけで使い、どこにも送りません。
- スマホでも、上のURLを開けばカメラが使えます。

## キャンピングカー世界一周（放置型の旅）

遊ぶ: https://kudo12711-boop.github.io/last-two/camper/

- アプリを閉じているあいだもキャンピングカーが走り、次に開くと進んだ場所の車窓の景色が見られます。
- 景色はその場所のいまの時刻・天気・気温に合わせて変わります（天気は Open-Meteo、地名は BigDataCloud から取得）。
- 作り方: `/mnt/project-files/camper/tools/` の部品を `python3 build.py camper/index.html` でつなげています。

## 開発の記録

各ゲームの開発の経緯や作り方は [docs/README.md](docs/README.md) にまとめています。
