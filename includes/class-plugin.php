<?php
/**
 * Plugin bootstrap.
 *
 * @package WP_AmbientCSS
 */

namespace WP_AmbientCSS;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Wires the plugin together.
 */
class Plugin {

	/**
	 * Singleton instance.
	 *
	 * @var Plugin|null
	 */
	private static $instance = null;

	/**
	 * Assets handler.
	 *
	 * @var Assets
	 */
	private $assets;

	/**
	 * Block renderer.
	 *
	 * @var Block_Render
	 */
	private $block_render;

	/**
	 * Settings handler.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * Returns the shared instance.
	 *
	 * @return Plugin
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	private function __construct() {
		$this->assets       = new Assets();
		$this->block_render = new Block_Render( $this->assets );
		$this->settings     = new Settings();
	}

	/**
	 * Registers every hook.
	 */
	public function init() {
		add_action( 'init', array( $this, 'load_textdomain' ) );
		add_filter( 'safe_style_css', array( $this, 'allow_custom_properties' ) );

		$this->assets->init();
		$this->block_render->init();
		$this->settings->init();
	}

	/**
	 * Loads translations.
	 */
	public function load_textdomain() {
		load_plugin_textdomain(
			'wp-ambientcss',
			false,
			dirname( plugin_basename( WP_AMBIENTCSS_FILE ) ) . '/languages'
		);
	}

	/**
	 * Keeps `--amb-*` declarations from being stripped by KSES.
	 *
	 * Current WordPress already allows custom properties in inline styles, so
	 * this is a no-op there. It stays as insurance for older versions, where
	 * an author without `unfiltered_html` would otherwise lose the values on
	 * save.
	 *
	 * @param string[] $attrs Allowed style properties.
	 * @return string[] Allowed style properties.
	 */
	public function allow_custom_properties( $attrs ) {
		if ( ! in_array( '--*', $attrs, true ) ) {
			$attrs[] = '--*';
		}

		return $attrs;
	}
}
