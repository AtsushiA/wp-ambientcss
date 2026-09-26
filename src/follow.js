/**
 * Drives the Ambient light vector from the pointer.
 *
 * Two modes, both opt-in per block:
 *
 * - "page"  shares one light source. The vector is written to the document
 *           root, and every block that does not set its own light inherits it.
 * - "block" gives the block its own light, computed from where the pointer is
 *           over that block and written inline on the element itself. Inline
 *           beats inherited, so the two modes coexist on one page without
 *           either having to know about the other.
 *
 * When the pointer leaves, the last vector stays put rather than springing
 * back, so nothing moves on its own.
 *
 * No build-time dependencies: this ships to the front end, where the plugin
 * otherwise adds no JavaScript at all.
 */

const PAGE_SELECTOR = '[data-wp-ambient-follow="page"]';
const BLOCK_SELECTOR = '[data-wp-ambient-follow="block"]';

/**
 * Clamps a value to the -1..1 range Ambient CSS expects.
 *
 * @param {number} value Raw value.
 * @return {number} Clamped value.
 */
function clamp( value ) {
	if ( value < -1 ) {
		return -1;
	}

	return value > 1 ? 1 : value;
}

/**
 * Writes a light vector onto an element.
 *
 * @param {HTMLElement} element Target.
 * @param {number}      x       Horizontal position, -1 to 1.
 * @param {number}      y       Vertical position, -1 to 1.
 */
function setVector( element, x, y ) {
	element.style.setProperty( '--amb-light-x', clamp( x ).toFixed( 3 ) );
	element.style.setProperty( '--amb-light-y', clamp( y ).toFixed( 3 ) );
}

function start() {
	const root = document.documentElement;
	const pageBlocks = document.querySelectorAll( PAGE_SELECTOR );
	const blockBlocks = document.querySelectorAll( BLOCK_SELECTOR );

	if ( ! pageBlocks.length && ! blockBlocks.length ) {
		return;
	}

	// One rAF for the whole page: a pointermove can fire several times per
	// frame, and each write invalidates style for the subtree it lands on.
	//
	// Keyed by element rather than a single slot, because a move over a
	// block-mode element also bubbles to the document handler. With one slot
	// the page update would land last and the block's own update would be
	// dropped on the floor.
	const pending = new Map();
	let frame = 0;

	const flush = () => {
		frame = 0;

		pending.forEach( ( vector, element ) => {
			setVector( element, vector.x, vector.y );
		} );

		pending.clear();
	};

	const schedule = ( element, x, y ) => {
		pending.set( element, { x, y } );

		if ( ! frame ) {
			frame = window.requestAnimationFrame( flush );
		}
	};

	if ( pageBlocks.length ) {
		document.addEventListener(
			'pointermove',
			( event ) => {
				schedule(
					root,
					( event.clientX / window.innerWidth ) * 2 - 1,
					( event.clientY / window.innerHeight ) * 2 - 1
				);
			},
			{ passive: true }
		);
	}

	// Listening on the element rather than the document means the browser's
	// own hit testing decides when a block is under the pointer, and leaving
	// simply stops the updates.
	blockBlocks.forEach( ( element ) => {
		element.addEventListener(
			'pointermove',
			( event ) => {
				const rect = element.getBoundingClientRect();

				if ( ! rect.width || ! rect.height ) {
					return;
				}

				schedule(
					element,
					( event.clientX - ( rect.left + rect.width / 2 ) ) /
						( rect.width / 2 ),
					( event.clientY - ( rect.top + rect.height / 2 ) ) /
						( rect.height / 2 )
				);
			},
			{ passive: true }
		);
	} );
}

// A pointer that cannot hover has no resting position to read, and the effect
// is motion the visitor did not ask for when they have said they want less of
// it.
const canHover = window.matchMedia( '(hover: hover)' ).matches;
const wantsMotion = ! window.matchMedia( '(prefers-reduced-motion: reduce)' )
	.matches;

if ( canHover && wantsMotion ) {
	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', start, { once: true } );
	} else {
		start();
	}
}
