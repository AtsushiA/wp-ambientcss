# WP Ambient CSS

[日本語](README.md) | **English**

[![CI](https://github.com/AtsushiA/wp-ambientcss/actions/workflows/ci.yml/badge.svg)](https://github.com/AtsushiA/wp-ambientcss/actions/workflows/ci.yml)

Use [Ambient CSS](https://github.com/kikkupico/ambientcss) as block settings in the WordPress editor.

Ambient CSS derives shadows, highlights and surface gradients from a single light source, the way a renderer would, instead of asking you to tune each `box-shadow` by hand. This plugin exposes that as controls in the block inspector: pick a surface, a material, an edge treatment and an elevation, and the block gets the matching classes and custom properties.

No theme changes, no additional CSS.

## Requirements

| | |
|---|---|
| WordPress | 6.6 or later |
| PHP | 7.4 or later |
| Browser | Relative colour syntax `hsl(from …)`, `color-mix()`, `sign()` / `round()` / `atan2()`, `@property` |

Roughly Chrome/Edge 125+, Safari 16.4+ and Firefox 128+; only Chromium has been verified. Where those features are missing the shadows and surface colours simply do not appear — `border-radius` still applies and nothing about the layout breaks.

## Installation

1. Download `wp-ambientcss-x.y.z.zip` from [Releases](https://github.com/AtsushiA/wp-ambientcss/releases)
2. Plugins → Add New → Upload Plugin
3. Activate

## Usage

Select a block and open the **Ambient** panel in the inspector. Turning on "Enable Ambient" unlocks the rest of the controls.

### Basic

| Control | Options |
|---|---|
| Light direction | Eight-way grid, or inherit |
| Surface | None / Flat / Concave (vertical) / Concave (horizontal) / Convex |
| Material | Matte / Shiny / Glass / Brushed / Brushed (circular) / Blasted |
| Edge | None / Chamfer / Chamfer 2 / Fillet / Fillet 2 / Groove |
| Elevation | 0–3 |
| Thickness | 0–2 (overrides what an edge treatment sets on its own) |
| Corner radius | None / 4px / 8px / 12px / 16px / Pill |
| Glow | On / off |

### Advanced

Surface colour (albedo), reflectance, key and fill light, light hue and saturation, light X / Y, grain amount, curve strength, and a bounce animation.

### Following the pointer

A block can take its light from the visitor's pointer, in one of two modes.

| Mode | Behaviour |
|---|---|
| Whole page | One light source shared across every following block, lit from the pointer's position in the viewport |
| This block | The block gets its own light, lit from wherever the pointer is over it |

Both can be used on the same page. When the pointer leaves, **the light stays where it was** rather than springing back, so nothing moves on its own.

On a following block the direction presets and the light X / Y sliders are disabled, because the script owns the light vector.

### Site-wide defaults

Settings → Ambient CSS sets the starting point for every block: light vector, intensities, hue and saturation, surface colour and grain. Leave a field empty to keep the Ambient CSS default.

The same screen chooses whether the stylesheet loads on every page or only on pages that use Ambient.

## Loading and performance

- **No front-end JavaScript by default.** Pages containing a following block load a dependency-free script of about 1.1KB; nothing else does
- The stylesheet is about 26KB (Ambient CSS itself)
- Following, measured on Chromium: whole-page mode costs ~2.0ms per update at 200 ambient elements, per-block mode ~1.2ms per frame at 50 — both inside a 60fps budget
- The script sits out entirely on devices without a hovering pointer, and for visitors who have asked for reduced motion

## Supported blocks

Every block that accepts a custom class name, except the following, which either have no markup of their own or would be broken by an extra class:

```
core/freeform  core/html      core/shortcode  core/missing
core/nextpage  core/more      core/block      core/pattern
core/legacy-widget            core/widget-area
core/template-part
```

## Extending

### PHP filters

| Hook | Purpose |
|---|---|
| `wp_ambientcss_excluded_blocks` | Change which blocks are excluded |
| `wp_ambientcss_enqueue_frontend` | Whether the stylesheet loads on the front end |
| `wp_ambientcss_enqueue_follow` | Whether the following script loads |
| `wp_ambientcss_block_classes` | Adjust the generated classes |
| `wp_ambientcss_block_css_vars` | Adjust the inline custom properties |
| `wp_ambientcss_root_vars` | Adjust the `:root` defaults |

### JavaScript filters (`wp.hooks`)

| Hook | Purpose |
|---|---|
| `wpAmbientcss.blockSupported` | Whether a block gets the controls |
| `wpAmbientcss.classNames` | Adjust the generated classes |

## Development

### Setup

```bash
npm install
composer install
```

Node 24.18 or later is required — it is what the `@php-wasm` packages behind wp-env ask for.

### Build

```bash
npm run build     # production build, including the translation JSON
npm start         # watch build
```

`build/` is committed so the plugin runs straight from a checkout, and CI fails if it is out of date.

### Tests

```bash
npm run env:start     # start wp-env (needs Docker)
npm run test:e2e      # Playwright end-to-end tests
npm run test:e2e:ui   # UI mode for debugging
```

### Static analysis

```bash
npm run lint:js       # ESLint (@wordpress/recommended)
composer run lint     # phpcs (WordPress Coding Standards)
```

### Updating Ambient CSS

```bash
npm run update:ambient   # sync from node_modules into assets/vendor/
```

The class names and custom properties of the bundled stylesheet are pinned by the mapping tables in [SPEC.md](SPEC.md). Re-check them after bumping the upstream version.

### Translations

```bash
npm run i18n:pot   # generate the .pot
npm run i18n:mo    # compile .po into .mo
npm run i18n:json  # generate the editor JSON
```

### Releasing

Pushing a `0.0.0` tag builds the plugin zip and attaches it to a GitHub Release. The build fails if the tag does not match the plugin header, the `Stable tag` in `readme.txt` and `WP_AMBIENTCSS_VERSION`.

```bash
git tag 0.2.0
git push origin 0.2.0
```

## Design

[SPEC.md](SPEC.md) (Japanese) holds the implementation specification: the block attribute schema, the tables mapping attributes to class names and custom properties, how static and dynamic blocks each reach the page, and the reasoning behind the security decisions.

## Licence

This plugin is **GPL-2.0-or-later**. See [LICENSE](LICENSE) for the full text.

`assets/vendor/ambient.css` is an unmodified copy of [Ambient CSS](https://github.com/kikkupico/ambientcss) (`@ambientcss/css` v3.1.0), released under the **MIT License, Copyright (c) 2026 Ramakrishnan Veeraragavan**. Its full licence text ships alongside it in [assets/vendor/LICENSE-ambientcss.txt](assets/vendor/LICENSE-ambientcss.txt).

MIT is compatible with the GPL, so the bundled stylesheet may be distributed as part of this GPL-2.0-or-later plugin.
