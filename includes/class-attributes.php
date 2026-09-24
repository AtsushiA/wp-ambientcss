<?php
/**
 * Conversion and sanitization of the `ambient` block attribute.
 *
 * This class is the PHP half of the conversion logic defined in SPEC.md
 * section 7. The JavaScript half lives in src/class-names.js and must stay
 * byte-for-byte equivalent in its output.
 *
 * @package WP_AmbientCSS
 */

namespace WP_AmbientCSS;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Turns a sanitized `ambient` attribute array into class names and CSS
 * custom properties.
 */
class Attributes {

	/**
	 * Allowed values for the `light` attribute, mapped to their class suffix.
	 *
	 * @var string[]
	 */
	const LIGHT = array( 'tl', 'tr', 'bl', 'br', 'top', 'bottom', 'left', 'right' );

	/**
	 * Allowed `surface` values mapped to their full class name.
	 *
	 * @var array<string, string>
	 */
	const SURFACE = array(
		'flat'      => 'amb-surface',
		'concave'   => 'amb-surface-concave',
		'concave-h' => 'amb-surface-concave-h',
		'convex'    => 'amb-surface-convex',
	);

	/**
	 * Allowed `edge` values. The class name is `amb-` plus the value.
	 *
	 * @var string[]
	 */
	const EDGE = array( 'chamfer', 'chamfer-2', 'fillet', 'fillet-2', 'groove' );

	/**
	 * Allowed `material` values. The class name is `amb-mat-` plus the value.
	 *
	 * @var string[]
	 */
	const MATERIAL = array( 'shiny', 'glass', 'brushed', 'brushed-round', 'blasted' );

	/**
	 * Allowed `rounded` values mapped to their full class name.
	 *
	 * @var array<string, string>
	 */
	const ROUNDED = array(
		'base' => 'amb-rounded',
		'md'   => 'amb-rounded-md',
		'lg'   => 'amb-rounded-lg',
		'xl'   => 'amb-rounded-xl',
		'full' => 'amb-rounded-full',
	);

	/**
	 * Allowed `elevation` values.
	 *
	 * @var int[]
	 */
	const ELEVATION = array( 0, 1, 2, 3 );

	/**
	 * Allowed `thickness` values.
	 *
	 * @var int[]
	 */
	const THICKNESS = array( 0, 1, 2 );

	/**
	 * Longest accepted `--amb-albedo` value, in bytes.
	 *
	 * @var int
	 */
	const MAX_COLOR_LENGTH = 120;

	/**
	 * Numeric `vars` keys: CSS property, minimum, maximum and unit suffix.
	 *
	 * @var array<string, array{0: string, 1: float, 2: float, 3: string}>
	 */
	const NUMERIC_VARS = array(
		'shade'           => array( '--amb-shade', 0, 2, '' ),
		'keyLight'        => array( '--amb-key-light-intensity', 0, 1, '' ),
		'fillLight'       => array( '--amb-fill-light-intensity', 0, 1, '' ),
		'lightHue'        => array( '--amb-light-hue', 0, 360, '' ),
		'lightSaturation' => array( '--amb-light-saturation', 0, 100, '%' ),
		'lightX'          => array( '--amb-light-x', -1, 1, '' ),
		'lightY'          => array( '--amb-light-y', -1, 1, '' ),
		'grain'           => array( '--amb-grain-amount', 0, 2, '' ),
		'curveScale'      => array( '--amb-curve-scale', 0, 2, '' ),
	);

