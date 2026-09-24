=== WP Ambient CSS ===
Contributors: nextseason
Tags: blocks, block editor, css, design, shadows
Requires at least: 6.6
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Use Ambient CSS lighting, surface and material styles as properties on any WordPress block.

== Description ==

Ambient CSS derives shadows, highlights and surface gradients from a single
light source, the way a renderer would, instead of asking you to tune each
box-shadow by hand. This plugin makes that available as block settings: pick a
surface, a material, an edge treatment and an elevation in the block
inspector, and the block gets the matching classes and custom properties.

Everything is plain CSS. The plugin adds no JavaScript to the front end and
stores nothing outside of block attributes and one options row.

= What you can set per block =

* Light direction, or an exact light vector
* Surface: flat, concave (vertical or horizontal), convex
* Material: matte, shiny, glass, brushed, brushed circular, blasted
* Edge: chamfer, fillet, groove
* Elevation and thickness
* Corner radius and glow
* Advanced: surface color (albedo), reflectance, key and fill light, light hue
  and saturation, grain amount, curve strength

= Site wide defaults =

Settings -> Ambient CSS sets the starting point for every block, written to
`:root`. Leave a field empty to keep the Ambient CSS default.

== Frequently Asked Questions ==

= Does this work with every block? =

Every block that accepts a custom class name, which is nearly all of them.
Blocks with no markup of their own, such as Classic, Custom HTML and
Shortcode, are excluded. Developers can change the list with the
`wp_ambientcss_excluded_blocks` filter.

= What happens in older browsers? =

Ambient CSS relies on recent CSS features, including relative color syntax and
`color-mix()`. Where those are missing the shadows and surface colors simply do
not appear. Corner radius still applies and nothing about the layout breaks.

= What happens if I deactivate the plugin? =

The classes stay in your post content but stop matching any stylesheet, so
blocks render as they would without Ambient. Nothing is rewritten.

== Changelog ==

= 0.1.0 =
* Initial release.

== Credits ==

This plugin bundles Ambient CSS (`@ambientcss/css`) v3.1.0 by Ramakrishnan
Veeraragavan (kikkupico), released under the MIT License.

* Source: https://github.com/kikkupico/ambientcss
* Bundled file: assets/vendor/ambient.css
* Full license text: assets/vendor/LICENSE-ambientcss.txt

The MIT License is compatible with the GPL, so the bundled stylesheet may be
distributed as part of this GPL-2.0-or-later plugin. The upstream copyright
notice and license text are kept intact as MIT requires.
