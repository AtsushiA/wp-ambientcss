/**
 * Attribute to class name and custom property conversion (SPEC.md section 7).
 *
 * This is the JavaScript half of the conversion logic. The PHP half lives in
 * includes/class-attributes.php and must produce identical output for the
 * same input.
 */

import { applyFilters } from '@wordpress/hooks';

import {
	EDGE_OPTIONS,
	FOLLOW_OPTIONS,
	LIGHT_OPTIONS,
	MATERIAL_OPTIONS,
	NUMERIC_VARS,
} from './attributes';

const SURFACE_CLASSES = {
	flat: 'amb-surface',
	concave: 'amb-surface-concave',
	'concave-h': 'amb-surface-concave-h',
	convex: 'amb-surface-convex',
};

const ROUNDED_CLASSES = {
	base: 'amb-rounded',
	md: 'amb-rounded-md',
	lg: 'amb-rounded-lg',
	xl: 'amb-rounded-xl',
	full: 'amb-rounded-full',
};

const ELEVATION_VALUES = [ 0, 1, 2, 3 ];
const THICKNESS_VALUES = [ 0, 1, 2 ];

// Mirrors what PHP's is_numeric() accepts: an optional sign, decimal digits
// and an optional exponent, with surrounding whitespace tolerated. Notably it
// does NOT accept hex, which Number() would happily parse.
const NUMERIC_STRING = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * Coerces a value the way the PHP side does, or returns undefined.
 *
 * Block attributes can arrive as numeric strings from hand-edited content or
 * another tool. PHP accepts those through is_numeric(), so JavaScript has to
 * as well, or the same block would render differently depending on whether it
 * is static or dynamic.
 *
 * @param {*} value Value to coerce.
 * @return {number|undefined} The number, or undefined when not numeric.
 */
function toNumber( value ) {
	if ( typeof value === 'number' ) {
		return Number.isFinite( value ) ? value : undefined;
	}

	if ( typeof value !== 'string' || ! NUMERIC_STRING.test( value.trim() ) ) {
		return undefined;
	}

	const parsed = Number( value.trim() );

	return Number.isFinite( parsed ) ? parsed : undefined;
}

/**
 * Whether a value is a string.
 *
 * @param {*} value Value to check.
 * @return {boolean} True for strings.
 */
function isString( value ) {
	return typeof value === 'string';
}

/**
 * Formats a number for CSS output.
 *
 * Rounds to four decimals and drops trailing zeros, matching
 * Attributes::format_number() on the PHP side.
 *
 * @param {number} value Value to format.
 * @return {string} Formatted number.
 */
export function formatNumber( value ) {
	const out = Number( value )
		.toFixed( 4 )
		.replace( /0+$/, '' )
		.replace( /\.$/, '' );

	return out === '' || out === '-0' ? '0' : out;
}

/**
 * Builds the Ambient class names for an attribute object.
 *
 * Values that are not in the allow lists are ignored rather than passed
 * through, so a hand-edited block cannot inject arbitrary class names.
 *
 * @param {Object} ambient   The `ambient` attribute.
 * @param {string} blockName Block name, passed to the filter.
 * @return {string[]} Class names, in the order given by SPEC.md 7.1.
 */
export function getAmbientClasses( ambient, blockName = '' ) {
	const classes = [];

	if ( ! ambient || typeof ambient !== 'object' ) {
		return classes;
	}

	if ( ambient.enabled ) {
		classes.push( 'ambient' );
	}

	// An inline light vector always beats the preset class, so emitting both
	// would show a direction the rendering ignores. See SPEC.md 7.3.
	//
	// A follow mode takes precedence over both: page mode needs the block to
	// inherit the document's vector, and block mode has the script write an
	// inline one.
	const hasLightVector = drivesOwnLight( ambient );

	// The isString guards keep a hand-edited attribute from matching through
	// JavaScript's key coercion, where [ 'flat' ] becomes the key 'flat'. PHP
	// rejects those outright, and the two sides have to agree.
	if (
		! hasLightVector &&
		isString( ambient.light ) &&
		LIGHT_OPTIONS.includes( ambient.light )
	) {
		classes.push( `amb-light-${ ambient.light }` );
	}
	if ( isString( ambient.surface ) && SURFACE_CLASSES[ ambient.surface ] ) {
		classes.push( SURFACE_CLASSES[ ambient.surface ] );
	}
	if ( isString( ambient.edge ) && EDGE_OPTIONS.includes( ambient.edge ) ) {
		classes.push( `amb-${ ambient.edge }` );
	}
	if (
		isString( ambient.material ) &&
		MATERIAL_OPTIONS.includes( ambient.material )
	) {
		classes.push( `amb-mat-${ ambient.material }` );
	}
	const elevation = toNumber( ambient.elevation );
	const thickness = toNumber( ambient.thickness );

	if (
		elevation !== undefined &&
		ELEVATION_VALUES.includes( Math.trunc( elevation ) )
	) {
		classes.push( `amb-elevation-${ Math.trunc( elevation ) }` );
	}
	if (
		thickness !== undefined &&
		THICKNESS_VALUES.includes( Math.trunc( thickness ) )
	) {
		classes.push( `amb-thickness-${ Math.trunc( thickness ) }` );
	}
	if ( isString( ambient.rounded ) && ROUNDED_CLASSES[ ambient.rounded ] ) {
		classes.push( ROUNDED_CLASSES[ ambient.rounded ] );
	}
	if ( ambient.glow ) {
		classes.push( 'amb-glow' );
	}
	if ( ambient.bounce ) {
		classes.push( 'amb-bounce' );
	}

	return applyFilters(
		'wpAmbientcss.classNames',
		classes,
		ambient,
		blockName
	);
}

