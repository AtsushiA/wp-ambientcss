#!/usr/bin/env node
/**
 * Folds the per-source translation JSON files into one file for the built
 * script.
 *
 * `wp i18n make-json` names each file after the md5 of the source path it
 * found in the PO references, which is src/*.js. What actually runs in the
 * browser is the single bundled build/index.js, and wp_set_script_translations
 * looks for the md5 of that path, so the generated files would never be found.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve( dirname( fileURLToPath( import.meta.url ) ), '..' );
const dir = resolve( root, 'languages' );
const domain = 'wp-ambientcss';
const target = 'build/index.js';

const byLocale = new Map();
const consumed = [];

for ( const file of readdirSync( dir ) ) {
	const match = file.match(
		new RegExp( `^${ domain }-([a-zA-Z_]+)-[0-9a-f]{32}\\.json$` )
	);

	if ( ! match ) {
		continue;
	}

	const data = JSON.parse( readFileSync( resolve( dir, file ), 'utf8' ) );
	const locale = match[ 1 ];
	const messages = data?.locale_data?.messages ?? {};

	if ( ! byLocale.has( locale ) ) {
		byLocale.set( locale, { '': messages[ '' ] ?? {} } );
	}

	Object.assign( byLocale.get( locale ), messages );
	consumed.push( file );
}

for ( const file of consumed ) {
	unlinkSync( resolve( dir, file ) );
}

for ( const [ locale, messages ] of byLocale ) {
	const hash = createHash( 'md5' ).update( target ).digest( 'hex' );
	const name = `${ domain }-${ locale }-${ hash }.json`;

	writeFileSync(
		resolve( dir, name ),
		JSON.stringify( {
			'translation-revision-date': new Date().toISOString(),
			generator: 'bin/merge-translation-json.mjs',
			domain: 'messages',
			locale_data: { messages },
			source: target,
		} ) + '\n'
	);

	console.log(
		`${ name }: ${ Object.keys( messages ).length - 1 } strings for ${ target }`
	);
}
