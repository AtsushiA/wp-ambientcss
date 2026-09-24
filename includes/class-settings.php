<?php
/**
 * Site wide defaults (SPEC.md F-05).
 *
 * @package WP_AmbientCSS
 */

namespace WP_AmbientCSS;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the settings page and turns the stored options into a `:root`
 * rule that is printed right after the Ambient stylesheet.
 */
class Settings {

	const OPTION = 'wp_ambientcss_settings';

	/**
	 * Numeric settings: CSS property, minimum, maximum, unit.
	 *
	 * @var array<string, array{0: string, 1: float, 2: float, 3: string}>
	 */
	const NUMERIC = array(
		'light_x'          => array( '--amb-light-x', -1, 1, '' ),
		'light_y'          => array( '--amb-light-y', -1, 1, '' ),
		'key_light'        => array( '--amb-key-light-intensity', 0, 1, '' ),
		'fill_light'       => array( '--amb-fill-light-intensity', 0, 1, '' ),
		'light_hue'        => array( '--amb-light-hue', 0, 360, '' ),
		'light_saturation' => array( '--amb-light-saturation', 0, 100, '%' ),
		'shade'            => array( '--amb-shade', 0, 2, '' ),
		'grain'            => array( '--amb-grain-amount', 0, 2, '' ),
	);

	/**
	 * Hooks the settings page and registration.
	 */
	public function init() {
		add_action( 'admin_menu', array( $this, 'add_page' ) );
		add_action( 'admin_init', array( $this, 'register' ) );
	}

	/**
	 * Returns the stored settings.
	 *
	 * @return array
	 */
	public static function get() {
		$stored = get_option( self::OPTION, array() );

		return is_array( $stored ) ? $stored : array();
	}

	/**
	 * Returns the configured load mode.
	 *
	 * @return string Either `always` or `on_demand`.
	 */
	public static function load_mode() {
		$settings = self::get();

		return ( isset( $settings['load_mode'] ) && 'on_demand' === $settings['load_mode'] )
			? 'on_demand'
			: 'always';
	}

	/**
	 * Builds the `:root` declarations from the stored settings.
	 *
	 * Unset keys are not emitted, so the upstream defaults keep applying.
	 *
	 * @return string CSS rule, or an empty string when nothing is configured.
	 */
	public static function get_root_css() {
		$settings = self::get();
		$vars     = array();

		foreach ( self::NUMERIC as $key => $spec ) {
			if ( ! isset( $settings[ $key ] ) || '' === $settings[ $key ] || ! is_numeric( $settings[ $key ] ) ) {
				continue;
			}
			list( $property, $min, $max, $unit ) = $spec;
			$value                               = max( $min, min( $max, (float) $settings[ $key ] ) );
			$vars[ $property ]                   = Attributes::format_number( $value ) . $unit;
		}

		if ( ! empty( $settings['albedo'] ) ) {
			$color = Attributes::sanitize_color( (string) $settings['albedo'] );
			if ( '' !== $color ) {
				$vars['--amb-albedo'] = $color;
			}
		}

		/**
		 * Filters the site wide Ambient custom properties.
		 *
		 * @param array $vars Property name => value.
		 */
		$vars = apply_filters( 'wp_ambientcss_root_vars', $vars );

		if ( empty( $vars ) ) {
			return '';
		}

		return ':root{' . Attributes::vars_to_style( $vars ) . '}';
	}

	/**
	 * Adds the settings page.
	 */
	public function add_page() {
		add_options_page(
			__( 'Ambient CSS', 'wp-ambientcss' ),
			__( 'Ambient CSS', 'wp-ambientcss' ),
			'manage_options',
			'wp-ambientcss',
			array( $this, 'render_page' )
		);
	}

	/**
	 * Registers the option, sections and fields.
	 */
	public function register() {
		register_setting(
			'wp_ambientcss',
			self::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( $this, 'sanitize' ),
				'default'           => array(),
			)
		);

		add_settings_section(
			'wp_ambientcss_light',
			__( 'Site default lighting', 'wp-ambientcss' ),
			array( $this, 'render_light_intro' ),
			'wp-ambientcss'
		);

		$fields = array(
			'light_x'          => __( 'Light X (-1 to 1)', 'wp-ambientcss' ),
			'light_y'          => __( 'Light Y (-1 to 1)', 'wp-ambientcss' ),
			'key_light'        => __( 'Key light intensity (0 to 1)', 'wp-ambientcss' ),
			'fill_light'       => __( 'Fill light intensity (0 to 1)', 'wp-ambientcss' ),
			'light_hue'        => __( 'Light hue (0 to 360)', 'wp-ambientcss' ),
			'light_saturation' => __( 'Light saturation (%)', 'wp-ambientcss' ),
			'shade'            => __( 'Reflectance (0 to 2)', 'wp-ambientcss' ),
			'grain'            => __( 'Grain amount (0 to 2)', 'wp-ambientcss' ),
		);

