/**
 * The `ambient` block attribute schema (SPEC.md section 6).
 *
 * There is deliberately no default: blocks that do not use Ambient must keep
 * their markup byte-for-byte unchanged.
 */
export const AMBIENT_ATTRIBUTE = {
	ambient: {
		type: 'object',
	},
};

export const LIGHT_OPTIONS = [
	'tl',
	'tr',
	'bl',
	'br',
	'top',
	'bottom',
	'left',
	'right',
];

export const SURFACE_OPTIONS = [ 'flat', 'concave', 'concave-h', 'convex' ];

export const EDGE_OPTIONS = [
	'chamfer',
	'chamfer-2',
	'fillet',
	'fillet-2',
	'groove',
];

export const MATERIAL_OPTIONS = [
	'shiny',
	'glass',
	'brushed',
	'brushed-round',
	'blasted',
];

export const ROUNDED_OPTIONS = [ 'base', 'md', 'lg', 'xl', 'full' ];

/**
 * Numeric `vars` keys with their CSS property, range, step and unit.
 *
 * Mirrors Attributes::NUMERIC_VARS in includes/class-attributes.php.
 */
export const NUMERIC_VARS = {
	shade: { property: '--amb-shade', min: 0, max: 2, step: 0.05, unit: '' },
	keyLight: {
		property: '--amb-key-light-intensity',
		min: 0,
		max: 1,
		step: 0.05,
		unit: '',
	},
	fillLight: {
		property: '--amb-fill-light-intensity',
		min: 0,
		max: 1,
		step: 0.05,
		unit: '',
	},
	lightHue: {
		property: '--amb-light-hue',
		min: 0,
		max: 360,
		step: 1,
		unit: '',
	},
	lightSaturation: {
		property: '--amb-light-saturation',
		min: 0,
		max: 100,
		step: 1,
		unit: '%',
	},
	lightX: {
		property: '--amb-light-x',
		min: -1,
		max: 1,
		step: 0.05,
		unit: '',
	},
	lightY: {
		property: '--amb-light-y',
		min: -1,
		max: 1,
		step: 0.05,
		unit: '',
	},
	grain: {
		property: '--amb-grain-amount',
		min: 0,
		max: 2,
		step: 0.05,
		unit: '',
	},
	curveScale: {
		property: '--amb-curve-scale',
		min: 0,
		max: 2,
		step: 0.05,
		unit: '',
	},
};

/**
 * Blocks that never get the Ambient controls.
 *
 * The PHP side owns the authoritative list and passes it through
 * window.wpAmbientcssSettings; this is the fallback.
 */
export const DEFAULT_EXCLUDED_BLOCKS = [
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
];
