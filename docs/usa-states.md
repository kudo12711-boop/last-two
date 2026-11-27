# アメリカ 州パズル（USA States Puzzle）

最終更新: 2026-11-27 ／ 2026-11-27 から 都道府県パズル（[todofuken.md](todofuken.md)）の中の「アメリカ」の地図になった（v0.1 は かくしURLで公開していた）

## ひとことで

> **2026-11-27 に 都道府県パズルへ まとめた。** くどうさん「周パズルは都道府県の英語版と考えていましたが、同じアプリという扱いになっていませんか？」→ 1つのアプリで地図をえらぶ案に「おすすめでおねがいします」。いまは https://kudo12711-boop.github.io/last-two/todofuken/?map=us で あそぶ（ホームの「🇺🇸 アメリカ」）。日本語でも あそべる（カタカナの州名）。前のかくしURL は そこへ 案内する。この下は v0.1 の記録と、アメリカの地図の データの説明。


[都道府県パズル](todofuken.md) と同じ遊び方で、アメリカの50州の本物の形のピースを、指で地図の正しい場所にはめる英語のパズルです。はまると州の名前を英語で読み上げ、名物の絵（カリフォルニアなら 🌉 ゴールデンゲートブリッジ）を見せます。

## 遊ぶ場所

- かくしURL: https://kudo12711-boop.github.io/last-two/try-a985755ea1ec1719/ （入口ページには のせていない、検索よけつき）
- ファイル: `/mnt/project-files/usa-states/`

## 生まれたきっかけ

2026-11-26、くどうさんが都道府県パズルの英語版（アメリカの州・ヨーロッパの国）を作れるかたずね、アメリカの50州から始めることを提案。くどうさん「アメリカをお願いします」。

## 遊び方（v0.1）

画面の言葉と声は すべて英語。読み上げは 端末の英語の声（アメリカ英語を さきに えらぶ）。

### Kids stages（こどもステージ、15こ）

- となりどうしの州を 2〜4まいずつ。地図が大きく映る。
- 1 Pacific Coast（WA OR CA）／2 Alaska and Hawaii／3 Rocky Mountains（MT ID WY）／4 Desert（NV UT AZ）／5 Four Corners（CO NM OK TX）／6 Great Plains（ND SD NE KS）／7 Big River（MN IA WI IL）／8 Great Lakes（MI IN OH）／9 Mississippi（MO AR LA MS）／10 Music Land（KY TN AL）／11 Sunny South（GA FL SC NC）／12 Capital Area（VA WV MD DE）／13 Big Cities（NY PA NJ）／14 North Woods（ME NH VT）／15 Little States（MA RI CT）
- 都道府県パズルの こどもステージと同じ: 当たりの範囲が広い、近づくと光る、まちがえると「So close!」、3回で自動ではまる（「It goes here!」）、ほめる声（「Great job! Texas!」）、地図に名物の絵、クリアで「Stickers!」。

### Regions・All 50（地方・ぜんぶ）

- West（5）、Mountains（8）、Midwest（12）、South（8）、Southeast（6）、Northeast（11）、All 50。
- タイム・★3つまで・自己ベスト、💡ヒント、Borders / Names / Voice / Sound の切りかえ。都道府県パズルと同じ。

### Sticker book（シールずかん）

- 50まい。はめた州の名物シールがたまる。まだの州は かげの形と略号（TX など）。タップで読み上げ。

### アラスカとハワイ

- ほんとうの位置だと地図が とても小さくなるので、アメリカの地図で ふつうに やるように、左下の点線の四角に（アラスカは小さくして）置いている。

### 小さい州

- ロードアイランド・デラウェアなどは 全体の地図だと とても小さい。持ち上げたピースは 小さすぎないよう大きめに映し、こどもステージ 15「Little States」・12「Capital Area」では 地図を大きく映す。スマホでの All 50 は むずかしいので、地方ごとか タブレットが おすすめ（都道府県パズルと同じ）。

## お金のしくみ（おためし）

- むりょう: こどもステージ 1〜5、West と Mountains、シールずかん。
- ぜんぶ版で ふえるもの: こどもステージ 6〜15、Midwest・South・Southeast・Northeast、All 50。
- 共通の `common/kakin.js`（英語表示）。ゲームの名前は `usastates`。ファミリーパスでも ぜんぶ遊べる。値段は ほかと同じ仮の数字。

## これまでの流れ

| 日付 | くどうさんの声 | やったこと |
|---|---|---|
| 11/26 | 「アメリカをお願いします」 | v0.1 を作り、かくしURLで公開（PR #179） |
| 11/27 | 「おすすめでおねがいします」（1つのアプリにまとめる） | 都道府県パズル v0.7 の中へ。日本語の名前（カタカナ）と 名物（ひらがな）を足した |

## これから

- くどうさん・知り合いに遊んでもらった感想待ち。
- 候補: ヨーロッパの国の版（同じしくみで作れる）、州都（Capital）を当てるモード、日本語の説明（日本の子が アメリカを おぼえる向け）、AI の声。
- 入口ページに のせるかは、くどうさんが決める。

---

## 技術メモ

- 作り方: `/mnt/project-files/usa-states/tools/` の `src.html` を直し、`python3 build.py us-shapes.json src.html <出力>/index.html`。できた index.html を リポジトリの `try-a985755ea1ec1719/index.html` に入れて、`node tools/make_app.cjs --no-icons`（`<!-- app -->` と app-files.json を作りなおす）。
- 形データ: npm の `us-atlas@3.0.1` の `states-albers-10m.json`（アメリカ国勢調査局の地図をもとにしたもの、ISC ライセンス。アラスカとハワイは 左下に移してある、975×610）。`shapes.mjs` が topojson-simplify で簡単にし（重み 1.2、となりどうしの境目は ずれない）、ワシントンD.C. を のぞき、小さな島を落として、州の名前の abc 順で `us-shapes.json`（id・名前・パス・はこ b・中心 c）を作る。`node shapes.mjs 1.2`（`npm i us-atlas@3.0.1 topojson-client@3 topojson-simplify@3 d3-geo@3` が要る）。
- プログラムは 都道府県パズル v0.5 の作りを そのまま使い、データを入れかえた: `DATA`（州の名前 → 略号・名物の絵・名物）、`REGIONS`（6地方）、`KIDS`（15ステージ）。沖縄の「ずらし」（offOf）は使わず、アラスカ・ハワイの点線の四角だけ（`INSETS`）。
- 保存: localStorage `usastates-opt`・`usastates-best`・`usastates-stickers`・`usastates-kid`。
- 声: 都道府県パズルと同じ順番待ち（`vqAdd`・`hush`）。`say()` は `en-US` で、Samantha・Google US English などがあれば それを使う。
- 字: Google Fonts の Fredoka。長い1語の名前（Massachusetts など11字以上）は `.long` で字を小さくする。
- 紙ふぶきの「つぎの画面に1こま残る」を直した（`if(my!==confT) return` を描く前に）。都道府県パズルには まだ残っている。
- `tools/make_app.cjs` の名札は `apps.json` の `lang` を見るようにした（このゲームは `en`）。
