<?php

if (!defined('ABSPATH')) {
    exit;
}

final class Mave_WordPress_Settings
{
    public function init()
    {
        add_action('admin_menu', array($this, 'add_settings_page'));
        add_action('admin_init', array($this, 'register_settings'));
    }

    public function add_settings_page()
    {
        add_options_page(
            __('Mave', 'mave-video'),
            __('Mave', 'mave-video'),
            'manage_options',
            'mave-wordpress',
            array($this, 'render_page')
        );
    }

    public function register_settings()
    {
        register_setting(
            'mave_wordpress',
            'mave_wordpress_settings',
            array(
                'type' => 'array',
                'sanitize_callback' => array($this, 'sanitize_settings'),
                'default' => Mave_WordPress::default_settings(),
            )
        );
    }

    public function sanitize_settings($input)
    {
        $defaults = Mave_WordPress::default_settings();
        $existing = Mave_WordPress::settings();
        $input = is_array($input) ? $input : array();
        $next = $defaults;

        $api_key = isset($input['api_key']) ? trim((string) $input['api_key']) : '';
        $next['api_key'] = '' === $api_key ? $existing['api_key'] : Mave_WordPress::normalize_api_key($api_key);
        $next['upload_subject'] = isset($input['upload_subject'])
            ? sanitize_text_field(trim((string) $input['upload_subject']))
            : '';
        $next['player_theme'] = isset($input['player_theme'])
            ? Mave_WordPress::sanitize_player_theme($input['player_theme'])
            : $defaults['player_theme'];
        $next['player_color'] = isset($input['player_color'])
            ? Mave_WordPress::sanitize_player_color($input['player_color'])
            : '';

        foreach (Mave_WordPress::endpoint_keys() as $key) {
            $value = isset($input[$key]) ? trim((string) $input[$key]) : '';
            $next[$key] = '' === $value ? $defaults[$key] : $this->sanitize_endpoint($key, $value, $defaults[$key]);
        }

        return $next;
    }

