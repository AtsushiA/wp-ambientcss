/**
 * Adds the front-end follow script as a second entry point.
 *
 * The default @wordpress/scripts config builds src/index.js only, and that
 * bundle depends on the editor packages. The follow script ships to visitors,
 * so it stays a separate, dependency-free bundle.
 */
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

module.exports = {
	...defaultConfig,
	entry: {
		index: './src/index.js',
		follow: './src/follow.js',
	},
};