	/**
	 * Sanitizes a raw `ambient` attribute coming from post content.
	 *
	 * Post content is untrusted input, so every value is checked against the
	 * allow lists above before it is ever concatenated into a class name.
	 *
	 * @param mixed $raw Raw attribute value.
	 * @return array Sanitized attribute array, empty when nothing is usable.
	 */
	public static function sanitize( $raw ) {
		if ( ! is_array( $raw ) ) {
			return array();
		}

		$out = array();

		if ( ! empty( $raw['enabled'] ) ) {
			$out['enabled'] = true;
		}
		if ( ! empty( $raw['glow'] ) ) {
			$out['glow'] = true;
		}
		if ( ! empty( $raw['bounce'] ) ) {
			$out['bounce'] = true;
		}

		// Every lookup below is guarded by is_string() first. Block attributes
		// come from post content, which can be hand-edited, and using an array
		// as an array key is a fatal error on PHP 8.
		if ( isset( $raw['light'] ) && is_string( $raw['light'] )
			&& in_array( $raw['light'], self::LIGHT, true ) ) {
			$out['light'] = $raw['light'];
		}
		if ( isset( $raw['surface'] ) && is_string( $raw['surface'] )
			&& isset( self::SURFACE[ $raw['surface'] ] ) ) {
			$out['surface'] = $raw['surface'];
		}
		if ( isset( $raw['edge'] ) && is_string( $raw['edge'] )
			&& in_array( $raw['edge'], self::EDGE, true ) ) {
			$out['edge'] = $raw['edge'];
		}
		if ( isset( $raw['material'] ) && is_string( $raw['material'] )
			&& in_array( $raw['material'], self::MATERIAL, true ) ) {
			$out['material'] = $raw['material'];
		}
		if ( isset( $raw['rounded'] ) && is_string( $raw['rounded'] )
			&& isset( self::ROUNDED[ $raw['rounded'] ] ) ) {
			$out['rounded'] = $raw['rounded'];
		}

		// Cast before comparing so that a JSON "2" still matches. is_numeric()
		// rejects arrays and booleans, so the cast is safe.
		if ( isset( $raw['elevation'] ) && is_numeric( $raw['elevation'] )
			&& in_array( (int) $raw['elevation'], self::ELEVATION, true ) ) {
			$out['elevation'] = (int) $raw['elevation'];
		}
		if ( isset( $raw['thickness'] ) && is_numeric( $raw['thickness'] )
			&& in_array( (int) $raw['thickness'], self::THICKNESS, true ) ) {
			$out['thickness'] = (int) $raw['thickness'];
		}

		$vars = self::sanitize_vars( isset( $raw['vars'] ) ? $raw['vars'] : null );
		if ( ! empty( $vars ) ) {
			$out['vars'] = $vars;
		}

		return $out;
	}

	/**
	 * Sanitizes the `vars` sub-object.
	 *
	 * @param mixed $raw Raw vars value.
	 * @return array Sanitized vars, keyed by attribute name.
	 */
	public static function sanitize_vars( $raw ) {
		if ( ! is_array( $raw ) ) {
			return array();
		}

		$out = array();

		foreach ( self::NUMERIC_VARS as $key => $spec ) {
			if ( ! isset( $raw[ $key ] ) || ! is_numeric( $raw[ $key ] ) ) {
				continue;
			}
			list( , $min, $max ) = $spec;
			$out[ $key ]         = max( $min, min( $max, (float) $raw[ $key ] ) );
		}

		if ( isset( $raw['albedo'] ) && is_string( $raw['albedo'] ) ) {
			$color = self::sanitize_color( $raw['albedo'] );
			if ( '' !== $color ) {
				$out['albedo'] = $color;
			}
		}

		return $out;
	}

	/**
	 * Sanitizes a CSS color used for `--amb-albedo`.
	 *
	 * Hex colors go through the core helper. Other notations are allowed only
	 * when they are a plain keyword or a simple functional color, and never
	 * when they contain characters that could break out of the declaration or
	 * smuggle in a url() or comment.
	 *
	 * @param string $value Raw color.
	 * @return string Safe color, or an empty string when rejected.
	 */
	public static function sanitize_color( $value ) {
		$value = trim( $value );

		// The longest thing anyone reasonably writes here is a color-mix()
		// with two stops. Without a cap, a hand-edited attribute could put
		// megabytes of "keyword" into the style attribute of every block.
		if ( '' === $value || strlen( $value ) > self::MAX_COLOR_LENGTH ) {
			return '';
		}

		$hex = sanitize_hex_color( $value );
		if ( $hex ) {
			return $hex;
		}

		// sanitize_hex_color() only knows 3 and 6 digit hex; #rgba and
		// #rrggbbaa are just as ordinary coming out of a color picker.
		if ( preg_match( '/^#(?:[A-Fa-f0-9]{4}|[A-Fa-f0-9]{8})$/', $value ) ) {
			return $value;
		}

		// Reject anything that could terminate the declaration, open a
		// comment, or pull in an external resource.
		if ( preg_match( '/[;{}\\\\<>"\']/', $value ) || false !== strpos( $value, '/*' ) ) {
			return '';
		}

		// Plain keyword, e.g. "rebeccapurple" or "transparent".
		if ( preg_match( '/^[a-zA-Z]+$/', $value ) ) {
			return $value;
		}

		// A single functional color such as rgb(), hsl(), oklch(), lab(),
		// color() or color-mix(). No nested parentheses, no url().
		if ( preg_match( '/^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(\s*[a-zA-Z0-9\s.,%\/+-]*\s*\)$/', $value ) ) {
			return $value;
		}

		return '';
	}

