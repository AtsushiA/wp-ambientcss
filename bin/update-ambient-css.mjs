#!/usr/bin/env node
/**
 * Sync the bundled Ambient CSS from node_modules into assets/vendor/.
 *
 * The bundled file is an unmodified copy of @ambientcss/css dist/ambient.css
 * with a license header prepended. Run `npm run update:ambient` after bumping
 * the @ambientcss/css devDependency, then re-verify the mapping tables in
 * SPEC.md section 4 against the new file.
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire( import.meta.url );
const root = resolve( dirname( fileURLToPath( import.meta.url ) ), '..' );

const pkgPath = require.resolve( '@ambientcss/css/package.json' );
const pkgDir = dirname( pkgPath );
const pkg = JSON.parse( readFileSync( pkgPath, 'utf8' ) );

const css = readFileSync( resolve( pkgDir, 'dist/ambient.css' ), 'utf8' );
const license = readFileSync( resolve( pkgDir, 'LICENSE' ), 'utf8' );

const header = `/*!
 * Ambient CSS v${ pkg.version } (@ambientcss/css)
 * https://github.com/kikkupico/ambientcss
 * Copyright (c) 2026 Ramakrishnan Veeraragavan (kikkupico)
 * Released under the MIT License.
 * Full license text: assets/vendor/LICENSE-ambientcss.txt
 *
 * This file is an unmodified copy of the upstream dist/ambient.css,
 * except for this header comment.
 */
`;

writeFileSync( resolve( root, 'assets/vendor/ambient.css' ), header + css );
writeFileSync( resolve( root, 'assets/vendor/LICENSE-ambientcss.txt' ), license );

console.log( `Updated assets/vendor/ambient.css from @ambientcss/css@${ pkg.version }` );
