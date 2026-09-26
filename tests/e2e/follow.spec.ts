import { test, expect } from '@wordpress/e2e-test-utils-playwright';

/**
 * Pointer-following has to be checked in a real browser: the whole design
 * rests on inline styles beating inherited ones, and on the two modes not
 * interfering when they share a page.
 */

const PAGE_BLOCK = `<!-- wp:group {"ambient":{"enabled":true,"follow":"page","surface":"flat","elevation":2}} -->
<div class="wp-block-group ambient amb-surface amb-elevation-2" data-wp-ambient-follow="page" id="follow-page"><!-- wp:paragraph -->
<p>page mode</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->`;

const BLOCK_BLOCK = `<!-- wp:group {"ambient":{"enabled":true,"follow":"block","surface":"flat","elevation":2}} -->
<div class="wp-block-group ambient amb-surface amb-elevation-2" data-wp-ambient-follow="block" id="follow-block"><!-- wp:paragraph -->
<p>block mode</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->`;

const FIXED_BLOCK = `<!-- wp:group {"ambient":{"enabled":true,"light":"tl","surface":"flat","elevation":2}} -->
<div class="wp-block-group ambient amb-light-tl amb-surface amb-elevation-2" id="fixed"><!-- wp:paragraph -->
<p>fixed</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->`;

test.describe( 'Pointer following', () => {
	test.use( { storageState: { cookies: [], origins: [] } } );

	let postUrl: string;
	let plainUrl: string;

	test.beforeAll( async ( { requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Ambient follow',
			content: [ PAGE_BLOCK, BLOCK_BLOCK, FIXED_BLOCK ].join( '\n\n' ),
			status: 'publish',
		} );

		postUrl = post.link;

		const plain = await requestUtils.createPost( {
			title: 'No ambient here',
			content: '<!-- wp:paragraph --><p>plain</p><!-- /wp:paragraph -->',
			status: 'publish',
		} );

		plainUrl = plain.link;
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
	} );

	const lightVector = ( selector: string ) =>
		`( () => {
			const el = document.querySelector( '${ selector }' );
			const style = getComputedStyle( el );
			return [
				style.getPropertyValue( '--amb-light-x' ).trim(),
				style.getPropertyValue( '--amb-light-y' ).trim(),
			];
		} )()`;

	test( 'the script is only loaded when a block asks for it', async ( {
		page,
	} ) => {
		await page.goto( postUrl );
		await expect(
			page.locator( 'script[src*="build/follow.js"]' )
		).toHaveCount( 1 );

		// A post with no following block must not pay for the script. The
		// blog index is not a fair check: it renders the post above, so the
		// script belongs there too.
		await page.goto( plainUrl );
		await expect(
			page.locator( 'script[src*="build/follow.js"]' )
		).toHaveCount( 0 );
	} );

	test( 'page mode drives the document light', async ( { page } ) => {
		await page.goto( postUrl );

		await page.mouse.move( 50, 50 );
		await page.waitForTimeout( 100 );
		const topLeft = await page.evaluate(
			`( () => {
				const s = document.documentElement.style;
				return [ s.getPropertyValue( '--amb-light-x' ), s.getPropertyValue( '--amb-light-y' ) ];
			} )()`
		);

		const viewport = page.viewportSize()!;
		await page.mouse.move( viewport.width - 50, viewport.height - 50 );
		await page.waitForTimeout( 100 );
		const bottomRight = await page.evaluate(
			`( () => {
				const s = document.documentElement.style;
				return [ s.getPropertyValue( '--amb-light-x' ), s.getPropertyValue( '--amb-light-y' ) ];
			} )()`
		);

		expect( Number( topLeft[ 0 ] ) ).toBeLessThan( 0 );
		expect( Number( topLeft[ 1 ] ) ).toBeLessThan( 0 );
		expect( Number( bottomRight[ 0 ] ) ).toBeGreaterThan( 0 );
		expect( Number( bottomRight[ 1 ] ) ).toBeGreaterThan( 0 );
	} );

	test( 'block mode writes its own vector and page mode does not', async ( {
		page,
	} ) => {
		await page.goto( postUrl );

		const target = page.locator( '#follow-block' );
		const box = ( await target.boundingBox() )!;

		// Hover the right half of the block only.
		await page.mouse.move( box.x + box.width * 0.9, box.y + box.height / 2 );
		await page.waitForTimeout( 100 );

		const inlineX = await target.evaluate( ( el: HTMLElement ) =>
			el.style.getPropertyValue( '--amb-light-x' )
		);
		expect( Number( inlineX ) ).toBeGreaterThan( 0 );

		// The page-mode block must not have gained an inline vector.
		const pageInline = await page
			.locator( '#follow-page' )
			.evaluate( ( el: HTMLElement ) =>
				el.style.getPropertyValue( '--amb-light-x' )
			);
		expect( pageInline ).toBe( '' );
	} );

	test( 'the light stays put after the pointer leaves', async ( { page } ) => {
		await page.goto( postUrl );

		const target = page.locator( '#follow-block' );
		const box = ( await target.boundingBox() )!;

		await page.mouse.move( box.x + box.width * 0.9, box.y + box.height / 2 );
		await page.waitForTimeout( 100 );
		const whileOver = await target.evaluate( ( el: HTMLElement ) => [
			el.style.getPropertyValue( '--amb-light-x' ),
			el.style.getPropertyValue( '--amb-light-y' ),
		] );

		// Move far away, well outside the block.
		await page.mouse.move( 5, 5 );
		await page.waitForTimeout( 150 );
		const afterLeaving = await target.evaluate( ( el: HTMLElement ) => [
			el.style.getPropertyValue( '--amb-light-x' ),
			el.style.getPropertyValue( '--amb-light-y' ),
		] );

		expect( afterLeaving ).toEqual( whileOver );
	} );

	test( 'a block with a fixed direction ignores the pointer', async ( {
		page,
	} ) => {
		await page.goto( postUrl );

		const viewport = page.viewportSize()!;
		await page.mouse.move( viewport.width - 20, viewport.height - 20 );
		await page.waitForTimeout( 100 );

		// amb-light-tl sets the vector on the element, which beats the
		// inherited document value the page-mode driver writes.
		const vector = await page.evaluate( lightVector( '#fixed' ) );
		expect( vector ).toEqual( [ '-1', '-1' ] );
	} );
} );