    public function render_page()
    {
        if (!current_user_can('manage_options')) {
            return;
        }

        $settings = Mave_WordPress::settings();

        ?>
        <div class="wrap">
            <h1><?php esc_html_e('Mave', 'mave-video'); ?></h1>
            <p>
                <?php esc_html_e('Paste a Mave API key to use Mave uploads and players in the block editor.', 'mave-video'); ?>
            </p>
            <p>
                <?php
                $terms_link = '<a href="' . esc_url('https://www.mave.io/terms') . '" target="_blank" rel="noopener noreferrer">' .
                    esc_html__('Terms', 'mave-video') .
                    '</a>';
                $privacy_link = '<a href="' . esc_url('https://www.mave.io/privacy') . '" target="_blank" rel="noopener noreferrer">' .
                    esc_html__('Privacy Policy', 'mave-video') .
                    '</a>';
                $service_notice = sprintf(
                    /* translators: 1: Mave terms link, 2: Mave privacy policy link. */
                    esc_html__(
                        'Mave is an external video hosting service. Uploads, library requests, player components, playback assets, and privacy-friendly aggregate playback events connect to Mave services. Mave video analytics do not use cookies, cross-site tracking, advertising identifiers, or viewer profiling. Review the %1$s and %2$s.',
                        'mave-video'
                    ),
                    $terms_link,
                    $privacy_link
                );

                echo wp_kses(
                    $service_notice,
                    array(
                        'a' => array(
                            'href' => array(),
                            'rel' => array(),
                            'target' => array(),
                        ),
                    )
                );
                ?>
            </p>

            <form action="options.php" method="post">
                <?php settings_fields('mave_wordpress'); ?>

                <h2><?php esc_html_e('Connection', 'mave-video'); ?></h2>
                <table class="form-table" role="presentation">
                    <tbody>
                        <tr>
                            <th scope="row">
                                <label for="mave_wordpress_api_key"><?php esc_html_e('API key', 'mave-video'); ?></label>
                            </th>
                            <td><?php $this->render_api_key_field($settings); ?></td>
                        </tr>
                        <tr>
                            <th scope="row">
                                <label for="mave_wordpress_upload_subject"><?php esc_html_e('Upload target', 'mave-video'); ?></label>
                            </th>
                            <td><?php $this->render_upload_subject_field($settings); ?></td>
                        </tr>
                    </tbody>
                </table>

                <details class="mave-wordpress-settings-advanced">
                    <summary><?php esc_html_e('Advanced settings', 'mave-video'); ?></summary>
                    <h2><?php esc_html_e('Player defaults', 'mave-video'); ?></h2>
                    <p>
                        <?php esc_html_e('These values apply to every Mave player unless a block overrides them.', 'mave-video'); ?>
                    </p>
                    <table class="form-table" role="presentation">
                        <tbody>
                            <tr>
                                <th scope="row">
                                    <label for="mave_wordpress_player_theme"><?php esc_html_e('Theme', 'mave-video'); ?></label>
                                </th>
                                <td><?php $this->render_player_theme_field($settings); ?></td>
                            </tr>
                            <tr>
                                <th scope="row">
                                    <label for="mave_wordpress_player_color"><?php esc_html_e('Color', 'mave-video'); ?></label>
                                </th>
                                <td><?php $this->render_player_color_field($settings); ?></td>
                            </tr>
                        </tbody>
                    </table>

                    <details class="mave-wordpress-settings-services">
                        <summary><?php esc_html_e('Mave services', 'mave-video'); ?></summary>
                        <table class="form-table" role="presentation">
                            <tbody>
                                <?php foreach ($this->endpoint_labels() as $key => $label) : ?>
                                    <tr>
                                        <th scope="row">
                                            <label for="mave_wordpress_<?php echo esc_attr($key); ?>"><?php echo esc_html($label); ?></label>
                                        </th>
                                        <td><?php $this->render_endpoint_field($settings, $key); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </details>
                </details>

                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    private function render_api_key_field($settings)
    {
        $placeholder = empty($settings['api_key'])
            ? __('Paste your Mave API key', 'mave-video')
            : __('API key is stored. Leave blank to keep it.', 'mave-video');

        printf(
            '<input id="mave_wordpress_api_key" type="password" class="regular-text" name="mave_wordpress_settings[api_key]" value="" placeholder="%s" autocomplete="off" />',
            esc_attr($placeholder)
        );
    }

    private function render_player_theme_field($settings)
    {
        $value = isset($settings['player_theme'])
            ? Mave_WordPress::sanitize_player_theme($settings['player_theme'])
            : 'default';

        echo '<select id="mave_wordpress_player_theme" name="mave_wordpress_settings[player_theme]">';
        foreach (Mave_WordPress::player_themes() as $option_value => $label) {
            printf(
                '<option value="%1$s"%2$s>%3$s</option>',
                esc_attr($option_value),
                selected($value, $option_value, false),
                esc_html($label)
            );
        }
        echo '</select>';
        echo '<p class="description">';
        esc_html_e('Default theme for Mave players inserted through this plugin.', 'mave-video');
        echo '</p>';
    }

    private function render_player_color_field($settings)
    {
        $value = isset($settings['player_color'])
            ? Mave_WordPress::sanitize_player_color($settings['player_color'])
            : '';

        printf(
            '<input id="mave_wordpress_player_color" type="text" class="regular-text code" name="mave_wordpress_settings[player_color]" value="%s" placeholder="%s" />',
            esc_attr($value),
            esc_attr__('#1997FF', 'mave-video')
        );
        echo '<p class="description">';
        esc_html_e('Optional color passed to the Mave player color attribute. Leave blank for the Mave default.', 'mave-video');
        echo '</p>';
    }

    private function render_upload_subject_field($settings)
    {
        $value = isset($settings['upload_subject']) ? $settings['upload_subject'] : '';

        printf(
            '<input id="mave_wordpress_upload_subject" type="text" class="regular-text code" name="mave_wordpress_settings[upload_subject]" value="%s" placeholder="%s" />',
            esc_attr($value),
            esc_attr__('Auto-detect from Mave library', 'mave-video')
        );
        echo '<p class="description">';
        esc_html_e('Optional space hash/id or collection id for new mave-upload files. When this is a collection id, the block picker uses that collection as its root.', 'mave-video');
        echo '</p>';
    }

    private function render_endpoint_field($settings, $key)
    {
        $value = isset($settings[$key]) ? $settings[$key] : '';

        printf(
            '<input id="mave_wordpress_%1$s" type="text" class="regular-text code" name="mave_wordpress_settings[%1$s]" value="%2$s" />',
            esc_attr($key),
            esc_attr($value)
        );
    }

    private function endpoint_labels()
    {
        return array(
            'api_endpoint' => __('API endpoint', 'mave-video'),
            'components_src' => __('Components module URL', 'mave-video'),
            'cdn_endpoint' => __('CDN endpoint', 'mave-video'),
            'socket_endpoint' => __('Upload socket endpoint', 'mave-video'),
            'upload_endpoint' => __('Upload endpoint', 'mave-video'),
            'metrics_endpoint' => __('Metrics endpoint', 'mave-video'),
        );
    }

    private function sanitize_endpoint($key, $value, $default)
    {
        $value = trim((string) $value);

        if ('cdn_endpoint' === $key) {
            $sanitized = sanitize_text_field($value);
            $test_url = str_replace(
                array('${this.spaceId}', '${spaceId}', '{spaceId}'),
                'example',
                $sanitized
            );

            return $this->is_url_with_allowed_scheme($test_url, array('http', 'https'))
                ? $sanitized
                : $default;
        }

        $protocols = 'socket_endpoint' === $key
            ? array('ws', 'wss', 'http', 'https')
            : array('http', 'https');
        $sanitized = esc_url_raw($value, $protocols);

        return $this->is_url_with_allowed_scheme($sanitized, $protocols)
            ? $sanitized
            : $default;
    }

    private function is_url_with_allowed_scheme($url, $allowed_schemes)
    {
        $parts = wp_parse_url($url);

        if (empty($parts['scheme']) || empty($parts['host'])) {
            return false;
        }

        return in_array(strtolower($parts['scheme']), $allowed_schemes, true);
    }
}
