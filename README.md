# ダナン・ホイアン 旅のしおり

2026年11月6〜9日の3泊4日。11月7日はバーナーヒルズ、11月8日はホイアンを、休憩をとりながら楽しむ日本語の旅程です。

## サイトの更新

`src/trip.json` で旅程を編集し、`node build-planner.mjs`、`node validate-site.mjs` を実行します。生成したルートの `index.html` を含めて main ブランチへ push すると、GitHub Pages に反映されます。

レイアウトは `src/template.html` と `src/styles.css`、天気表示は `src/weather.css` と `src/weather.js` で管理しています。追加のパッケージは必要ありません。

## 端末での編集と天気

サイトの「内容を編集」と持ち物チェックは、お使いのブラウザーに保存されます。共有サイト全体の旅程は、リポジトリを更新したときに変わります。しおりのHTMLはオフライン用にも保存できます。

天気は Open-Meteo の公開データを利用します。旅行日の予報が公開されるまでは、その旨を表示し、直近の予報と区別しています。

フォントのライセンスは `assets/ZenMaruGothic-OFL.txt` を参照してください。
