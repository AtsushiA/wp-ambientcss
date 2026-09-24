<?php
/**
 * Plugin Name: WP Ambient CSS
 * Plugin URI: https://next-season.net/
 * Update URI: false
 * Description: Use Ambient CSS lighting, surface and material styles as properties on any WordPress block.
 * Version: 0.1.0
 * Requires at least: 6.6
 * Requires PHP: 7.4
 * Author: NExT-Season
 * Author URI: https://next-season.net
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: wp-ambientcss
 * Domain Path: /languages
 *
 * This plugin bundles Ambient CSS (@ambientcss/css), which is released under
 * the MIT License. See assets/vendor/LICENSE-ambientcss.txt for its full text.
 *
 * @package WP_AmbientCSS
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'WP_AMBIENTCSS_VERSION', '0.1.0' );
define( 'WP_AMBIENTCSS_FILE', __FILE__ );
define( 'WP_AMBIENTCSS_DIR', plugin_dir_path( __FILE__ ) );
define( 'WP_AMBIENTCSS_URL', plugin_dir_url( __FILE__ ) );

require_once WP_AMBIENTCSS_DIR . 'includes/class-attributes.php';
require_once WP_AMBIENTCSS_DIR . 'includes/class-settings.php';
require_once WP_AMBIENTCSS_DIR . 'includes/class-assets.php';
require_once WP_AMBIENTCSS_DIR . 'includes/class-block-render.php';
require_once WP_AMBIENTCSS_DIR . 'includes/class-plugin.php';

WP_AmbientCSS\Plugin::instance()->init();