	/**
	 * Builds the list of class names for a sanitized attribute array.
	 *
	 * Order follows the table in SPEC.md section 7.1 so that markup diffs stay
	 * stable.
	 *
	 * @param array $ambient Sanitized attribute array.
	 * @param array $block   Optional parsed block, passed to the filter.
	 * @return string[] Class names.
	 */
	public static function get_classes( array $ambient, array $block = array() ) {
		$classes = array();

		if ( ! empty( $ambient['enabled'] ) ) {
			$classes[] = 'ambient';
		}

		// An explicit light vector wins over the class anyway, because inline
		// styles beat class selectors. Skip the preset so the markup does not
		// claim something the rendering contradicts. See SPEC.md 7.3.
		$has_light_vector = isset( $ambient['vars']['lightX'] ) || isset( $ambient['vars']['lightY'] );

		if ( isset( $ambient['light'] ) && ! $has_light_vector ) {
			$classes[] = 'amb-light-' . $ambient['light'];
		}
		if ( isset( $ambient['surface'] ) ) {
			$classes[] = self::SURFACE[ $ambient['surface'] ];
		}
		if ( isset( $ambient['edge'] ) ) {
			$classes[] = 'amb-' . $ambient['edge'];
		}
		if ( isset( $ambient['material'] ) ) {
			$classes[] = 'amb-mat-' . $ambient['material'];
		}
		if ( isset( $ambient['elevation'] ) ) {
			$classes[] = 'amb-elevation-' . $ambient['elevation'];
		}
		if ( isset( $ambient['thickness'] ) ) {
			$classes[] = 'amb-thickness-' . $ambient['thickness'];
		}
		if ( isset( $ambient['rounded'] ) ) {
			$classes[] = self::ROUNDED[ $ambient['rounded'] ];
		}
		if ( ! empty( $ambient['glow'] ) ) {
			$classes[] = 'amb-glow';
		}
		if ( ! empty( $ambient['bounce'] ) ) {
			$classes[] = 'amb-bounce';
		}

		/**
		 * Filters the Ambient class names generated for a block.
		 *
		 * @param string[] $classes Class names.
		 * @param array    $ambient Sanitized ambient attribute.
		 * @param array    $block   Parsed block, when available.
		 */
		return apply_filters( 'wp_ambientcss_block_classes', $classes, $ambient, $block );
	}

	/**
	 * Builds the CSS custom properties for a sanitized attribute array.
	 *
	 * @param array $ambient Sanitized attribute array.
	 * @param array $block   Optional parsed block, passed to the filter.
	 * @return array<string, string> Property name => value.
	 */
	public static function get_css_vars( array $ambient, array $block = array() ) {
		$vars = array();
		$src  = isset( $ambient['vars'] ) ? $ambient['vars'] : array();

		if ( isset( $src['albedo'] ) ) {
			$vars['--amb-albedo'] = $src['albedo'];
		}

		foreach ( self::NUMERIC_VARS as $key => $spec ) {
			if ( ! isset( $src[ $key ] ) ) {
				continue;
			}
			list( $property, , , $unit ) = $spec;
			$vars[ $property ]           = self::format_number( $src[ $key ] ) . $unit;
		}

		/**
		 * Filters the Ambient CSS custom properties generated for a block.
		 *
		 * @param array $vars    Property name => value.
		 * @param array $ambient Sanitized ambient attribute.
		 * @param array $block   Parsed block, when available.
		 */
		return apply_filters( 'wp_ambientcss_block_css_vars', $vars, $ambient, $block );
	}

	/**
	 * Formats a number for CSS output.
	 *
	 * Rounds to four decimals, drops trailing zeros and stays locale
	 * independent, so `0.9000` becomes `0.9` on every server.
	 *
	 * @param float|int $value Value to format.
	 * @return string Formatted number.
	 */
	public static function format_number( $value ) {
		$out = rtrim( rtrim( sprintf( '%.4F', (float) $value ), '0' ), '.' );

		return ( '' === $out || '-0' === $out ) ? '0' : $out;
	}

	/**
	 * Renders custom properties as an inline style declaration string.
	 *
	 * @param array<string, string> $vars Property name => value.
	 * @return string Declarations joined by semicolons, without a trailing one.
	 */
	public static function vars_to_style( array $vars ) {
		$parts = array();

		foreach ( $vars as $property => $value ) {
			$parts[] = $property . ':' . $value;
		}

		return implode( ';', $parts );
	}
}