/** Longest accepted `--amb-albedo` value, in characters. */
const MAX_COLOR_LENGTH = 120;

const COLOR_FUNCTIONS =
	/^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(\s*[a-zA-Z0-9\s.,%/+-]*\s*\)$/;

/**
 * Sanitizes a CSS color used for `--amb-albedo`.
 *
 * Block attributes can be hand-edited, and whatever comes back is written
 * straight into the saved markup, so a value that could close the
 * declaration and start another one has to be rejected here rather than
 * relying on the editor UI to produce something sane.
 *
 * Mirrors Attributes::sanitize_color() in includes/class-attributes.php.
 *
 * @param {*} value Raw color.
 * @return {string} Safe color, or an empty string when rejected.
 */
export function sanitizeColor( value ) {
	if ( typeof value !== 'string' ) {
		return '';
	}

	const color = value.trim();

	// The longest thing anyone reasonably writes here is a color-mix() with
	// two stops. Without a cap, a hand-edited attribute could put megabytes
	// of "keyword" into the style attribute of every block.
	if ( color === '' || color.length > MAX_COLOR_LENGTH ) {
		return '';
	}

	if (
		/^#(?:[A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test( color )
	) {
		return color;
	}

	// Nothing that could terminate the declaration, open a comment, or pull
	// in an external resource.
	if ( /[;{}\\<>"']/.test( color ) || color.includes( '/*' ) ) {
		return '';
	}

	if ( /^[a-zA-Z]+$/.test( color ) ) {
		return color;
	}

	if ( COLOR_FUNCTIONS.test( color ) ) {
		return color;
	}

	return '';
}

/**
 * Whether the light vector is decided somewhere other than the preset.
 *
 * @param {Object} ambient The `ambient` attribute.
 * @return {boolean} True when a preset would be ignored.
 */
function drivesOwnLight( ambient ) {
	if ( isFollowing( ambient ) ) {
		return true;
	}

	const vars = ambient.vars || {};

	return vars.lightX !== undefined || vars.lightY !== undefined;
}

/**
 * Whether the block asks the light to follow the pointer.
 *
 * @param {Object} ambient The `ambient` attribute.
 * @return {boolean} True for a valid follow mode.
 */
export function isFollowing( ambient ) {
	return (
		!! ambient &&
		isString( ambient.follow ) &&
		FOLLOW_OPTIONS.includes( ambient.follow )
	);
}

/**
 * Builds the data attributes for an attribute object.
 *
 * The prefix is the plugin's own rather than `amb-`, so a future upstream
 * class or attribute cannot collide with it.
 *
 * @param {Object} ambient The `ambient` attribute.
 * @return {Object} Attribute name => value.
 */
export function getAmbientDataAttributes( ambient ) {
	if ( ! isFollowing( ambient ) ) {
		return {};
	}

	return { 'data-wp-ambient-follow': ambient.follow };
}

/**
 * Builds the inline custom properties for an attribute object.
 *
 * @param {Object} ambient The `ambient` attribute.
 * @return {Object} A style object suitable for React, empty when unset.
 */
export function getAmbientStyle( ambient ) {
	const style = {};

	if ( ! ambient || typeof ambient !== 'object' ) {
		return style;
	}

	const vars = ambient.vars || {};

	const albedo = sanitizeColor( vars.albedo );

	if ( albedo !== '' ) {
		style[ '--amb-albedo' ] = albedo;
	}

	// A follow mode owns the light vector at runtime, so a stored one would
	// either be overwritten on the first pointer move (block mode) or block
	// the inherited value outright (page mode).
	const following = isFollowing( ambient );

	Object.keys( NUMERIC_VARS ).forEach( ( key ) => {
		const value = toNumber( vars[ key ] );

		if ( value === undefined ) {
			return;
		}

		if ( following && ( key === 'lightX' || key === 'lightY' ) ) {
			return;
		}

		const { property, min, max, unit } = NUMERIC_VARS[ key ];
		const clamped = Math.max( min, Math.min( max, value ) );

		style[ property ] = formatNumber( clamped ) + unit;
	} );

	return style;
}

/**
 * Whether the attribute object produces any output at all.
 *
 * @param {Object} ambient The `ambient` attribute.
 * @return {boolean} True when something would be rendered.
 */
export function hasAmbientOutput( ambient ) {
	return (
		getAmbientClasses( ambient ).length > 0 ||
		Object.keys( getAmbientStyle( ambient ) ).length > 0 ||
		Object.keys( getAmbientDataAttributes( ambient ) ).length > 0
	);
}
