# WP Ambient CSS — 実装仕様書

- **ドキュメント版数**: 1.0
- **作成日**: 2026-09-24
- **対象プラグイン版数**: 0.1.0（初回リリース想定）
- **ステータス**: 実装前仕様（本書の確定をもって実装に着手する）

---

## 1. 概要

### 1.1 目的

CSS フレームワーク [Ambient CSS](https://github.com/kikkupico/ambientcss) が提供する「単一光源から物理的に導出された陰影・面表現」を、**WordPress ブロックエディタのブロック設定（インスペクター）から GUI で指定できるようにする**プラグインを開発する。

テーマや追加 CSS を書かずに、任意のブロックへ `.ambient` / `.amb-*` クラスと `--amb-*` カスタムプロパティを付与できる状態をゴールとする。

### 1.2 識別情報

| 項目 | 値 |
|---|---|
| プラグイン名 | WP Ambient CSS |
| ディレクトリ / slug | `wp-ambientcss` |
| メインファイル | `wp-ambientcss.php` |
| Text Domain | `wp-ambientcss` |
| バージョン | 0.1.0 |
| ライセンス | GPL-2.0-or-later |

### 1.3 本書のスコープ

本書は **実装仕様のみ**を定義する。実装コードは本書確定後の別作業とする。

---

## 2. 背景と依存関係

### 2.1 Ambient CSS とは

Ambient CSS は、シーン内に定義した **1つの光源パラメータ**から、影・ハイライト・面のグラデーション・エッジ表現を決定論的に導出する CSS フレームワーク。個々の `box-shadow` を手で調整するのではなく、光源の方向（`--amb-light-x` / `--amb-light-y`）と強度（key / fill）を決めれば、それに整合した陰影が全要素で自動的に生成される。

係数は Blender Cycles のレンダリング結果からフィッティングされており、クラス名と `--amb-*` プロパティ名は `api-baseline.json` によって CI で凍結されている（上流のバージョンアップで値は変わるが名前は変わらない）。

### 2.2 依存パッケージ

| パッケージ | 版数 | ライセンス | 本プラグインでの扱い |
|---|---|---|---|
| `@ambientcss/css` | `^3.1.0` | MIT | **`dist/ambient.css` をプラグインに同梱**。npm は更新用 devDependency としてのみ使用 |
| `@ambientcss/components` | — | MIT | **対象外**（React コンポーネント群。WordPress ブロックとは別レイヤのため v1 では扱わない） |

### 2.3 本書が根拠とする実データ

本書に記載するクラス名・カスタムプロパティ名・既定値は、**`@ambientcss/css@3.1.0` の `dist/ambient.css`（26,175 bytes）から実測抽出したもの**であり、上流 README や docs サイトの記述ではない。上流を更新した際は §14 の手順で本書の対応表を再検証すること。

---

## 3. 用語定義

| 用語 | 定義 |
|---|---|
| **基底クラス** | `.ambient`。影・エッジ・厚みの `box-shadow` 一式を実際に描画するクラス。これが無いと修飾クラスは変数を立てるだけで見た目が変わらない |
| **修飾クラス** | `.amb-*` で始まるユーティリティクラス。多くは `--amb-*` を書き換えるだけで、描画は基底クラスが行う |
| **光源継承** | `--amb-light-x` / `--amb-light-y` などは通常の CSS カスタムプロパティなので子孫へ継承する。祖先要素や `:root` に設定すればページ全体の光源を決められる |
| **ambient 属性** | 本プラグインが各ブロックへ追加するブロック属性（オブジェクト型）。§6 で定義 |
| **静的ブロック** | `save()` を持ち、投稿本文に HTML が保存されるブロック |
| **動的ブロック** | サーバ側 `render_callback` で HTML を生成するブロック（`core/query`、`core/navigation` など） |

---

## 4. Ambient CSS API 対応表

### 4.1 クラス一覧（全 41 クラス + 基底 1）

`dist/ambient.css@3.1.0` に存在するクラスの全量。「露出」列は本プラグインの UI に出すか否か。

#### 4.1.1 基底

| クラス | 効果 | 露出 |
|---|---|---|
| `.ambient` | 影・エッジ・厚みの `box-shadow` を生成。他の修飾クラスの前提 | ○（「Ambient を有効化」で自動付与） |

#### 4.1.2 光源方向（`--amb-light-x` / `-y` を設定するのみ・継承する）

| クラス | x | y | 露出 |
|---|---|---|---|
| `.amb-light-tl` | -1 | -1 | ○ |
| `.amb-light-tr` | 1 | -1 | ○ |
| `.amb-light-bl` | -1 | 1 | ○ |
| `.amb-light-br` | 1 | 1 | ○ |
| `.amb-light-top` | 0 | -1 | ○ |
| `.amb-light-bottom` | 0 | 1 | ○ |
| `.amb-light-left` | -1 | 0 | ○ |
| `.amb-light-right` | 1 | 0 | ○ |

#### 4.1.3 面（サーフェス）

| クラス | 効果 | 露出 |
|---|---|---|
| `.amb-surface` | `background-color: var(--amb-lit)`（フラットな被照面） | ○ |
| `.amb-surface-concave` | 縦方向の凹面グラデーション | ○ |
| `.amb-surface-concave-h` | 横方向の凹面グラデーション | ○ |
| `.amb-surface-convex` | 縦方向の凸面グラデーション | ○ |

#### 4.1.4 エッジ処理

| クラス | 効果 | 暗黙の副作用 | 露出 |
|---|---|---|---|
| `.amb-chamfer` | 面取り（1px 相当） | `--amb-thickness: 1` | ○ |
| `.amb-chamfer-2` | 面取り（2px 相当） | `--amb-thickness: 2` | ○ |
| `.amb-fillet` | 丸エッジ（1px 相当） | `--amb-thickness: 1` | ○ |
| `.amb-fillet-2` | 丸エッジ（2px 相当） | `--amb-thickness: 2` | ○ |
| `.amb-groove` | 溝（彫り込み） | `--amb-thickness: 1` | ○ |

#### 4.1.5 素材（マテリアル）

| クラス | 効果 | 露出 |
|---|---|---|
| （指定なし） | マット。**`.amb-mat-matte` というクラスは存在しない** | ○（「なし（マット）」として選択肢に置く） |
| `.amb-mat-shiny` | 鏡面。光源方向に追従するスペキュラ | ○ |
| `.amb-mat-glass` | すりガラス。`backdrop-filter` を使う。暗黙で `--amb-thickness: 1` | ○ |
| `.amb-mat-brushed` | ヘアライン（直線） | ○ |
| `.amb-mat-brushed-round` | ヘアライン（同心円） | ○ |
| `.amb-mat-blasted` | ブラスト（梨地） | ○ |

> 素材クラスは `::before` / `::after` と `z-index: -1` を使う。既に擬似要素を使っているブロック（`core/cover` のオーバーレイ等）と競合しうる点を実装時に検証すること。

#### 4.1.6 高さ・厚み

| クラス | 効果 | 露出 |
|---|---|---|
| `.amb-elevation-0` 〜 `-3` | `--amb-elevation` = 0〜3。浮き上がり（ドロップシャドウの強さ） | ○ |
| `.amb-thickness-0` 〜 `-2` | `--amb-thickness` = 0〜2。板の厚み | ○ |

> **宣言順の事実**: `dist/ambient.css` 内で `.amb-thickness-*` は `.amb-chamfer` / `.amb-fillet` / `.amb-groove` / `.amb-mat-glass` よりも**後**に定義されている。詳細度は同じ (0,1,0) なので、両方を付けた場合は `.amb-thickness-*` が勝つ。よってエッジ処理と厚みを UI で独立に出してよい。

#### 4.1.7 角丸

| クラス | `border-radius` | 露出 |
|---|---|---|
| `.amb-rounded` | 4px | ○ |
| `.amb-rounded-md` | 8px | ○ |
| `.amb-rounded-lg` | 12px | ○ |
| `.amb-rounded-xl` | 16px | ○ |
| `.amb-rounded-full` | 9999px | ○ |

#### 4.1.8 発光・アニメーション

| クラス | 効果 | 露出 | 理由 |
|---|---|---|---|
| `.amb-glow` | `box-shadow: 0 0 6.2px var(--amb-lume)` | ○ | `--amb-lume` は本体 CSS が導出するので単体で機能する |
| `.amb-emit-red` / `-green` / `-amber` / `-cyan` / `-blue` / `-white` | `--amb-emit-color` を設定するのみ | **×** | **`dist/ambient.css` 内に `var(--amb-emit-color)` の参照が 0 件**。消費しているのは `@ambientcss/components` 側であり、CSS 単体では視覚効果がない。誤解を招くため v1 の UI からは除外する（§15 参照） |
| `.amb-bounce` | `--amb-elevation` を 2s ループでアニメーション | ○（「上級」扱い） | `prefers-reduced-motion` への配慮を実装側で行う |

### 4.2 カスタムプロパティ一覧

`:root` で定義される既定値（`dist/ambient.css@3.1.0` 実測）。

| プロパティ | 既定値 | 意味 | 露出 |
|---|---|---|---|
| `--amb-light-x` | `-1` | 光源の水平位置（-1〜1） | ○ |
| `--amb-light-y` | `-1` | 光源の垂直位置（-1〜1） | ○ |
| `--amb-key-light-intensity` | `.9` | キーライト強度（0〜1） | ○ |
| `--amb-fill-light-intensity` | `.7` | フィルライト強度（0〜1） | ○ |
| `--amb-light-hue` | `234` | 光の色相（0〜360） | ○ |
| `--amb-light-saturation` | `15%` | 光の彩度（%） | ○ |
| `--amb-albedo` | `#eaeaea`（`lab()` 対応時は `lab(92.5749% 0 0)`） | 面の素の色 | ○ |
| `--amb-shade` | `1` | 反射率の倍率 | ○ |
| `--amb-grain-amount` | `1` | 素材グレインの強さ | ○ |
| `--amb-curve-scale` | `1` | 凹凸グラデーションの強さ倍率 | ○ |
| `--amb-elevation` | `0` | `@property` 宣言あり（`<number>` / `inherits: false`）。アニメーション可能 | △（クラス経由） |
| `--amb-thickness` | `0` | 厚み | △（クラス経由） |
| `--amb-chamfer` / `--amb-fillet` | `0` | エッジ種別フラグ | △（クラス経由） |
| `--amb-chamfer-width` / `--amb-fillet-width` | `1` | エッジ幅 | × |
| `--amb-mat-specular` / `--amb-mat-roughness` / `--amb-mat-opacity` | `0` / `1` / `1` | 素材クラスが設定 | × |
| `--amb-lit` / `--amb-lume` / `--amb-label` | 導出値 | 全称セレクタ `*` で算出される派生色 | ×（読み取り専用扱い） |
| `--amb-light-distance` | `0px` | **本体 CSS 内で未参照** | × |
| `--amb-highlight-color` | `coral` | **本体 CSS 内で未参照**（components 用） | × |
| `--amb-emit-color` | （emit クラスのみ） | **本体 CSS 内で未参照**（components 用） | × |
| `--amb-lume-hue` | `17` | `--amb-lume` の導出に使用 | × |

### 4.3 全称セレクタの存在（重要）

`dist/ambient.css` には以下の規則がある。

```css
* {
  --amb-curve-delta: calc(...);
  --amb-exposure: calc(...);
  --amb-lit: ...;
  /* 他 */
}
```

**このスタイルシートを読み込むだけで、ページ上の全要素にカスタムプロパティの計算が乗る。** 要素数の多いページでの描画コストに影響しうるため、§5 F-06 の条件付き読み込みオプションを設ける根拠となる。

---

## 5. 機能要件

### F-01 ライブラリの同梱と読み込み

- `assets/vendor/ambient.css` に `@ambientcss/css@3.1.0` の `dist/ambient.css` を**そのまま同梱**する（改変しない）。
- ファイル先頭に、出典・版数・MIT ライセンスである旨のコメントヘッダを付ける（改変にあたらない範囲でのヘッダ追記のみ可。本体規則は一切変更しない）。
- ハンドル名 `wp-ambientcss`。**`enqueue_block_assets` フック**で登録・エンキューする。このフックはフロントとブロックエディタの両方で発火し、エディタの iframe 内にも注入されるため、エディタ内プレビューとフロントの見え方を一致させられる。
- バージョン文字列はファイルの `filemtime()` または同梱版数の定数を使い、キャッシュバスティングを効かせる。

### F-02 全ブロックへの `ambient` 属性追加（除外リスト方式）

- `blocks.registerBlockType` JS フィルタで、**登録済みの全ブロックに** `ambient` 属性（object 型・既定値なし）を追加する。
- ただし以下は既定で除外する。マークアップを持たない・クラス付与が破壊的・他機能で置き換えられる、のいずれかに該当するため。

  ```
  core/freeform, core/html, core/shortcode, core/missing,
  core/nextpage, core/more, core/block, core/pattern,
  core/legacy-widget, core/widget-area, core/template-part
  ```

- 除外リストは PHP フィルタ `wp_ambientcss_excluded_blocks` と JS フィルタ `wpAmbientcss.blockSupported` の両方で変更できること（§9）。
- 属性追加は `save` を持たないブロックにも行う（動的ブロックは PHP 側で描画するため）。

### F-03 インスペクター UI

`editor.BlockEdit` の HOC で、`InspectorControls`（`group="styles"`）に **「Ambient」パネル**を追加する。

#### 基本セクション

| コントロール | 型 | 対応属性 |
|---|---|---|
| Ambient を有効にする | ToggleControl | `enabled` |
| 光源の向き | 8方向のボタングリッド + 「継承（指定なし）」 | `light` |
| 面 | SelectControl（なし / フラット / 凹（縦） / 凹（横） / 凸） | `surface` |
| 素材 | SelectControl（マット / 光沢 / ガラス / ヘアライン / ヘアライン（円） / ブラスト） | `material` |
| エッジ | SelectControl（なし / 面取り / 面取り2 / 丸エッジ / 丸エッジ2 / 溝） | `edge` |
| 浮き上がり | RangeControl 0–3（未設定可） | `elevation` |
| 厚み | RangeControl 0–2（未設定可） | `thickness` |
| 角丸 | SelectControl（なし / 4px / 8px / 12px / 16px / 全円） | `rounded` |
| 発光 | ToggleControl | `glow` |

- `enabled` が false のときは以下のコントロールを無効化（disabled）する。基底クラスなしでは効果が出ないため。
- パネルは安定 API の `PanelBody` で構成し、末尾に「Ambient 設定をクリア」ボタンを置く。
  - **実装時の変更**: 当初は `ToolsPanel` / `ToolsPanelItem` を想定していたが、これらは `@wordpress/components` の `__experimental*` API であり、WordPress の コーディングガイドライン（`@wordpress/no-unsafe-wp-apis`）でプラグインからの使用が禁止されている。WP 本体の更新で予告なく変わりうるため、配布プラグインでは安定 API を使う。

#### 詳細セクション（折りたたみ・既定で閉じる）

| コントロール | 型 | 範囲 | 対応属性 |
|---|---|---|---|
| 面の色（albedo） | ColorPalette + カスタム | CSS color | `vars.albedo` |
| 反射率（shade） | RangeControl | 0–2 / step 0.05 | `vars.shade` |
| キーライト | RangeControl | 0–1 / step 0.05 | `vars.keyLight` |
| フィルライト | RangeControl | 0–1 / step 0.05 | `vars.fillLight` |
| 光の色相 | RangeControl | 0–360 / step 1 | `vars.lightHue` |
| 光の彩度 | RangeControl | 0–100 / step 1（出力時 `%` 付与） | `vars.lightSaturation` |
| 光源 X | RangeControl | -1–1 / step 0.05 | `vars.lightX` |
| 光源 Y | RangeControl | -1–1 / step 0.05 | `vars.lightY` |
| グレイン量 | RangeControl | 0–2 / step 0.05 | `vars.grain` |
| 曲面の強さ | RangeControl | 0–2 / step 0.05 | `vars.curveScale` |

- **排他制御**: 「光源 X / Y」を1つでも設定した場合、「光源の向き」プリセットは無効化し、その旨のヘルプテキストを出す。インライン style はクラスより強いため、両方指定すると常にインラインが勝ち、UI の表示と実結果が乖離するため（§7.3）。
- 未設定（`undefined`）と 0 を明確に区別する。未設定の項目はインライン出力しない＝上位（`:root` やサイト設定）から継承させる。

#### エディタ内プレビュー

`editor.BlockListBlock` フィルタで、エディタキャンバス上のブロックラッパーへ同じクラスとインライン custom property を適用する。§7 の変換規則を JS 側で共有する。

### F-04 フロント出力

| 対象 | 経路 |
|---|---|
| 静的ブロック | `blocks.getSaveContent.extraProps` JS フィルタで `className` と `style` をマージ。結果は投稿本文に保存される |
| 動的ブロック | PHP `render_block` フィルタ。`WP_HTML_Tag_Processor` で最外殻タグに `class` / `style` を追加 |

- **二重付与の防止**: PHP 側の注入は `WP_Block_Type_Registry::get_instance()->get_registered( $name )->is_dynamic()` が `true` のブロックにのみ適用する。静的ブロックは保存済み HTML に既にクラスが入っているため。
- `WP_HTML_Tag_Processor` が最初のタグを見つけられない（テキストのみ等）場合は、何もせず元の HTML を返す。
- 既存の `class` / `style` は破壊せず追記する（`Tag_Processor::add_class()` と、`style` は既存値へのセミコロン区切り追記）。

### F-05 サイト全体の既定光源設定

- 管理画面「設定 > Ambient CSS」を追加（`manage_options`）。
- オプション名 `wp_ambientcss_settings`（単一の配列オプション、`register_setting` で登録、`sanitize_callback` 必須）。

| 設定キー | 型 | 既定 | 出力先 |
|---|---|---|---|
| `light_x` / `light_y` | number | 未設定 | `:root { --amb-light-x / -y }` |
| `key_light` / `fill_light` | number | 未設定 | `--amb-key-light-intensity` / `--amb-fill-light-intensity` |
| `light_hue` / `light_saturation` | number | 未設定 | `--amb-light-hue` / `--amb-light-saturation` |
| `albedo` | color | 未設定 | `--amb-albedo` |
| `shade` / `grain` | number | 未設定 | `--amb-shade` / `--amb-grain-amount` |
| `load_mode` | enum `always` \| `on_demand` | `always` | F-06 |

- 未設定のキーは出力しない（上流の既定値をそのまま使う）。
- 出力は `wp_add_inline_style( 'wp-ambientcss', ':root{...}' )` で `ambient.css` の**直後**に置く。フロントとエディタの両方で同じ内容を出すこと。

### F-06 条件付き読み込み

- `load_mode = always`（既定）: 常に `wp_head` 段階でエンキューする。確実で FOUC がない。
- `load_mode = on_demand`: `render_block` で `ambient` 属性を持つブロックを検出したときにのみエンキューする。
  - **トレードオフを設定画面に明記する**: `wp_head` 出力後に検出された場合、スタイルはフッターに出力され、初回描画時に一瞬スタイルが当たらない可能性がある。
  - §4.3 の全称セレクタによる計算コストを避けたいサイト向けのオプションという位置づけ。
- PHP フィルタ `wp_ambientcss_enqueue_frontend`（bool）で最終的な読み込み可否を上書きできる。
- ブロックエディタでは常に読み込む（プレビューが崩れるため）。

### F-07 国際化

- 全 UI 文字列に Text Domain `wp-ambientcss` を使用。
- PHP: `load_plugin_textdomain()`。JS: `wp_set_script_translations()`。
- `languages/` に `.pot` を生成し、`ja` 翻訳を同梱する。

### F-08 ライセンス表記

§13 に従い、GPL と MIT の両方を正しく明示する。

---

## 6. データモデル

### 6.1 `ambient` 属性スキーマ

```jsonc
{
  "ambient": {
    "type": "object",
    "properties": {
      "enabled":   { "type": "boolean" },                 // .ambient を付与
      "light":     { "enum": ["tl","tr","bl","br","top","bottom","left","right"] },
      "surface":   { "enum": ["flat","concave","concave-h","convex"] },
      "edge":      { "enum": ["chamfer","chamfer-2","fillet","fillet-2","groove"] },
      "material":  { "enum": ["shiny","glass","brushed","brushed-round","blasted"] },
      "elevation": { "type": "number", "enum": [0,1,2,3] },
      "thickness": { "type": "number", "enum": [0,1,2] },
      "rounded":   { "enum": ["base","md","lg","xl","full"] },
      "glow":      { "type": "boolean" },
      "bounce":    { "type": "boolean" },
      "vars": {
        "type": "object",
        "properties": {
          "albedo":          { "type": "string" },                        // CSS color
          "shade":           { "type": "number", "min": 0,    "max": 2   },
          "keyLight":        { "type": "number", "min": 0,    "max": 1   },
          "fillLight":       { "type": "number", "min": 0,    "max": 1   },
          "lightHue":        { "type": "number", "min": 0,    "max": 360 },
          "lightSaturation": { "type": "number", "min": 0,    "max": 100 },
          "lightX":          { "type": "number", "min": -1,   "max": 1   },
          "lightY":          { "type": "number", "min": -1,   "max": 1   },
          "grain":           { "type": "number", "min": 0,    "max": 2   },
          "curveScale":      { "type": "number", "min": 0,    "max": 2   }
        }
      }
    }
  }
}
```

### 6.2 既定値と省略の扱い

- `ambient` 属性自体に `default` は設定しない。未使用ブロックのマークアップに何も出力させず、既存コンテンツを一切変更しないため。
- 個別キーも未設定（キー自体が存在しない）を「指定なし＝継承」として扱う。`0` や `false` は明示的な指定として扱い、混同しない。
- `surface: "flat"` は `.amb-surface` に対応する（属性値としては `flat`、クラス名は `amb-surface`）。属性値に `surface` を使うと `surface.surface` という冗長な表現になるため名前を分けている。

---

## 7. 出力仕様

### 7.1 属性 → クラス名の変換表

この表が JS 実装と PHP 実装の**唯一の正**である。両者はこの表と完全に一致しなければならない。

| 属性 | 値 | 出力クラス |
|---|---|---|
| `enabled` | `true` | `ambient` |
| `light` | `tl` / `tr` / `bl` / `br` / `top` / `bottom` / `left` / `right` | `amb-light-{値}` |
| `surface` | `flat` | `amb-surface` |
| `surface` | `concave` | `amb-surface-concave` |
| `surface` | `concave-h` | `amb-surface-concave-h` |
| `surface` | `convex` | `amb-surface-convex` |
| `edge` | `chamfer` / `chamfer-2` / `fillet` / `fillet-2` / `groove` | `amb-{値}` |
| `material` | `shiny` / `glass` / `brushed` / `brushed-round` / `blasted` | `amb-mat-{値}` |
| `elevation` | `0` / `1` / `2` / `3` | `amb-elevation-{値}` |
| `thickness` | `0` / `1` / `2` | `amb-thickness-{値}` |
| `rounded` | `base` | `amb-rounded` |
| `rounded` | `md` / `lg` / `xl` / `full` | `amb-rounded-{値}` |
| `glow` | `true` | `amb-glow` |
| `bounce` | `true` | `amb-bounce` |

**出力順序**: 上表の行順で連結する（安定した差分のため）。許可リストに無い値は**出力しない**（無視する）。

### 7.2 `vars` → インラインカスタムプロパティの変換表

| 属性キー | CSS プロパティ | 出力形式 |
|---|---|---|
| `albedo` | `--amb-albedo` | そのまま（色文字列） |
| `shade` | `--amb-shade` | 数値 |
| `keyLight` | `--amb-key-light-intensity` | 数値 |
| `fillLight` | `--amb-fill-light-intensity` | 数値 |
| `lightHue` | `--amb-light-hue` | 数値 |
| `lightSaturation` | `--amb-light-saturation` | **数値 + `%`** |
| `lightX` | `--amb-light-x` | 数値 |
| `lightY` | `--amb-light-y` | 数値 |
| `grain` | `--amb-grain-amount` | 数値 |
| `curveScale` | `--amb-curve-scale` | 数値 |

- 未設定のキーは出力しない。
- 数値は小数点以下 4 桁までに丸め、末尾の 0 を落とす（`0.9000` → `0.9`）。ロケール非依存で書式化すること（PHP は `number_format` ではなく明示的な処理を使う）。

### 7.3 クラスとインラインの競合ルール

`.amb-light-*` クラスと `vars.lightX` / `vars.lightY` は同じ `--amb-light-x/y` を書き換える。インライン `style` は常にクラスより強いため、両方が存在するとインラインが勝つ。

**規約**: `vars.lightX` または `vars.lightY` が設定されている場合、`light`（方向プリセット）は出力しない。UI 側でも排他にする（F-03）。

### 7.4 出力例

入力属性:

```json
{
  "enabled": true,
  "light": "tl",
  "surface": "convex",
  "edge": "fillet",
  "material": "brushed",
  "elevation": 2,
  "rounded": "lg",
  "vars": { "albedo": "#2b6cb0", "keyLight": 0.75 }
}
```

静的ブロック（`core/group`）の保存結果:

```html
<!-- wp:group {"ambient":{"enabled":true,"light":"tl","surface":"convex","edge":"fillet","material":"brushed","elevation":2,"rounded":"lg","vars":{"albedo":"#2b6cb0","keyLight":0.75}}} -->
<div class="wp-block-group ambient amb-light-tl amb-surface-convex amb-fillet amb-mat-brushed amb-elevation-2 amb-rounded-lg"
     style="--amb-albedo:#2b6cb0;--amb-key-light-intensity:0.75">
  ...
</div>
<!-- /wp:group -->
```

動的ブロックの場合、`<!-- wp:... {"ambient":{...}} -->` の属性のみが本文に保存され、`class` / `style` は `render_block` が実行時に注入する。

---

## 8. アーキテクチャ

### 8.1 処理フロー

```
[エディタ]
  blocks.registerBlockType      → ambient 属性を全ブロックに追加（除外リスト適用）
  editor.BlockEdit (HOC)        → InspectorControls に Ambient パネルを描画
  editor.BlockListBlock         → キャンバス上のラッパーに class / style を適用（プレビュー）
  blocks.getSaveContent.extraProps → 静的ブロックの保存 HTML に class / style をマージ

[フロント]
  enqueue_block_assets          → ambient.css + :root インラインを出力
  render_block                  → 動的ブロックにのみ class / style を注入
```

### 8.2 変換ロジックの二重実装

クラス生成ロジックは JS（`src/class-names.js`）と PHP（`includes/class-attributes.php`）に**同一仕様で 2 実装**する必要がある。JS 側はエディタ表示と静的ブロック保存、PHP 側は動的ブロック描画に使うため。

- §7.1 / §7.2 の表を唯一の正とする。
- 両実装に同じテストケース（同一入力 → 同一クラス文字列）を用意し、乖離を検出できるようにする。

### 8.3 ファイル構成

```
wp-ambientcss/
├─ wp-ambientcss.php              # プラグインヘッダ / 定数 / ブートストラップ
├─ readme.txt                     # WordPress.org 形式（Credits に MIT 表記）
├─ LICENSE                        # GPL-2.0 全文
├─ uninstall.php                  # wp_ambientcss_settings の削除
├─ SPEC.md                        # 本書
├─ includes/
│  ├─ class-plugin.php            # シングルトン / フック登録
│  ├─ class-assets.php            # F-01, F-06 の読み込み制御
│  ├─ class-attributes.php        # §7 の変換ロジック（PHP版）+ サニタイズ
│  ├─ class-block-render.php      # F-04 render_block（動的ブロックのみ）
│  └─ class-settings.php          # F-05 設定画面 + :root 出力
├─ src/
│  ├─ index.js                    # 各 JS フィルタの登録
│  ├─ attributes.js               # §6 スキーマ定義（JS版）
│  ├─ class-names.js              # §7 の変換ロジック（JS版）
│  ├─ inspector.js                # Ambient パネル UI
│  └─ editor.scss
├─ build/                         # @wordpress/scripts 出力（コミット対象）
├─ assets/vendor/
│  ├─ ambient.css                 # @ambientcss/css@3.1.0 の dist（無改変 + ヘッダ）
│  └─ LICENSE-ambientcss.txt      # MIT ライセンス全文
├─ languages/
│  ├─ wp-ambientcss.pot
│  └─ wp-ambientcss-ja.{po,mo}
├─ bin/update-ambient-css.mjs     # npm から dist を取得して assets/vendor へ同期
├─ package.json                   # @wordpress/scripts, @ambientcss/css (devDependency)
├─ composer.json                  # wp-coding-standards/wpcs
├─ phpcs.xml.dist
└─ .wp-env.json
```

### 8.4 ビルド

- `@wordpress/scripts` の `wp-scripts build` / `start` を使う。
- `bin/update-ambient-css.mjs` は `node_modules/@ambientcss/css/dist/ambient.css` を `assets/vendor/ambient.css` へコピーし、ヘッダコメントを付与し、同時に `LICENSE` も同期する。上流更新時は本スクリプトを実行したうえで §14 の対応表検証を行う。

---

## 9. 拡張フック

### 9.1 PHP

| フック | 型 | 引数 | 用途 |
|---|---|---|---|
| `wp_ambientcss_excluded_blocks` | filter | `string[] $names` | 対象外ブロック名の増減 |
| `wp_ambientcss_enqueue_frontend` | filter | `bool $enqueue` | フロントでの読み込み可否の最終判断 |
| `wp_ambientcss_block_classes` | filter | `string[] $classes, array $ambient, array $block` | 生成クラスの加工 |
| `wp_ambientcss_block_css_vars` | filter | `array $vars, array $ambient, array $block` | インライン custom property の加工 |
| `wp_ambientcss_root_vars` | filter | `array $vars` | `:root` に出す既定値の加工 |

### 9.2 JS（`wp.hooks`）

| フック | 型 | 用途 |
|---|---|---|
| `wpAmbientcss.blockSupported` | filter | `(supported: boolean, blockName: string) => boolean` |
| `wpAmbientcss.classNames` | filter | `(classes: string[], ambient: object, blockName: string) => string[]` |

---

## 10. セキュリティ

### 10.1 属性のサニタイズ（PHP）

`render_block` で受け取る `$block['attrs']['ambient']` は**投稿本文由来の信頼できない入力**として扱う。

- enum 値（`light` / `surface` / `edge` / `material` / `rounded`）は §7.1 の**許可リストとの完全一致**のみ通す。文字列連結でクラス名を作る前に検証する。
- **enum の照合前に必ず `is_string()` で型を確認する。** ブロック属性は手編集でき、配列が入った状態で `isset( self::SURFACE[ $raw['surface'] ] )` を評価すると PHP 8 では `TypeError` となり、**フロントエンドが致命的エラーで落ちる**。
- 数値は `is_numeric()` 確認 → `floatval()` → §6.1 のレンジで clamp。**JS 側も `is_numeric()` 相当（符号・小数・指数を受理し、16進数は拒否）で揃える。** 素の `Number()` は `"0x2"` を 2 と解釈するため PHP と乖離し、同じ属性が静的ブロックと動的ブロックで違う結果になる。
- **`albedo` は長さ上限 120 バイトを設ける。** 上限が無いと `^[a-zA-Z]+$` にマッチする巨大文字列が「キーワード」として通り、該当ブロックすべての style 属性に書き込まれる。
- `albedo` は `sanitize_hex_color()` を第一候補とし、4桁/8桁 hex（`#rgba` / `#rrggbbaa`）も許可する。それ以外は「単語のみのキーワード」か「入れ子のない単一のカラー関数」だけを通し、`;` `{` `}` `<` `>` `"` `'` `\` および `/*` を含む値は拒否する（宣言の打ち切りや `url()`・コメントの混入を防ぐ）。
- **同じサニタイズを JS 側（`src/class-names.js` の `sanitizeColor()`）にも実装する。** ブロック属性は手編集でき、その値は静的ブロックの保存マークアップにそのまま書き込まれるため、PHP 側だけの検証では保存時点の混入を防げない。たとえば `red;background:url(...)` は KSES の `background` 許可により通過してしまう。
- 出力時は `esc_attr()` を通す。

### 10.2 KSES

- WordPress の `safecss_filter_attr()` は既定の `safe_style_css` 許可リストに **`--*`** を含むため、`style="--amb-albedo:#fff"` は `unfiltered_html` を持たないユーザーの投稿でも保持される（本環境の WP 7.1.2 `wp-includes/kses.php` にて確認）。
- ただし本プラグインの最小要件バージョンでの挙動を保証するため、**`safe_style_css` フィルタで `--*` を明示的に追加する保険を入れる**（既に存在する場合は重複しても無害）。
- `class` 属性は `safecss_filter_attr` の対象外なのでクラスは常に保持される。

### 10.3 管理画面

- 設定画面は `manage_options` で保護。
- Settings API（`register_setting` + `settings_fields()`）を使い、nonce と capability チェックを標準機構に任せる。
- `sanitize_callback` で §6.1 と同じ検証を行う。

---

## 11. 非機能要件

| 項目 | 内容 |
|---|---|
| CSS サイズ | `ambient.css` = 約 26KB（minified、gzip 前）。追加の JS はエディタのみ |
| 描画コスト | §4.3 のとおり全称セレクタ `*` で全要素にカスタムプロパティ計算が乗る。要素数の多いページでは無視できない可能性があるため、F-06 の `on_demand` モードを用意する |
| フロント JS | **0**（ランタイム JS を一切追加しない） |
| 保存データ | ブロック属性のみ。カスタムテーブル・カスタム投稿タイプは作らない |
| アンインストール | `uninstall.php` で `wp_ambientcss_settings` を削除。ブロック属性は投稿本文に残る（意図的。無効化してもマークアップが壊れないようにする） |

---

## 12. 互換性

### 12.1 WordPress / PHP

| 項目 | 値 | 根拠 |
|---|---|---|
| Requires at least | 6.6 | `ToolsPanel` の安定 API、`WP_HTML_Tag_Processor::add_class()`、`enqueue_block_assets` のエディタ iframe 対応が揃うバージョン。実装時に wp-env のマトリクスで実証すること |
| Tested up to | 開発時の最新 | |
| Requires PHP | 7.4 | |

### 12.2 ブラウザ

`ambient.css@3.x` は以下の比較的新しい CSS 機能に依存する。

- 相対色構文 `hsl(from …)` / `color(from …)`
- `color-mix()`
- `sign()` / `round()` / `atan2()`
- `@property`
- `backdrop-filter`（`.amb-mat-glass` のみ）

**目安として Chrome/Edge 125+、Safari 16.4+、Firefox 128+**。ただしこれは各機能のサポート状況からの推定であり、**実装時に実機で検証して readme.txt に確定値を記載すること**。

**劣化時の挙動**: 未対応ブラウザでは影・面色・グラデーションが出ないだけで、`border-radius` は効き、レイアウトは崩れない。エラーにもならない。この点を readme.txt に明記する。

---

## 13. ライセンス

### 13.1 プラグイン本体

- **GPL-2.0-or-later**。`LICENSE` に GPL-2.0 全文を置く。
- `wp-ambientcss.php` のプラグインヘッダに `License: GPL-2.0-or-later` と `License URI: https://www.gnu.org/licenses/gpl-2.0.html` を記載（既存スキャフォールドに記載済み）。
- `Update URI: false` を併記する。WordPress.org に `wp-ambientcss` という別プラグインが存在した場合、これが無いと w.org 側の更新で上書きされる危険がある。`Plugin URI` は Ambient CSS 本体ではなく**本プラグインの配布元**を指すこと。

### 13.2 同梱する Ambient CSS

- `assets/vendor/ambient.css` は **[Ambient CSS](https://github.com/kikkupico/ambientcss)（`@ambientcss/css` v3.1.0）の無改変コピー**であり、**MIT License / Copyright (c) 2026 Ramakrishnan Veeraragavan（GitHub: kikkupico）** のもとで配布される。
- `assets/vendor/LICENSE-ambientcss.txt` に MIT ライセンス**全文**を配置する（MIT はライセンス文と著作権表示の同梱を要求するため、参照リンクだけでは不足）。
- `assets/vendor/ambient.css` の先頭に以下の趣旨のコメントを付ける。

  ```css
  /*!
   * Ambient CSS v3.1.0 (@ambientcss/css)
   * https://github.com/kikkupico/ambientcss
   * Copyright (c) 2026 Ramakrishnan Veeraragavan (kikkupico)
   * Released under the MIT License.
   * Full license text: assets/vendor/LICENSE-ambientcss.txt
   * このファイルは無改変のコピーです（本コメントヘッダを除く）。
   */
  ```

- `readme.txt` に Credits セクションを設け、上記と同じ内容を記載する。

### 13.3 ライセンス互換性

MIT は GPL-2.0 と互換（MIT は GPL に対して permissive で、GPL 配布物への取り込みが認められている）。したがって GPL-2.0-or-later のプラグインに MIT の CSS を同梱して配布できる。元の著作権表示とライセンス文を保持することが MIT 側の条件であり、§13.2 でこれを満たす。

---

## 14. 受け入れ基準

実装完了の判定に用いるチェックリスト。

### クラス・変数の出力

- [ ] §7.1 の全パターンで、期待どおりのクラス文字列が生成される（JS / PHP 双方）
- [ ] §7.2 の全 `vars` キーで、期待どおりのインライン custom property が出力される
- [ ] `lightSaturation` にのみ `%` が付く
- [ ] 未設定キーが一切出力されない（`0` / `false` は出力される）
- [ ] 許可リスト外の値が属性に入っていても、クラスに出力されない
- [ ] `vars.lightX/Y` 設定時に `.amb-light-*` が出力されない（§7.3）

### ブロック対応

- [ ] 除外リストのブロックにはインスペクターパネルが出ない
- [ ] 静的ブロック（`core/group` / `core/button` / `core/image`）でフロントとエディタの見た目が一致する
- [ ] 動的ブロック（`core/latest-posts` / `core/query`）で `render_block` 経由のクラス注入が効く
- [ ] 静的ブロックに対して PHP 側が二重にクラスを付けていない
- [ ] `ambient` 属性を持たない既存投稿のマークアップが一切変化しない

### セキュリティ

- [ ] 投稿本文に細工された `ambient` 属性（不正 enum / 巨大数値 / `url()` 入り albedo）を入れても、危険な CSS が出力されない
- [ ] `unfiltered_html` を持たない権限（投稿者ロール）で保存しても `--amb-*` インラインが KSES に剥がされない
- [ ] 設定画面が `manage_options` 未満の権限でアクセスできない

### 品質・運用

- [ ] `phpcs` (WordPress Coding Standards) が警告なしで通る
- [ ] `wp-scripts lint-js` が通る
- [x] JS / PHP の変換ロジックが同一テストケースで一致する（38ケースで検証済み）
- [x] 敵対的な属性形状（配列・巨大値・NaN・null バイト・CSS エスケープ等 21パターン）で PHP エラーが出ない
- [ ] `.pot` が生成され、ja 翻訳がエディタと設定画面の両方に反映される
- [ ] §12.2 のブラウザで実機確認し、readme.txt に確定した対応バージョンを記載した
- [ ] 未対応ブラウザでレイアウトが崩れないことを確認した
- [ ] `on_demand` モードでスタイルが正しく出力される／出力されないことを確認した
- [ ] `assets/vendor/LICENSE-ambientcss.txt` と CSS ヘッダと readme.txt の Credits が揃っている

---

## 15. スコープ外 / 将来拡張

| 項目 | 理由・方針 |
|---|---|
| `.amb-emit-*`（発光色） | §4.1.8 のとおり `dist/ambient.css` 単体では視覚効果がない（`var(--amb-emit-color)` の参照が 0 件）。`@ambientcss/components` 相当の実装を伴わないと意味を成さないため v1 では出さない |
| `@ambientcss/components` 相当のブロック | ノブ・スライダー・スイッチ等のインタラクティブ部品。別プラグインまたは v2 で検討 |
| `theme.json` 連携 | テーマ側から既定の光源やパレットを宣言できるようにする。v2 候補 |
| ブロックスタイルバリエーション | 「パネル」「ボタン」「くぼみ」等の名前付きプリセットを `register_block_style` で提供する。v2 候補 |
| ブロックパターン集 | Ambient CSS を使ったサンプルパターンの同梱 |
| グローバルスタイル（サイトエディタ）連携 | サイトエディタのスタイルパネルへの統合 |
| `--amb-chamfer-width` / `--amb-fillet-width` の露出 | エッジ幅の微調整。需要が見えてから |

---

## 付録 A: 元の要件（原文）

> [https://github.com/kikkupico/ambientcss](https://github.com/kikkupico/ambientcss)
>
> のスタイルをWordPressのブロックのプロパティとして利用できるようにするプラグインを作成したい
>
> ライセンスの記述をお願いします。
>
> プラグイン名 : WP **Ambient CSS**

## 付録 B: 参照

- Ambient CSS リポジトリ: https://github.com/kikkupico/ambientcss
- ドキュメント: https://kikkupico.github.io/ambientcss/
- npm: https://www.npmjs.com/package/@ambientcss/css
- 本書が根拠とした実ファイル: `@ambientcss/css@3.1.0` の `dist/ambient.css`（26,175 bytes）
