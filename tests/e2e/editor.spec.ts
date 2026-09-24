import { test, expect } from '@wordpress/e2e-test-utils-playwright';

import { dismissWelcomeGuide, openAmbientPanel } from './helpers';

/**
 * The inspector panel is the half of the plugin that unit tests cannot reach:
 * the controls have to appear on a real block, and what they write has to come
 * back out in the serialised markup.
 */
test.describe( 'Block inspector', () => {
	test.beforeEach( async ( { admin, page } ) => {
		await admin.createNewPost();
		await dismissWelcomeGuide( page );
	} );

	test( 'the Ambient panel appears for a supported block', async ( {
		editor,
		page,
	} ) => {
		await editor.insertBlock( { name: 'core/group' } );
		await editor.openDocumentSettingsSidebar();
		await page.getByRole( 'tab', { name: 'Block' } ).click();

		await expect(
			page.getByRole( 'button', { name: 'Ambient', exact: true } )
		).toBeVisible();
	} );

	test( 'the panel is absent on an excluded block', async ( {
		editor,
		page,
	} ) => {
		await editor.insertBlock( {
			name: 'core/html',
			attributes: { content: '<p>raw</p>' },
		} );
		await editor.openDocumentSettingsSidebar();
		await page.getByRole( 'tab', { name: 'Block' } ).click();

		await expect(
			page.getByRole( 'button', { name: 'Ambient', exact: true } )
		).toHaveCount( 0 );
	} );

	test( 'enabling Ambient writes the attribute and the class', async ( {
		editor,
		page,
	} ) => {
		await editor.insertBlock( { name: 'core/group' } );
		await editor.openDocumentSettingsSidebar();
		await openAmbientPanel( page );

		await page.getByRole( 'checkbox', { name: 'Enable Ambient' } ).check();
		await page
			.getByRole( 'combobox', { name: 'Surface' } )
			.selectOption( 'convex' );
		await page
			.getByRole( 'combobox', { name: 'Material' } )
			.selectOption( 'shiny' );

		const content = await editor.getEditedPostContent();

		expect( content ).toContain( '"enabled":true' );
		expect( content ).toContain( '"surface":"convex"' );
		expect( content ).toContain( '"material":"shiny"' );
		expect( content ).toContain( 'amb-surface-convex' );
		expect( content ).toContain( 'amb-mat-shiny' );
		expect( content ).toContain( 'ambient' );
	} );

	test( 'the light direction grid sets the matching class', async ( {
		editor,
		page,
	} ) => {
		await editor.insertBlock( { name: 'core/group' } );
		await editor.openDocumentSettingsSidebar();
		await openAmbientPanel( page );
		await page.getByRole( 'checkbox', { name: 'Enable Ambient' } ).check();

		await page.getByRole( 'button', { name: 'Bottom right' } ).click();

		const content = await editor.getEditedPostContent();

		expect( content ).toContain( '"light":"br"' );
		expect( content ).toContain( 'amb-light-br' );
	} );

	test( 'clearing Ambient removes the attribute entirely', async ( {
		editor,
		page,
	} ) => {
		await editor.insertBlock( { name: 'core/group' } );
		await editor.openDocumentSettingsSidebar();
		await openAmbientPanel( page );
		await page.getByRole( 'checkbox', { name: 'Enable Ambient' } ).check();

		expect( await editor.getEditedPostContent() ).toContain( 'ambient' );

		await page
			.getByRole( 'button', { name: 'Clear Ambient settings' } )
			.click();

		const content = await editor.getEditedPostContent();

		expect( content ).not.toContain( '"ambient"' );
		expect( content ).not.toContain( 'amb-' );
	} );
} );
