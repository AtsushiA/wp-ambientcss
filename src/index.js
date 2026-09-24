/**
 * Registers the Ambient block extension (SPEC.md F-02, F-03, F-04).
 */

import { addFilter, applyFilters } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { hasBlockSupport } from '@wordpress/blocks';

import { AMBIENT_ATTRIBUTE, DEFAULT_EXCLUDED_BLOCKS } from './attributes';
import { getAmbientClasses, getAmbientStyle } from './class-names';
import AmbientInspector from './inspector';

import './editor.scss';

/**
 * Returns the block names that do not get the Ambient controls.
 *
 * PHP owns the list and hands it over through an inline script, so a site
 * that filters it server side does not have to filter it twice.
 *
 * @return {string[]} Excluded block names.
 */
function getExcludedBlocks() {
	const settings = window.wpAmbientcssSettings;

	if ( settings && Array.isArray( settings.excludedBlocks ) ) {
		return settings.excludedBlocks;
	}

	return DEFAULT_EXCLUDED_BLOCKS;
}

/**
 * Whether a block can carry Ambient settings.
 *
 * @param {string} name Block name.
 * @return {boolean} True when the block is supported.
 */
function isSupported( name ) {
	let supported =
		typeof name === 'string' &&
		name !== '' &&
		! getExcludedBlocks().includes( name );

	// A block that opts out of custom class names has nowhere to put ours.
	if ( supported && ! hasBlockSupport( name, 'customClassName', true ) ) {
		supported = false;
	}

	return applyFilters( 'wpAmbientcss.blockSupported', supported, name );
}

/**
 * Adds the `ambient` attribute to every supported block type.
 *
 * @param {Object} settings Block settings.
 * @param {string} name     Block name.
 * @return {Object} Block settings.
 */
function addAttribute( settings, name ) {
	if ( ! isSupported( name ) ) {
		return settings;
	}

	return {
		...settings,
		attributes: {
			...settings.attributes,
			...AMBIENT_ATTRIBUTE,
		},
	};
}

/**
 * Adds the Ambient panel to the block inspector.
 */
const withAmbientControls = createHigherOrderComponent(
	( BlockEdit ) => ( props ) => {
		if ( ! props.isSelected || ! isSupported( props.name ) ) {
			return <BlockEdit { ...props } />;
		}

		return (
			<>
				<BlockEdit { ...props } />
				<AmbientInspector
					ambient={ props.attributes.ambient }
					setAmbient={ ( ambient ) =>
						props.setAttributes( { ambient } )
					}
				/>
			</>
		);
	},
	'withAmbientControls'
);

/**
 * Applies the Ambient classes and custom properties in the editor canvas, so
 * the preview matches what the front end will render.
 */
const withAmbientPreview = createHigherOrderComponent(
	( BlockListBlock ) => ( props ) => {
		const ambient = props.attributes && props.attributes.ambient;

		if ( ! ambient || ! isSupported( props.name ) ) {
			return <BlockListBlock { ...props } />;
		}

		const classes = getAmbientClasses( ambient, props.name );
		const style = getAmbientStyle( ambient );

		if ( ! classes.length && ! Object.keys( style ).length ) {
			return <BlockListBlock { ...props } />;
		}

		return (
			<BlockListBlock
				{ ...props }
				className={ [ props.className, ...classes ]
					.filter( Boolean )
					.join( ' ' ) }
				wrapperProps={ {
					...props.wrapperProps,
					style: { ...( props.wrapperProps || {} ).style, ...style },
				} }
			/>
		);
	},
	'withAmbientPreview'
);

/**
 * Writes the classes and custom properties into the saved markup of static
 * blocks. Dynamic blocks are handled in PHP instead.
 *
 * @param {Object} extraProps Props added to the save element.
 * @param {Object} blockType  Block type.
 * @param {Object} attributes Block attributes.
 * @return {Object} Props added to the save element.
 */
function addSaveProps( extraProps, blockType, attributes ) {
	const ambient = attributes && attributes.ambient;
	const name = blockType && blockType.name;

	if ( ! ambient || ! isSupported( name ) ) {
		return extraProps;
	}

	const classes = getAmbientClasses( ambient, name );
	const style = getAmbientStyle( ambient );

	if ( classes.length ) {
		extraProps.className = [ extraProps.className, ...classes ]
			.filter( Boolean )
			.join( ' ' );
	}

	if ( Object.keys( style ).length ) {
		extraProps.style = { ...extraProps.style, ...style };
	}

	return extraProps;
}

addFilter(
	'blocks.registerBlockType',
	'wp-ambientcss/attribute',
	addAttribute
);
addFilter( 'editor.BlockEdit', 'wp-ambientcss/controls', withAmbientControls );
addFilter(
	'editor.BlockListBlock',
	'wp-ambientcss/preview',
	withAmbientPreview
);
addFilter(
	'blocks.getSaveContent.extraProps',
	'wp-ambientcss/save',
	addSaveProps
);
