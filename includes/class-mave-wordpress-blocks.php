<?php

if (!defined('ABSPATH')) {
    exit;
}

final class Mave_WordPress_Blocks
{
    public function init()
    {
        add_action('init', array($this, 'register'));
        add_shortcode('mave_video', array($this, 'render_video_shortcode'));
    }

    public function register()
    {
        wp_register_script(
            'mave-wordpress-video-editor',
            MAVE_WORDPRESS_URL . 'assets/js/editor.js',
            array('wp-api-fetch', 'wp-block-editor', 'wp-blocks', 'wp-components', 'wp-element', 'wp-i18n'),
            $this->asset_version('assets/js/editor.js'),
            true
        );

        wp_add_inline_script(
            'mave-wordpress-video-editor',
            'window.MaveWordPress = ' . wp_json_encode(Mave_WordPress::editor_settings()) . ';',
            'before'
        );

        wp_register_script(
            'mave-wordpress-frontend',
            MAVE_WORDPRESS_URL . 'assets/js/frontend.js',
            array(),
            $this->asset_version('assets/js/frontend.js'),
            true
        );

        wp_add_inline_script(
            'mave-wordpress-frontend',
            'window.MaveWordPressPublic = ' . wp_json_encode(Mave_WordPress::public_settings()) . ';',
            'before'
        );

        wp_register_style(
            'mave-wordpress-block-style',
            MAVE_WORDPRESS_URL . 'assets/css/style.css',
            array(),
            $this->asset_version('assets/css/style.css')
        );

        wp_register_style(
            'mave-wordpress-block-editor',
            MAVE_WORDPRESS_URL . 'assets/css/editor.css',
            array('wp-edit-blocks'),
            $this->asset_version('assets/css/editor.css')
        );

        register_block_type(
            MAVE_WORDPRESS_DIR . 'blocks/video',
            array(
                'render_callback' => array($this, 'render_video_block'),
            )
        );
    }

    private function asset_version($relative_path)
    {
        $path = MAVE_WORDPRESS_DIR . ltrim($relative_path, '/');

        if (file_exists($path)) {
            return MAVE_WORDPRESS_VERSION . '-' . filemtime($path);
        }

        return MAVE_WORDPRESS_VERSION;
    }

    public function render_video_block($attributes)
    {
        $embed_id = isset($attributes['embedId']) ? trim((string) $attributes['embedId']) : '';

        if ('' === $embed_id) {
            return '';
        }

        wp_enqueue_script('mave-wordpress-frontend');
        wp_enqueue_style('mave-wordpress-block-style');

        $player = $this->player_markup($attributes);
        $wrapper_attributes = get_block_wrapper_attributes(array(
            'class' => 'mave-wordpress-player',
        ));

        return '<div ' . $wrapper_attributes . '>' . $player . '</div>';
    }

    public function render_video_shortcode($atts)
    {
        $atts = shortcode_atts(
            array(
                'id' => '',
                'embed' => '',
                'autoplay' => '',
                'loop' => '',
                'controls' => '',
                'aspect_ratio' => '',
                'theme' => '',
                'color' => '',
            ),
            $atts,
            'mave_video'
        );

        $embed_id = $atts['id'] ?: $atts['embed'];

        if ('' === trim((string) $embed_id)) {
            return '';
        }

        wp_enqueue_script('mave-wordpress-frontend');
        wp_enqueue_style('mave-wordpress-block-style');

        return '<div class="mave-wordpress-player mave-wordpress-shortcode">' .
            $this->player_markup(array(
                'embedId' => $embed_id,
                'autoplay' => $atts['autoplay'],
                'loop' => in_array($atts['loop'], array('1', 'true', 'yes'), true),
                'controls' => $atts['controls'],
                'aspectRatio' => $atts['aspect_ratio'],
                'theme' => $atts['theme'],
                'color' => $atts['color'],
            )) .
            '</div>';
    }

    private function player_markup($attributes)
    {
        $attrs = array(
            'embed' => isset($attributes['embedId']) ? trim((string) $attributes['embedId']) : '',
        );

        foreach (array(
            'autoplay' => 'autoplay',
            'controls' => 'controls',
            'aspectRatio' => 'aspect-ratio',
        ) as $attribute_key => $html_key) {
            if (!empty($attributes[$attribute_key])) {
                $attrs[$html_key] = (string) $attributes[$attribute_key];
            }
        }

        foreach ($this->resolved_player_defaults($attributes) as $attribute_key => $value) {
            if ('' !== $value) {
                $attrs[$attribute_key] = $value;
            }
        }

        if (!empty($attributes['loop'])) {
            $attrs['loop'] = 'true';
        }

        $attrs['style'] = Mave_WordPress::player_style(
            $attrs['embed'],
            isset($attributes['aspectRatio']) ? $attributes['aspectRatio'] : ''
        );

        $html_attrs = '';

        foreach ($attrs as $key => $value) {
            if ('' === $value) {
                continue;
            }

            $html_attrs .= sprintf(' %s="%s"', esc_attr($key), esc_attr($value));
        }

        return '<mave-player' . $html_attrs . '></mave-player>';
    }

    private function resolved_player_defaults($attributes)
    {
        $defaults = Mave_WordPress::player_defaults();
        $theme = isset($attributes['theme']) ? trim((string) $attributes['theme']) : '';
        $color = isset($attributes['color']) ? trim((string) $attributes['color']) : '';

        return array(
            'theme' => '' === $theme ? $defaults['theme'] : Mave_WordPress::sanitize_player_theme($theme),
            'color' => '' === $color ? $defaults['color'] : Mave_WordPress::sanitize_player_color($color),
        );
    }
}
