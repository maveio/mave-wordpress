<?php

if (!defined('ABSPATH')) {
    exit;
}

final class Mave_WordPress
{
    private static $instance = null;

    private $settings_page;
    private $rest;
    private $blocks;

    public static function instance()
    {
        if (null === self::$instance) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    public function init()
    {
        $this->settings_page = new Mave_WordPress_Settings();
        $this->rest = new Mave_WordPress_Rest();
        $this->blocks = new Mave_WordPress_Blocks();

        $this->settings_page->init();
        $this->rest->init();
        $this->blocks->init();
    }

    public static function default_settings()
    {
        return array(
            'api_key' => '',
            'upload_subject' => '',
            'player_theme' => 'default',
            'player_color' => '',
            'api_endpoint' => 'https://api.mave.io/api/v1',
            'components_src' => 'https://cdn.video-dns.com/npm/@maveio/components/+esm',
            'cdn_endpoint' => 'https://space-${this.spaceId}.video-dns.com',
            'socket_endpoint' => 'wss://dash.mave.io/api/v1/socket',
            'upload_endpoint' => 'https://upload.mave.io/files',
            'metrics_endpoint' => 'https://metrics.video-dns.com/v1/events',
        );
    }

    public static function player_themes()
    {
        return array(
            'default' => __('Default', 'mave-video'),
            'dolphin' => __('Dolphin', 'mave-video'),
            'synthwave' => __('Synthwave', 'mave-video'),
        );
    }

    public static function sanitize_player_theme($theme)
    {
        $theme = sanitize_key((string) $theme);
        $themes = self::player_themes();

        if (isset($themes[$theme])) {
            return $theme;
        }

        return 'default';
    }

    public static function sanitize_player_color($color)
    {
        return sanitize_text_field(trim((string) $color));
    }

    public static function player_defaults()
    {
        $settings = self::settings();

        return array(
            'theme' => self::sanitize_player_theme($settings['player_theme']),
            'color' => self::sanitize_player_color($settings['player_color']),
        );
    }

    public static function library_root_collection_id($settings = null)
    {
        $settings = is_array($settings) ? $settings : self::settings();
        $subject = isset($settings['upload_subject']) ? trim((string) $settings['upload_subject']) : '';

        if (strlen($subject) <= 5 || self::is_space_id($subject)) {
            return '';
        }

        return sanitize_text_field($subject);
    }

    public static function sanitize_upload_subject($subject)
    {
        $subject = sanitize_text_field(trim((string) $subject));

        // A five-character value is a public space hash, not an upload target
        // id. Leaving the field empty scopes uploads to the API key's space.
        if (5 === strlen($subject) && ctype_alpha($subject)) {
            return '';
        }

        return $subject;
    }

    private static function is_space_id($value)
    {
        $value = (string) $value;

        // Mave exposes database UUIDs as 22-character legacy ShortUUIDs. Keep
        // accepting canonical UUIDs too for installations that stored one.
        if (22 === strlen($value) && 1 === preg_match('/^[A-Za-z0-9]+$/', $value)) {
            return true;
        }

        return 1 === preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
            $value
        );
    }

    public static function endpoint_keys()
    {
        return array(
            'api_endpoint',
            'components_src',
            'cdn_endpoint',
            'socket_endpoint',
            'upload_endpoint',
            'metrics_endpoint',
        );
    }

    public static function settings()
    {
        $settings = get_option('mave_wordpress_settings', array());

        if (!is_array($settings)) {
            $settings = array();
        }

        return wp_parse_args($settings, self::default_settings());
    }

    public static function has_api_key()
    {
        $settings = self::settings();

        return !empty($settings['api_key']);
    }

    public static function normalize_api_key($api_key)
    {
        $api_key = trim((string) $api_key);

        if ('' === $api_key) {
            return '';
        }

        $decoded = base64_decode($api_key, true);

        if (false !== $decoded && false !== strpos($decoded, ':')) {
            return $api_key;
        }

        if (false !== strpos($api_key, ':')) {
            return base64_encode($api_key);
        }

        return $api_key;
    }

    public static function components_config()
    {
        $settings = self::settings();

        return array(
            'api' => array('endpoint' => $settings['api_endpoint']),
            'cdn' => array('endpoint' => $settings['cdn_endpoint']),
            'metrics' => array('endpoint' => $settings['metrics_endpoint']),
            'upload' => array(
                'endpoint' => $settings['upload_endpoint'],
                'socket' => $settings['socket_endpoint'],
            ),
        );
    }

    public static function editor_settings()
    {
        $settings = self::settings();

        return array(
            'restUrl' => esc_url_raw(rest_url('mave/v1')),
            'nonce' => wp_create_nonce('wp_rest'),
            'settingsUrl' => esc_url_raw(admin_url('options-general.php?page=mave-wordpress')),
            'hasApiKey' => self::has_api_key(),
            'componentsSrc' => $settings['components_src'],
            'componentsConfig' => self::components_config(),
            'playerDefaults' => self::player_defaults(),
            'libraryRootCollectionId' => self::library_root_collection_id($settings),
        );
    }

    public static function public_settings()
    {
        $settings = self::settings();

        return array(
            'componentsSrc' => $settings['components_src'],
            'componentsConfig' => self::components_config(),
            'playerDefaults' => self::player_defaults(),
        );
    }

    public static function space_hash_from_embed_id($embed_id)
    {
        $embed_id = trim((string) $embed_id);

        if (strlen($embed_id) <= 5) {
            return '';
        }

        return substr($embed_id, 0, 5);
    }

    public static function embed_hash_from_embed_id($embed_id)
    {
        $embed_id = trim((string) $embed_id);

        if (strlen($embed_id) <= 5) {
            return '';
        }

        return substr($embed_id, 5);
    }

    public static function thumbnail_url($embed_id)
    {
        $settings = self::settings();
        $space_hash = self::space_hash_from_embed_id($embed_id);
        $embed_hash = self::embed_hash_from_embed_id($embed_id);

        if ('' === $space_hash || '' === $embed_hash) {
            return '';
        }

        $base = str_replace(
            array('${this.spaceId}', '${spaceId}', '{spaceId}'),
            $space_hash,
            rtrim((string) $settings['cdn_endpoint'], '/')
        );

        if ('' === $base) {
            return '';
        }

        return trailingslashit($base) . rawurlencode($embed_hash) . '/thumbnail.jpg';
    }

    public static function player_style($embed_id, $aspect_ratio = '')
    {
        $poster_image = self::thumbnail_url($embed_id);
        $aspect_ratio = trim((string) $aspect_ratio);

        if ('' === $aspect_ratio) {
            $aspect_ratio = '16 / 9';
        }

        $style = 'display: block; width: 100%;';

        if ('' !== $poster_image) {
            $style .= ' background: center / contain no-repeat url(' . esc_url_raw($poster_image) . ');';
        }

        $style .= ' aspect-ratio: ' . sanitize_text_field($aspect_ratio) . ';';

        return $style;
    }

    private function __construct()
    {
    }
}
