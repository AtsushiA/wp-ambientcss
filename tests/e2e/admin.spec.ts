import { test, expect } from '@wordpress/e2e-test-utils-playwright';

import { dismissWelcomeGuide } from './helpers';

test.describe( 'Admin surface', () => {
	test( 'the plugin is active', async ( { admin, page } ) => {
		await admin.visitAdminPage( 'plugins.php' );

		// data-slug is derived from the plugin's display name, so it is
		// "wp-ambient-css" here. data-plugin is the file path and does not
		// drift if the name changes.
		const row = page.locator(
			'tr[data-plugin="wp-ambientcss/wp-ambientcss.php"]'
		);

		await expect( row ).toHaveClass( /active/ );
	} );

	test( 'the settings page is registered under Settings', async ( {
		admin,
		page,
	} ) => {
		await admin.visitAdminPage( 'options-general.php?page=wp-ambientcss' );

		await expect(
			page.getByRole( 'heading', { name: 'Ambient CSS', level: 1 } )
		).toBeVisible();
		await expect(
			page.getByRole( 'heading', { name: 'Site default lighting' } )
		).toBeVisible();
		await expect(
			page.locator( 'input[name="wp_ambientcss_settings[light_x]"]' )
		).toBeVisible();
	} );

	test( 'settings round-trip through the Settings API', async ( {
		admin,
		page,
	} ) => {
		await admin.visitAdminPage( 'options-general.php?page=wp-ambientcss' );

		await page.fill(
			'input[name="wp_ambientcss_settings[light_hue]"]',
			'120'
		);
		await page.fill(
			'input[name="wp_ambientcss_settings[albedo]"]',
			'#336699'
		);
		await page.getByRole( 'button', { name: 'Save Changes' } ).click();

		await expect( page.locator( '#setting-error-settings_updated' ) ).toBeVisible();
		await expect(
			page.locator( 'input[name="wp_ambientcss_settings[light_hue]"]' )
		).toHaveValue( '120' );
		await expect(
			page.locator( 'input[name="wp_ambientcss_settings[albedo]"]' )
		).toHaveValue( '#336699' );
	} );

	test( 'a rejected colour is reported and not stored', async ( {
		admin,
		page,
	} ) => {
		await admin.visitAdminPage( 'options-general.php?page=wp-ambientcss' );

		await page.fill(
			'input[name="wp_ambientcss_settings[albedo]"]',
			'red;}body{display:none'
		);
		await page.getByRole( 'button', { name: 'Save Changes' } ).click();

		await expect(
			page.getByText( 'The surface color was not a value Ambient CSS can use' )
		).toBeVisible();
		await expect(
			page.locator( 'input[name="wp_ambientcss_settings[albedo]"]' )
		).toHaveValue( '' );
	} );

	test( 'the stylesheet is loaded in the block editor', async ( {
		admin,
		page,
	} ) => {
		await admin.createNewPost();

		await dismissWelcomeGuide( page );

		// The canvas is iframed, and the bundled stylesheet is injected into
		// it rather than the outer document, so check both and give the
		// iframe time to attach.
		await expect
			.poll(
				async () =>
					page.evaluate( () => {
						const collect = ( doc: Document | null | undefined ) =>
							doc
								? Array.from(
										doc.querySelectorAll< HTMLLinkElement >(
											'link[rel="stylesheet"]'
										)
								  ).map( ( link ) => link.href )
								: [];

						const iframe = document.querySelector(
							'iframe[name="editor-canvas"]'
						) as HTMLIFrameElement | null;

						return [
							...collect( document ),
							...collect( iframe?.contentDocument ),
						].some( ( url ) =>
							url.includes( 'assets/vendor/ambient.css' )
						);
					} ),
				{ timeout: 15000 }
			)
			.toBe( true );
	} );
} );
