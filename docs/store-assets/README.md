# Chrome ウェブストア用画像

## 画像一覧

| ファイル | サイズ | 用途 |
| --- | ---: | --- |
| `public/icons/potato-meet-icon-generated-source.png` | 1254 x 1254 | 画像生成で作成した透過ソース |
| `public/icons/potato-meet-icon-master.png` | 1254 x 1254 | 3色に整えた透過原版 |
| `public/icons/icon-16.png` | 16 x 16 | 拡張機能アイコン |
| `public/icons/icon-32.png` | 32 x 32 | 拡張機能アイコン |
| `public/icons/icon-48.png` | 48 x 48 | 拡張機能アイコン |
| `public/icons/icon-128.png` | 128 x 128 | ストアアイコン。図柄は約 96 px、周囲は透過 |
| `potato-meet-promo-440x280.png` | 440 x 280 | 必須の小型プロモーション画像 |
| `potato-meet-marquee-1400x560.png` | 1400 x 560 | 任意のマーキー画像 |
| `potato-meet-screenshot-1280x800.png` | 1280 x 800 | 実際の拡張機能を模擬会議で動かした画面 |

プロモーション画像は多言語で共用できるよう、文字と他社ロゴを入れていません。スクリーンショット内の人物画像は画像生成で作成した合成人物で、参加者名と会議情報は架空です。

## 再生成

```sh
node scripts/generate-store-assets.mjs
```

スクリーンショットは `npm run test:browser` で更新します。

寸法、背景透過、128 px版の余白は次のコマンドで確認できます。

```sh
node scripts/verify-store-assets.mjs
```

## アイコン原版の生成指示

内蔵の画像生成機能を使い、次の条件で新規作成しました。

- 用途: Potato Meet の Chrome 拡張機能アイコン
- 内容: 独自の簡潔なビデオカメラ枠の中央に、顔のない単純なポテト形
- 表現: 小サイズでも読める均一で太い輪郭、3色、高いコントラスト、文字なし
- 背景: 実際のアルファチャンネルを持つ透過背景
- 禁止: 顔、目、口、表情、グラデーション、影、質感、Google、Google Meet、他社のロゴや商標、実在人物、透かし

原版は書き出し時に色を3色へ固定し、16〜128 pxでカメラ枠とポテト形が残るよう調整しています。

画像サイズと余白は、[Chrome ウェブストアの公式画像ガイド](https://developer.chrome.com/docs/webstore/images)に合わせています。
