<?php
/**
 * Stylesheet and editor script loading (SPEC.md F-01, F-06).
 *
 * @package WP_AmbientCSS
 */

namespace WP_AmbientCSS;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the bundled Ambient stylesheet and the editor integration script.
 */
class Assets {

	const HANDLE        = 'wp-ambientcss';
	const EDITOR_HANDLE = 'wp-ambientcss-editor';

	/**
	 * Whether a block using Ambient has been rendered on this request.
	 *
	 * @var bool
	 */
	private $used = false;

	/**
	 * Hooks asset loading.
	 */
	public function init() {
		add_action( 'init', array( $this, 'register' ) );
		add_action( 'enqueue_block_assets', array( $this, 'enqueue_block_assets' ) );
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_assets' ) );
	}

	/**
	 * Registers the stylesheet so it can be enqueued from anywhere, including
	 * mid-render for the on-demand load mode.
	 */
	public function register() {
		$path = WP_AMBIENTCSS_DIR . 'assets/vendor/ambient.css';

		wp_register_style(
			self::HANDLE,
			WP_AMBIENTCSS_URL . 'assets/vendor/ambient.css',
			array(),
			file_exists( $path ) ? (string) filemtime( $path ) : WP_AMBIENTCSS_VERSION
		);

		$root = Settings::get_root_css();
		if ( '' !== $root ) {
			wp_add_inline_style( self::HANDLE, $root );
		}
	}

	/**
	 * Enqueues the stylesheet for the front end and the editor canvas.
	 *
	 * `enqueue_block_assets` fires in both contexts and its styles are
	 * injected into the editor iframe, which is what keeps the editor preview
	 * and the front end in agreement.
	 */
	public function enqueue_block_assets() {
		if ( is_admin() ) {
			// Always load inside the editor, otherwise the preview is wrong.
			wp_enqueue_style( self::HANDLE );
			return;
		}

		$enqueue = 'always' === Settings::load_mode();

		/**
		 * Filters whether the Ambient stylesheet is loaded on the front end.
		 *
		 * @param bool $enqueue Whether to enqueue.
		 */
		if ( apply_filters( 'wp_ambientcss_enqueue_frontend', $enqueue ) ) {
			wp_enqueue_style( self::HANDLE );
		}
	}

	/**
	 * Marks the stylesheet as needed for the current request.
	 *
	 * Used by the on-demand load mode, which cannot know up front whether any
	 * block on the page uses Ambient.
	 */
	public function mark_used() {
		if ( $this->used || is_admin() ) {
			return;
		}

		$this->used = true;

		/** This filter is documented in includes/class-assets.php */
		if ( apply_filters( 'wp_ambientcss_enqueue_frontend', true ) ) {
			wp_enqueue_style( self::HANDLE );
		}
	}

	/**
	 * Enqueues the editor integration script.
	 */
	public function enqueue_editor_assets() {
		$asset_file = WP_AMBIENTCSS_DIR . 'build/index.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = require $asset_file;

		wp_enqueue_script(
			self::EDITOR_HANDLE,
			WP_AMBIENTCSS_URL . 'build/index.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_set_script_translations( self::EDITOR_HANDLE, 'wp-ambientcss', WP_AMBIENTCSS_DIR . 'languages' );

		wp_add_inline_script(
			self::EDITOR_HANDLE,
			'window.wpAmbientcssSettings = ' . wp_json_encode(
				array(
					'excludedBlocks' => array_values( Block_Render::get_excluded_blocks() ),
				),
				// The block names pass through a filter, so escape anything
				// that could close the script element early.
				JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
			) . ';',
			'before'
		);

		if ( file_exists( WP_AMBIENTCSS_DIR . 'build/index.css' ) ) {
			wp_enqueue_style(
				self::EDITOR_HANDLE,
				WP_AMBIENTCSS_URL . 'build/index.css',
				array(),
				$asset['version']
			);
		}
	}
}
