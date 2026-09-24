import type { Page } from '@playwright/test';

/**
 * Dismisses the welcome guide modal when it is showing.
 *
 * A fresh wp-env database shows it on the first editor visit and it swallows
 * clicks aimed at the sidebar.
 */
export async function dismissWelcomeGuide( page: Page ): Promise< void > {
	await page.evaluate( () => {
		const preferences = ( window as any ).wp?.data?.dispatch(
			'core/preferences'
		);

		preferences?.set( 'core/edit-post', 'welcomeGuide', false );
		preferences?.set( 'core', 'welcomeGuide', false );
	} );

	const close = page.getByRole( 'button', { name: 'Close', exact: true } );

	if ( await close.count() ) {
		await close.first().click( { timeout: 2000 } ).catch( () => {} );
	}
}

/**
 * Opens the Ambient panel for the currently selected block.
 *
 * The inspector is registered under the "styles" group. Which tab that lands
 * in depends on the WordPress version: some ship a Styles tab inside the block
 * inspector, others put every panel directly under the Block tab. Handle both
 * rather than pinning the test to one release.
 */
export async function openAmbientPanel( page: Page ): Promise< void > {
	const blockTab = page.getByRole( 'tab', { name: 'Block' } );

	if ( await blockTab.count() ) {
		await blockTab.click();
	}

	const stylesTab = page.getByRole( 'tab', { name: 'Styles' } );

	if ( await stylesTab.count() ) {
		await stylesTab.click();
	}

	const panel = page.getByRole( 'button', { name: 'Ambient', exact: true } );

	await panel.waitFor( { state: 'visible' } );

	if ( ( await panel.getAttribute( 'aria-expanded' ) ) === 'false' ) {
		await panel.click();
	}
}
