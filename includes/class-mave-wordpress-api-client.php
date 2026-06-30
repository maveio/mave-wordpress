<?php

if (!defined('ABSPATH')) {
    exit;
}

final class Mave_WordPress_Api_Client
{
    private $settings;

    public function __construct($settings = null)
    {
        $this->settings = is_array($settings) ? $settings : Mave_WordPress::settings();
    }

    public function list_videos($params = array())
    {
        $params = wp_parse_args($params, array(
            'show_collections' => 'true',
            'per_page' => 100,
            'page' => 1,
        ));

        return $this->request('GET', '/videos', null, $params);
    }

    public function discover_upload_subject()
    {
        $response = $this->list_videos(array(
            'show_collections' => 'true',
            'per_page' => 1,
            'page' => 1,
            'archived' => 'false',
        ));

        if (is_wp_error($response)) {
            return $response;
        }

        $items = isset($response['data']) && is_array($response['data']) ? $response['data'] : array();

        foreach ($items as $item) {
            if (empty($item['id'])) {
                continue;
            }

            $space_hash = Mave_WordPress::space_hash_from_embed_id($item['id']);

            if ('' !== $space_hash) {
                return $space_hash;
            }
        }

        return new WP_Error(
            'mave_missing_upload_subject',
            __('Could not infer the Mave space for uploads. Set an upload target in Mave settings.', 'mave-video'),
            array('status' => 400)
        );
    }

    public function request($method, $path, $body = null, $query = array())
    {
        $api_key = Mave_WordPress::normalize_api_key($this->settings['api_key']);

        if ('' === $api_key) {
            return new WP_Error(
                'mave_missing_api_key',
                __('Mave API key is not configured.', 'mave-video'),
                array('status' => 400)
            );
        }

        $url = trailingslashit(rtrim($this->settings['api_endpoint'], '/')) . ltrim($path, '/');

        if (!empty($query)) {
            $url = add_query_arg($query, $url);
        }

        $args = array(
            'method' => strtoupper($method),
            'timeout' => 20,
            'headers' => array(
                'Accept' => 'application/json',
                'Authorization' => 'Bearer ' . $api_key,
            ),
        );

        if (null !== $body) {
            $args['headers']['Content-Type'] = 'application/json';
            $args['body'] = wp_json_encode($body);
        }

        $response = wp_remote_request($url, $args);

        if (is_wp_error($response)) {
            return $response;
        }

        $status = (int) wp_remote_retrieve_response_code($response);
        $raw_body = (string) wp_remote_retrieve_body($response);
        $decoded = json_decode($raw_body, true);

        if ($status < 200 || $status >= 300) {
            $message = __('Mave API request failed.', 'mave-video');

            if (is_array($decoded) && !empty($decoded['error'])) {
                $message = sanitize_text_field($decoded['error']);
            }

            return new WP_Error(
                'mave_api_error',
                $message,
                array(
                    'status' => $status,
                    'response' => is_array($decoded) ? $decoded : null,
                )
            );
        }

        if (is_array($decoded)) {
            return $decoded;
        }

        return array();
    }
}
