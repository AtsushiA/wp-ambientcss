# WP Ambient CSS

**日本語** | [English](README.en.md)

[![CI](https://github.com/AtsushiA/wp-ambientcss/actions/workflows/ci.yml/badge.svg)](https://github.com/AtsushiA/wp-ambientcss/actions/workflows/ci.yml)

[Ambient CSS](https://github.com/kikkupico/ambientcss) の陰影表現を、WordPress ブロックエディタの設定項目として使えるようにするプラグインです。

Ambient CSS は、1つの光源パラメータから影・ハイライト・面のグラデーションを決定論的に導出する CSS フレームワークです。個々の `box-shadow` を手で調整する代わりに、光源の向きと強度を決めれば、それに整合した陰影がすべての要素で自動的に生成されます。本プラグインは、その指定をインスペクターの GUI から行えるようにします。

テーマの改修も追加 CSS も不要です。

## 必要環境

| 項目 | 要件 |
|---|---|
| WordPress | 6.6 以上 |
| PHP | 7.4 以上 |
| ブラウザ | 相対色構文 `hsl(from …)`、`color-mix()`、`sign()` / `round()` / `atan2()`、`@property` に対応したもの |

ブラウザは目安として Chrome/Edge 125+、Safari 16.4+、Firefox 128+ です（Chromium 以外は未検証）。未対応環境では影と面の色が出ないだけで、`border-radius` は効き、レイアウトは崩れません。

## インストール

1. [Releases](https://github.com/AtsushiA/wp-ambientcss/releases) から `wp-ambientcss-x.y.z.zip` をダウンロード
2. 「プラグイン」→「新規追加」→「プラグインのアップロード」からインストール
3. 有効化

## 使い方

ブロックを選択し、インスペクターの「Ambient」パネルを開きます。「Ambient を有効にする」をオンにすると各項目が使えるようになります。

### 基本設定

| 項目 | 選択肢 |
|---|---|
| 光源の向き | 8方向のグリッド、または継承 |
| 面 | なし / フラット / 凹面（縦） / 凹面（横） / 凸面 |
| 素材 | マット / 光沢 / ガラス / ヘアライン / ヘアライン（円） / ブラスト |
| エッジ | なし / 面取り / 面取り 2 / 丸エッジ / 丸エッジ 2 / 溝 |
| 浮き上がり | 0〜3 |
| 厚み | 0〜2（エッジ処理が設定する既定値を上書き） |
| 角丸 | なし / 4px / 8px / 12px / 16px / 全円 |
| 発光 | オン / オフ |

### 詳細設定

面の色（albedo）、反射率、キーライト、フィルライト、光の色相・彩度、光源 X / Y、グレイン量、曲面の強さ、バウンスアニメーション。

### ポインタ追従

ブロック毎に、光源を訪問者のポインタに追従させられます。

| モード | 挙動 |
|---|---|
| ページ全体 | 追従する全ブロックで1つの光源を共有。ビューポート上のポインタ位置から光が差します |
| このブロック | そのブロック専用の光源。ブロック上のポインタ位置から照らされます |

両モードは同一ページで混在できます。ポインタが離れると、光源は**最後の位置で止まります**（自動で戻らないので、視界の中で勝手に動くものがありません）。

追従を有効にしたブロックでは、光源の向きプリセットと光源 X / Y は無効になります。光源をスクリプトが制御するためです。

### サイト全体の既定値

「設定」→「Ambient CSS」で、サイト全体の光源・面の色・グレイン量の既定値を設定できます。空欄の項目は Ambient CSS の既定値がそのまま使われます。

同じ画面で、スタイルシートを常に読み込むか、Ambient を使うページだけに読み込むかを選べます。

## 読み込みと性能

- **フロントエンドの JavaScript は既定でゼロです。** ポインタ追従を使うブロックがあるページでのみ、依存のない約 1.1KB のスクリプトを読み込みます
- スタイルシートは約 26KB（Ambient CSS 本体）
- 追従時の描画コスト（Chromium 実測）: ページ全体モードは 200 要素で約 2.0ms/更新、ブロック単位モードは 50 要素で約 1.2ms/フレーム。いずれも 60fps の予算内です
- `(hover: hover)` でない端末、および `prefers-reduced-motion: reduce` を設定した環境では、追従スクリプトは何もしません

## 対象ブロック

カスタムクラス名を受け付けるすべてのブロックが対象です。ただし次のブロックは、マークアップを持たない・クラス付与が破壊的、などの理由で除外しています。

```
core/freeform  core/html      core/shortcode  core/missing
core/nextpage  core/more      core/block      core/pattern
core/legacy-widget            core/widget-area
core/template-part
```

## 拡張

### PHP フィルタ

| フック | 用途 |
|---|---|
| `wp_ambientcss_excluded_blocks` | 対象外ブロックの増減 |
| `wp_ambientcss_enqueue_frontend` | フロントでのスタイルシート読み込み可否 |
| `wp_ambientcss_enqueue_follow` | 追従スクリプトの読み込み可否 |
| `wp_ambientcss_block_classes` | 生成クラスの加工 |
| `wp_ambientcss_block_css_vars` | インラインカスタムプロパティの加工 |
| `wp_ambientcss_root_vars` | `:root` に出力する既定値の加工 |

### JavaScript フィルタ（`wp.hooks`）

| フック | 用途 |
|---|---|
| `wpAmbientcss.blockSupported` | ブロックが対象かどうかの判定 |
| `wpAmbientcss.classNames` | 生成クラスの加工 |

## 開発

### セットアップ

```bash
npm install
composer install
```

Node 24.18 以上が必要です（wp-env が依存する `@php-wasm` パッケージの要求）。

### ビルド

```bash
npm run build     # 本番ビルド（翻訳 JSON の生成を含む）
npm start         # 監視ビルド
```

`build/` はコミット対象です。ビルドを通さずにプラグインが動くようにするためで、CI は `build/` が最新かどうかを検証します。

### テスト

```bash
npm run env:start     # wp-env 起動（Docker が必要）
npm run test:e2e      # Playwright による E2E テスト
npm run test:e2e:ui   # UI モードでデバッグ
```

### 静的解析

```bash
npm run lint:js       # ESLint（@wordpress/recommended）
composer run lint     # phpcs（WordPress Coding Standards）
```

### Ambient CSS の更新

```bash
npm run update:ambient   # node_modules から assets/vendor/ へ同期
```

同梱している CSS のクラス名・カスタムプロパティは [SPEC.md](SPEC.md) の対応表が正としています。上流を更新したら、対応表を再検証してください。

### 翻訳

```bash
npm run i18n:pot   # .pot を生成
npm run i18n:mo    # .po から .mo を生成
npm run i18n:json  # エディタ用の JSON を生成
```

### リリース

`0.0.0` 形式のタグを push すると、GitHub Actions がプラグイン zip を作成して Release に添付します。タグとプラグインヘッダ・`readme.txt` の Stable tag・`WP_AMBIENTCSS_VERSION` が一致しない場合は失敗します。

```bash
git tag 0.2.0
git push origin 0.2.0
```

## 設計

実装仕様は [SPEC.md](SPEC.md)（日本語）にまとめています。ブロック属性のスキーマ、属性からクラス名・カスタムプロパティへの変換表、静的ブロックと動的ブロックの出力経路、セキュリティ上の判断などを記載しています。

## ライセンス

本プラグインは **GPL-2.0-or-later** です。全文は [LICENSE](LICENSE) を参照してください。

`assets/vendor/ambient.css` は [Ambient CSS](https://github.com/kikkupico/ambientcss)（`@ambientcss/css` v3.1.0）の無改変コピーで、**MIT License / Copyright (c) 2026 Ramakrishnan Veeraragavan** のもとで配布されています。ライセンス全文は [assets/vendor/LICENSE-ambientcss.txt](assets/vendor/LICENSE-ambientcss.txt) に同梱しています。

MIT は GPL と互換であるため、GPL-2.0-or-later のプラグインに同梱して配布できます。