		foreach ( $fields as $key => $label ) {
			add_settings_field(
				$key,
				$label,
				array( $this, 'render_number_field' ),
				'wp-ambientcss',
				'wp_ambientcss_light',
				array( 'key' => $key )
			);
		}

		add_settings_field(
			'albedo',
			__( 'Surface color (albedo)', 'wp-ambientcss' ),
			array( $this, 'render_albedo_field' ),
			'wp-ambientcss',
			'wp_ambientcss_light'
		);

		add_settings_section(
			'wp_ambientcss_loading',
			__( 'Stylesheet loading', 'wp-ambientcss' ),
			'__return_false',
			'wp-ambientcss'
		);

		add_settings_field(
			'load_mode',
			__( 'Load the stylesheet', 'wp-ambientcss' ),
			array( $this, 'render_load_mode_field' ),
			'wp-ambientcss',
			'wp_ambientcss_loading'
		);
	}

	/**
	 * Explains what the lighting section does.
	 */
	public function render_light_intro() {
		echo '<p>' . esc_html__(
			'These values are written to :root and become the starting point for every block. Leave a field empty to keep the Ambient CSS default.',
			'wp-ambientcss'
		) . '</p>';
	}

	/**
	 * Renders one numeric field.
	 *
	 * @param array $args Field arguments, expects a `key`.
	 */
	public function render_number_field( $args ) {
		$key      = $args['key'];
		$settings = self::get();
		$value    = isset( $settings[ $key ] ) ? $settings[ $key ] : '';
		$spec     = self::NUMERIC[ $key ];

		printf(
			'<input type="number" step="any" min="%1$s" max="%2$s" name="%3$s[%4$s]" value="%5$s" class="small-text" />',
			esc_attr( (string) $spec[1] ),
			esc_attr( (string) $spec[2] ),
			esc_attr( self::OPTION ),
			esc_attr( $key ),
			esc_attr( (string) $value )
		);
	}

	/**
	 * Renders the albedo color field.
	 */
	public function render_albedo_field() {
		$settings = self::get();
		$value    = isset( $settings['albedo'] ) ? $settings['albedo'] : '';

		printf(
			'<input type="text" name="%1$s[albedo]" value="%2$s" class="regular-text code" placeholder="#eaeaea" />',
			esc_attr( self::OPTION ),
			esc_attr( (string) $value )
		);
	}

	/**
	 * Renders the load mode field.
	 */
	public function render_load_mode_field() {
		$mode = self::load_mode();
		?>
		<fieldset>
			<label>
				<input type="radio" name="<?php echo esc_attr( self::OPTION ); ?>[load_mode]"
					value="always" <?php checked( 'always', $mode ); ?> />
				<?php esc_html_e( 'Always (recommended)', 'wp-ambientcss' ); ?>
			</label><br />
			<label>
				<input type="radio" name="<?php echo esc_attr( self::OPTION ); ?>[load_mode]"
					value="on_demand" <?php checked( 'on_demand', $mode ); ?> />
				<?php esc_html_e( 'Only on pages that use Ambient', 'wp-ambientcss' ); ?>
			</label>
			<p class="description">
				<?php
				esc_html_e(
					'Ambient CSS sets custom properties on every element through a universal selector, so loading it only where it is needed can save work on large pages. The trade-off: when a block is detected after the document head has been sent, the stylesheet is printed in the footer and the first paint can flash unstyled.',
					'wp-ambientcss'
				);
				?>
			</p>
		</fieldset>
		<?php
	}

	/**
	 * Sanitizes the whole option before it is stored.
	 *
	 * @param mixed $input Raw input.
	 * @return array Sanitized settings.
	 */
	public function sanitize( $input ) {
		if ( ! is_array( $input ) ) {
			return array();
		}

		$out = array();

		foreach ( self::NUMERIC as $key => $spec ) {
			if ( ! isset( $input[ $key ] ) || '' === trim( (string) $input[ $key ] ) ) {
				continue;
			}
			if ( ! is_numeric( $input[ $key ] ) ) {
				continue;
			}
			$out[ $key ] = max( $spec[1], min( $spec[2], (float) $input[ $key ] ) );
		}

		if ( isset( $input['albedo'] ) && '' !== trim( (string) $input['albedo'] ) ) {
			$color = Attributes::sanitize_color( (string) $input['albedo'] );
			if ( '' !== $color ) {
				$out['albedo'] = $color;
			} else {
				add_settings_error(
					self::OPTION,
					'wp_ambientcss_albedo',
					__( 'The surface color was not a value Ambient CSS can use, so it was discarded.', 'wp-ambientcss' )
				);
			}
		}

		$out['load_mode'] = ( isset( $input['load_mode'] ) && 'on_demand' === $input['load_mode'] )
			? 'on_demand'
			: 'always';

		return $out;
	}

	/**
	 * Renders the settings page.
	 */
	public function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Ambient CSS', 'wp-ambientcss' ); ?></h1>
			<form action="options.php" method="post">
				<?php
				settings_fields( 'wp_ambientcss' );
				do_settings_sections( 'wp-ambientcss' );
				submit_button();
				?>
			</form>
		</div>
		<?php
	}
}
