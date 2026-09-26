/**
 * The Ambient panel in the block inspector (SPEC.md F-03).
 */

import { __ } from '@wordpress/i18n';
import {
	Button,
	ColorPalette,
	PanelBody,
	RangeControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { InspectorControls } from '@wordpress/block-editor';

import { NUMERIC_VARS } from './attributes';

/**
 * Returns the label for each light direction.
 *
 * @return {Object} Direction key to label.
 */
const lightLabels = () => ( {
	tl: __( 'Top left', 'wp-ambientcss' ),
	top: __( 'Top', 'wp-ambientcss' ),
	tr: __( 'Top right', 'wp-ambientcss' ),
	left: __( 'Left', 'wp-ambientcss' ),
	right: __( 'Right', 'wp-ambientcss' ),
	bl: __( 'Bottom left', 'wp-ambientcss' ),
	bottom: __( 'Bottom', 'wp-ambientcss' ),
	br: __( 'Bottom right', 'wp-ambientcss' ),
} );

// The grid keeps the buttons in the physical arrangement of the directions,
// with the centre cell used to clear the choice.
const LIGHT_GRID = [
	'tl',
	'top',
	'tr',
	'left',
	null,
	'right',
	'bl',
	'bottom',
	'br',
];

const surfaceOptions = () => [
	{ label: __( 'None', 'wp-ambientcss' ), value: '' },
	{ label: __( 'Flat', 'wp-ambientcss' ), value: 'flat' },
	{ label: __( 'Concave (vertical)', 'wp-ambientcss' ), value: 'concave' },
	{
		label: __( 'Concave (horizontal)', 'wp-ambientcss' ),
		value: 'concave-h',
	},
	{ label: __( 'Convex', 'wp-ambientcss' ), value: 'convex' },
];

const materialOptions = () => [
	{ label: __( 'Matte', 'wp-ambientcss' ), value: '' },
	{ label: __( 'Shiny', 'wp-ambientcss' ), value: 'shiny' },
	{ label: __( 'Glass', 'wp-ambientcss' ), value: 'glass' },
	{ label: __( 'Brushed', 'wp-ambientcss' ), value: 'brushed' },
	{
		label: __( 'Brushed (circular)', 'wp-ambientcss' ),
		value: 'brushed-round',
	},
	{ label: __( 'Blasted', 'wp-ambientcss' ), value: 'blasted' },
];

const edgeOptions = () => [
	{ label: __( 'None', 'wp-ambientcss' ), value: '' },
	{ label: __( 'Chamfer', 'wp-ambientcss' ), value: 'chamfer' },
	{ label: __( 'Chamfer 2', 'wp-ambientcss' ), value: 'chamfer-2' },
	{ label: __( 'Fillet', 'wp-ambientcss' ), value: 'fillet' },
	{ label: __( 'Fillet 2', 'wp-ambientcss' ), value: 'fillet-2' },
	{ label: __( 'Groove', 'wp-ambientcss' ), value: 'groove' },
];

const followOptions = () => [
	{ label: __( 'Off', 'wp-ambientcss' ), value: '' },
	{ label: __( 'Whole page', 'wp-ambientcss' ), value: 'page' },
	{ label: __( 'This block', 'wp-ambientcss' ), value: 'block' },
];

const roundedOptions = () => [
	{ label: __( 'None', 'wp-ambientcss' ), value: '' },
	{ label: __( '4px', 'wp-ambientcss' ), value: 'base' },
	{ label: __( '8px', 'wp-ambientcss' ), value: 'md' },
	{ label: __( '12px', 'wp-ambientcss' ), value: 'lg' },
	{ label: __( '16px', 'wp-ambientcss' ), value: 'xl' },
	{ label: __( 'Pill', 'wp-ambientcss' ), value: 'full' },
];

const advancedLabels = () => ( {
	shade: __( 'Reflectance', 'wp-ambientcss' ),
	keyLight: __( 'Key light', 'wp-ambientcss' ),
	fillLight: __( 'Fill light', 'wp-ambientcss' ),
	lightHue: __( 'Light hue', 'wp-ambientcss' ),
	lightSaturation: __( 'Light saturation', 'wp-ambientcss' ),
	lightX: __( 'Light X', 'wp-ambientcss' ),
	lightY: __( 'Light Y', 'wp-ambientcss' ),
	grain: __( 'Grain amount', 'wp-ambientcss' ),
	curveScale: __( 'Curve strength', 'wp-ambientcss' ),
} );

/**
 * The Ambient inspector panel.
 *
 * @param {Object}   props            Component props.
 * @param {Object}   props.ambient    Current attribute value.
 * @param {Function} props.setAmbient Updates the attribute.
 * @return {Element} The panel.
 */
export default function AmbientInspector( { ambient, setAmbient } ) {
	const value = ambient || {};
	const vars = value.vars || {};
	const enabled = !! value.enabled;

	/**
	 * Updates one top level key, removing it when the value is empty.
	 *
	 * Removing rather than storing an empty value is what keeps unused blocks
	 * out of the markup entirely.
	 *
	 * @param {string} key      Attribute key.
	 * @param {*}      newValue New value.
	 */
	const update = ( key, newValue ) => {
		const next = { ...value };

		if ( newValue === undefined || newValue === '' || newValue === false ) {
			delete next[ key ];
		} else {
			next[ key ] = newValue;
		}

		setAmbient( Object.keys( next ).length ? next : undefined );
	};

	/**
	 * Updates one key inside `vars`.
	 *
	 * @param {string} key      Vars key.
	 * @param {*}      newValue New value.
	 */
	const updateVar = ( key, newValue ) => {
		const nextVars = { ...vars };

		if ( newValue === undefined || newValue === '' ) {
			delete nextVars[ key ];
		} else {
			nextVars[ key ] = newValue;
		}

		const next = { ...value };

		if ( Object.keys( nextVars ).length ) {
			next.vars = nextVars;
		} else {
			delete next.vars;
		}

		setAmbient( Object.keys( next ).length ? next : undefined );
	};

	const resetAll = () => setAmbient( undefined );

	// An explicit light vector overrides the preset, so offering both would
	// show a direction the browser ignores. See SPEC.md 7.3. A follow mode
	// takes the light over entirely, so it locks both out.
	const isFollowing = value.follow === 'page' || value.follow === 'block';
	const hasLightVector =
		isFollowing || vars.lightX !== undefined || vars.lightY !== undefined;

	const labels = lightLabels();
	const hasSettings = Object.keys( value ).length > 0;

	return (
		<InspectorControls group="styles">
			<PanelBody
				title={ __( 'Ambient', 'wp-ambientcss' ) }
				initialOpen={ false }
			>
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Enable Ambient', 'wp-ambientcss' ) }
					help={ __(
						'Adds the base class that draws the shadows and edges. The other controls need it.',
						'wp-ambientcss'
					) }
					checked={ enabled }
					onChange={ ( checked ) => update( 'enabled', checked ) }
				/>

				<fieldset className="wp-ambientcss-light">
					<legend>
						{ __( 'Light direction', 'wp-ambientcss' ) }
					</legend>
					<div className="wp-ambientcss-light__grid">
						{ LIGHT_GRID.map( ( direction ) => {
							if ( direction === null ) {
								return (
									<button
										key="clear"
										type="button"
										className="wp-ambientcss-light__clear"
										disabled={ ! enabled || hasLightVector }
										aria-label={ __(
											'Inherit light direction',
											'wp-ambientcss'
										) }
										onClick={ () =>
											update( 'light', undefined )
										}
									>
										{ '\u00d7' }
									</button>
								);
							}

							return (
								<button
									key={ direction }
									type="button"
									className={
										'wp-ambientcss-light__button' +
										( value.light === direction
											? ' is-selected'
											: '' )
									}
									disabled={ ! enabled || hasLightVector }
									aria-pressed={ value.light === direction }
									aria-label={ labels[ direction ] }
									title={ labels[ direction ] }
									onClick={ () =>
										update( 'light', direction )
									}
								/>
							);
						} ) }
					</div>
					{ hasLightVector && (
						<p className="wp-ambientcss-light__note">
							{ isFollowing
								? __(
										'The light follows the pointer, which overrides these presets.',
										'wp-ambientcss'
								  )
								: __(
										'A light X or Y value is set under Advanced, which overrides these presets.',
										'wp-ambientcss'
								  ) }
						</p>
					) }
				</fieldset>

				<SelectControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Follow the pointer', 'wp-ambientcss' ) }
					help={ __(
						'Whole page shares one light source across every following block. This block gives it its own, lit from where the pointer is over it. The light stays where it was when the pointer leaves.',
						'wp-ambientcss'
					) }
					value={ value.follow || '' }
					options={ followOptions() }
					disabled={ ! enabled }
					onChange={ ( next ) => update( 'follow', next ) }
				/>

				<SelectControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Surface', 'wp-ambientcss' ) }
					value={ value.surface || '' }
					options={ surfaceOptions() }
					disabled={ ! enabled }
					onChange={ ( next ) => update( 'surface', next ) }
				/>

				<SelectControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Material', 'wp-ambientcss' ) }
					value={ value.material || '' }
					options={ materialOptions() }
					disabled={ ! enabled }
					onChange={ ( next ) => update( 'material', next ) }
				/>

				<SelectControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Edge', 'wp-ambientcss' ) }
					value={ value.edge || '' }
					options={ edgeOptions() }
					disabled={ ! enabled }
					onChange={ ( next ) => update( 'edge', next ) }
				/>

				<RangeControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Elevation', 'wp-ambientcss' ) }
					value={ value.elevation }
					min={ 0 }
					max={ 3 }
					step={ 1 }
					allowReset
					disabled={ ! enabled }
					onChange={ ( next ) =>
						update(
							'elevation',
							next === undefined ? undefined : Number( next )
						)
					}
				/>

				<RangeControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Thickness', 'wp-ambientcss' ) }
					help={ __(
						'Overrides the thickness an edge treatment sets on its own.',
						'wp-ambientcss'
					) }
					value={ value.thickness }
					min={ 0 }
					max={ 2 }
					step={ 1 }
					allowReset
					disabled={ ! enabled }
					onChange={ ( next ) =>
						update(
							'thickness',
							next === undefined ? undefined : Number( next )
						)
					}
				/>

				<SelectControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Corner radius', 'wp-ambientcss' ) }
					value={ value.rounded || '' }
					options={ roundedOptions() }
					onChange={ ( next ) => update( 'rounded', next ) }
				/>

				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Glow', 'wp-ambientcss' ) }
					checked={ !! value.glow }
					disabled={ ! enabled }
					onChange={ ( checked ) => update( 'glow', checked ) }
				/>

				{ hasSettings && (
					<Button
						variant="tertiary"
						isDestructive
						onClick={ resetAll }
						className="wp-ambientcss-reset"
					>
						{ __( 'Clear Ambient settings', 'wp-ambientcss' ) }
					</Button>
				) }
			</PanelBody>

			<PanelBody
				title={ __( 'Ambient: advanced', 'wp-ambientcss' ) }
				initialOpen={ false }
			>
				<ColorPalette
					value={ vars.albedo }
					clearable
					onChange={ ( color ) => updateVar( 'albedo', color ) }
				/>
				<p className="wp-ambientcss-help">
					{ __(
						'Surface color (albedo). Ambient lights this color rather than using it directly.',
						'wp-ambientcss'
					) }
				</p>

				{ Object.keys( NUMERIC_VARS ).map( ( key ) => {
					const spec = NUMERIC_VARS[ key ];
					const isLightVector = key === 'lightX' || key === 'lightY';

					return (
						<RangeControl
							key={ key }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label={ advancedLabels()[ key ] }
							help={
								isLightVector && isFollowing
									? __(
											'Controlled by the pointer while following is on.',
											'wp-ambientcss'
									  )
									: undefined
							}
							value={ vars[ key ] }
							min={ spec.min }
							max={ spec.max }
							step={ spec.step }
							allowReset
							disabled={ isLightVector && isFollowing }
							onChange={ ( next ) =>
								updateVar(
									key,
									next === undefined
										? undefined
										: Number( next )
								)
							}
						/>
					);
				} ) }

				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Bounce animation', 'wp-ambientcss' ) }
					help={ __(
						'Loops the elevation. Respect visitors who ask for reduced motion before using this.',
						'wp-ambientcss'
					) }
					checked={ !! value.bounce }
					disabled={ ! enabled }
					onChange={ ( checked ) => update( 'bounce', checked ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
