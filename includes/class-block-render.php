<?php
/**
 * Server side rendering for dynamic blocks (SPEC.md F-04).
 *
 * @package WP_AmbientCSS
 */

namespace WP_AmbientCSS;

use WP_Block_Type_Registry;
use WP_HTML_Tag_Processor;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Injects Ambient classes and custom properties into dynamic block output.
 *
 * Static blocks already carry the class and style in their saved markup,
 * written by the editor, so they are deliberately skipped here.
 */
class Block_Render {

	/**
	 * Blocks that never get the Ambient controls.
	 *
	 * These either have no markup of their own, would be broken by an extra
	 * wrapper class, or are containers whose styling belongs elsewhere.
	 *
	 * @var string[]
	 */
	const EXCLUDED = array(
		'core/freeform',
		'core/html',
		'core/shortcode',
		'core/missing',
		'core/nextpage',
		'core/more',
		'core/block',
		'core/pattern',
		'core/legacy-widget',
		'core/widget-area',
		'core/template-part',
	);

	/**
	 * Assets instance, used to flag on-demand loading.
	 *
	 * @var Assets
	 */
	private $assets;

	/**
	 * Cache of block name => is dynamic.
	 *
	 * @var array<string, bool>
	 */
	private $dynamic_cache = array();

	/**
	 * Constructor.
	 *
	 * @param Assets $assets Assets instance.
	 */
	public function __construct( Assets $assets ) {
		$this->assets = $assets;
	}

	/**
	 * Hooks block rendering.
	 */
	public function init() {
		add_filter( 'render_block', array( $this, 'render_block' ), 10, 2 );
	}

	/**
	 * Returns the excluded block names.
	 *
	 * @return string[]
	 */
	public static function get_excluded_blocks() {
		/**
		 * Filters the blocks that do not get Ambient controls.
		 *
		 * @param string[] $names Block names.
		 */
		$names = apply_filters( 'wp_ambientcss_excluded_blocks', self::EXCLUDED );

		return is_array( $names ) ? $names : self::EXCLUDED;
	}

	/**
	 * Adds the Ambient class and style to dynamic block output.
	 *
	 * @param string $content Rendered block HTML.
	 * @param array  $block   Parsed block.
	 * @return string Possibly modified HTML.
	 */
	public function render_block( $content, $block ) {
		if ( ! is_string( $content ) || '' === trim( $content ) ) {
			return $content;
		}
		if ( empty( $block['blockName'] ) || empty( $block['attrs']['ambient'] ) ) {
			return $content;
		}
		if ( in_array( $block['blockName'], self::get_excluded_blocks(), true ) ) {
			return $content;
		}

		$ambient = Attributes::sanitize( $block['attrs']['ambient'] );
		if ( empty( $ambient ) ) {
			return $content;
		}

		// The stylesheet is needed either way, even for a static block whose
		// markup was written by the editor.
		$this->assets->mark_used();

		if ( isset( $ambient['follow'] ) ) {
			$this->assets->mark_follow_used();
		}

		// Static blocks already have the class in their saved markup. Adding
		// it again here would duplicate it.
		if ( ! $this->is_dynamic( $block['blockName'] ) ) {
			return $content;
		}

		$classes = Attributes::get_classes( $ambient, $block );
		$vars    = Attributes::get_css_vars( $ambient, $block );
		$data    = Attributes::get_data_attributes( $ambient );

		if ( empty( $classes ) && empty( $vars ) && empty( $data ) ) {
			return $content;
		}

		return $this->apply_to_first_tag( $content, $classes, $vars, $data );
	}

	/**
	 * Whether a block type renders on the server.
	 *
	 * @param string $name Block name.
	 * @return bool
	 */
	private function is_dynamic( $name ) {
		if ( isset( $this->dynamic_cache[ $name ] ) ) {
			return $this->dynamic_cache[ $name ];
		}

		$type    = WP_Block_Type_Registry::get_instance()->get_registered( $name );
		$dynamic = ( $type instanceof \WP_Block_Type ) && $type->is_dynamic();

		$this->dynamic_cache[ $name ] = $dynamic;

		return $dynamic;
	}

	/**
	 * Adds classes and custom properties to the outermost tag of some HTML.
	 *
	 * Existing class and style attributes are preserved.
	 *
	 * @param string                $content HTML.
	 * @param string[]              $classes Class names to add.
	 * @param array<string, string> $vars    Custom properties to add.
	 * @param array<string, string> $data    Data attributes to add.
	 * @return string Modified HTML, or the original when there is no tag.
	 */
	private function apply_to_first_tag( $content, array $classes, array $vars, array $data = array() ) {
		$tags = new WP_HTML_Tag_Processor( $content );

		if ( ! $tags->next_tag() ) {
			return $content;
		}

		foreach ( $classes as $class ) {
			$tags->add_class( $class );
		}

		if ( ! empty( $vars ) ) {
			$declarations = Attributes::vars_to_style( $vars );
			$existing     = $tags->get_attribute( 'style' );

			if ( is_string( $existing ) && '' !== trim( $existing ) ) {
				$declarations = rtrim( trim( $existing ), ';' ) . ';' . $declarations;
			}

			$tags->set_attribute( 'style', $declarations );
		}

		foreach ( $data as $name => $value ) {
			$tags->set_attribute( $name, $value );
		}

		return $tags->get_updated_html();
	}
}
