import { test, expect } from '@wordpress/e2e-test-utils-playwright';

/**
 * These cover the two delivery paths that cannot be unit tested together:
 * a static block carries its classes in the saved markup, while a dynamic
 * block only carries the attribute and PHP has to inject the classes at
 * render time. The hostile cases are here rather than in a unit test because
 * what matters is what actually reaches the page.
 */

const STATIC_BLOCK = `<!-- wp:group {"ambient":{"enabled":true,"light":"tl","surface":"convex","edge":"fillet","material":"brushed","elevation":2,"rounded":"lg","vars":{"albedo":"#2b6cb0","keyLight":0.75}}} -->
<div class="wp-block-group ambient amb-light-tl amb-surface-convex amb-fillet amb-mat-brushed amb-elevation-2 amb-rounded-lg" style="--amb-albedo:#2b6cb0;--amb-key-light-intensity:0.75"><!-- wp:paragraph -->
<p>static marker</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->`;

const DYNAMIC_BLOCK = `<!-- wp:latest-posts {"ambient":{"enabled":true,"surface":"flat","elevation":3,"rounded":"md","vars":{"albedo":"#123456"}}} /-->`;

const HOSTILE_COLOUR = `<!-- wp:latest-posts {"ambient":{"enabled":true,"vars":{"albedo":"red;background:url(http://evil.test/PWNED)"}}} /-->`;

const HOSTILE_ARRAY_ENUM = `<!-- wp:latest-posts {"ambient":{"enabled":true,"surface":["flat"],"rounded":["md"],"light":["tl"]}} /-->`;

const EXCLUDED_BLOCK = `<!-- wp:html {"ambient":{"enabled":true,"elevation":3}} -->
<div class="excluded-marker">excluded marker</div>
<!-- /wp:html -->`;

test.describe( 'Front end rendering', () => {
	test.use( { storageState: { cookies: [], origins: [] } } );

	let postUrl: string;

	test.beforeAll( async ( { requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Ambient rendering',
			content: [
				STATIC_BLOCK,
				DYNAMIC_BLOCK,
				HOSTILE_COLOUR,
				HOSTILE_ARRAY_ENUM,
				EXCLUDED_BLOCK,
			].join( '\n\n' ),
			status: 'publish',
		} );

		postUrl = post.link;
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
	} );

	test( 'the stylesheet is enqueued', async ( { page } ) => {
		await page.goto( postUrl );

		await expect(
			page.locator(
				'link[href*="wp-ambientcss"][href*="assets/vendor/ambient.css"]'
			)
		).toHaveCount( 1 );
	} );

	test( 'a static block keeps its classes and is not double-processed', async ( {
		page,
	} ) => {
		await page.goto( postUrl );

		const group = page.locator( 'div.wp-block-group.ambient' );

		await expect( group ).toHaveCount( 1 );
		await expect( group ).toHaveClass( /amb-light-tl/ );
		await expect( group ).toHaveClass( /amb-surface-convex/ );
		await expect( group ).toHaveClass( /amb-mat-brushed/ );
		await expect( group ).toHaveClass( /amb-elevation-2/ );

		// PHP must not add the classes a second time on a static block.
		const className = await group.getAttribute( 'class' );
		expect( className?.match( /\bambient\b/g ) ).toHaveLength( 1 );
		expect( className?.match( /amb-elevation-\d/g ) ).toHaveLength( 1 );

		await expect( group ).toHaveAttribute(
			'style',
			/--amb-albedo:\s*#2b6cb0/
		);
	} );

	test( 'a dynamic block gets its classes injected by PHP', async ( {
		page,
	} ) => {
		await page.goto( postUrl );

		const list = page
			.locator( 'ul.wp-block-latest-posts.ambient.amb-surface' )
			.first();

		await expect( list ).toHaveClass( /amb-elevation-3/ );
		await expect( list ).toHaveClass( /amb-rounded-md/ );
		await expect( list ).toHaveAttribute(
			'style',
			/--amb-albedo:\s*#123456/
		);
	} );

	test( 'a hostile colour never reaches the page', async ( { page } ) => {
		await page.goto( postUrl );

		const html = await page.content();

		expect( html ).not.toContain( 'PWNED' );
		expect( html ).not.toContain( 'evil.test' );
	} );

	test( 'array values in enum attributes do not break the page', async ( {
		page,
	} ) => {
		const response = await page.goto( postUrl );

		expect( response?.status() ).toBe( 200 );

		const html = await page.content();

		expect( html ).not.toMatch( /Fatal error|Warning:|Notice:/ );

		// The block still renders, just without the rejected values.
		await expect(
			page.locator( 'ul.wp-block-latest-posts.ambient' ).nth( 2 )
		).toBeVisible();
	} );

	test( 'an excluded block is left untouched', async ( { page } ) => {
		await page.goto( postUrl );

		const marker = page.locator( 'div.excluded-marker' );

		await expect( marker ).toBeVisible();
		await expect( marker ).not.toHaveClass( /ambient/ );
		await expect( marker ).not.toHaveClass( /amb-elevation/ );
	} );
} );
