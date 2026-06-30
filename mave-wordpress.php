<?php
/**
 * Plugin Name: Mave Video
 * Plugin URI: https://github.com/maveio/mave-wordpress
 * Description: Embed and upload Mave videos from WordPress and the block editor.
 * Version: 0.0.1
 * Author: Mave
 * Author URI: https://mave.io/
 * Text Domain: mave-video
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */

if (!defined('ABSPATH')) {
    exit;
}

define('MAVE_WORDPRESS_VERSION', '0.0.1');
define('MAVE_WORDPRESS_FILE', __FILE__);
define('MAVE_WORDPRESS_DIR', plugin_dir_path(__FILE__));
define('MAVE_WORDPRESS_URL', plugin_dir_url(__FILE__));

require_once MAVE_WORDPRESS_DIR . 'includes/class-mave-wordpress.php';
require_once MAVE_WORDPRESS_DIR . 'includes/class-mave-wordpress-api-client.php';
require_once MAVE_WORDPRESS_DIR . 'includes/class-mave-wordpress-jwt.php';
require_once MAVE_WORDPRESS_DIR . 'includes/class-mave-wordpress-settings.php';
require_once MAVE_WORDPRESS_DIR . 'includes/class-mave-wordpress-rest.php';
require_once MAVE_WORDPRESS_DIR . 'includes/class-mave-wordpress-blocks.php';

register_activation_hook(MAVE_WORDPRESS_FILE, static function () {
    if (false === get_option('mave_wordpress_settings', false)) {
        add_option('mave_wordpress_settings', Mave_WordPress::default_settings(), '', false);
    }
});

add_action('plugins_loaded', static function () {
    Mave_WordPress::instance()->init();
});
