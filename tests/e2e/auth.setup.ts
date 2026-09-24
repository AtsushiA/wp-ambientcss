import { test as setup, RequestUtils } from '@wordpress/e2e-test-utils-playwright';

const STORAGE_STATE_PATH = 'tests/e2e/.auth/user.json';

/**
 * Logs in over HTTP and persists the cookies plus the REST nonce.
 *
 * Driving the login form with the keyboard is flaky here: the login page
 * swaps the password input while its own scripts initialise, so a fill can
 * land in the wrong field. RequestUtils posts the credentials directly and
 * writes the storage state the other projects depend on.
 */
setup( 'authenticate', async ( { baseURL } ) => {
	const requestUtils = await RequestUtils.setup( {
		storageStatePath: STORAGE_STATE_PATH,
		baseURL,
	} );

	await requestUtils.setupRest();
} );
