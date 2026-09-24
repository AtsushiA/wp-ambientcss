<?php
/**
 * Removes plugin options on uninstall.
 *
 * Block attributes stay in post content on purpose: removing the plugin
 * should never rewrite what people have written.
 *
 * @package WP_AmbientCSS
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

/**
 * Deletes the plugin option on every site of the installation.
 */
function wp_ambientcss_uninstall() {
	$option = 'wp_ambientcss_settings';

	if ( ! is_multisite() ) {
		delete_option( $option );
		return;
	}

	foreach ( get_sites(
		array(
			'fields' => 'ids',
			'number' => 0,
		)
	) as $wp_ambientcss_site_id ) {
		switch_to_blog( $wp_ambientcss_site_id );
		delete_option( $option );
		restore_current_blog();
	}
}

wp_ambientcss_uninstall();
