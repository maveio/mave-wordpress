<?php

if (!defined('ABSPATH')) {
    exit;
}

final class Mave_WordPress_Rest
{
    public function init()
    {
        add_action('rest_api_init', array($this, 'register_routes'));
    }

    public function register_routes()
    {
        register_rest_route('mave/v1', '/videos', array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => array($this, 'list_videos'),
            'permission_callback' => array($this, 'can_edit_posts'),
            'args' => array(
                'page' => array('sanitize_callback' => 'absint'),
                'per_page' => array('sanitize_callback' => 'absint'),
                'show_collections' => array('sanitize_callback' => 'sanitize_text_field'),
                'uploaded' => array('sanitize_callback' => 'sanitize_text_field'),
                'archived' => array('sanitize_callback' => 'sanitize_text_field'),
                'collection' => array('sanitize_callback' => 'sanitize_text_field'),
            ),
        ));

        register_rest_route('mave/v1', '/upload-token', array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => array($this, 'create_upload_token'),
            'permission_callback' => array($this, 'can_edit_posts'),
            'args' => array(
                'subject' => array('sanitize_callback' => 'sanitize_text_field'),
                'collection' => array('sanitize_callback' => 'sanitize_text_field'),
                'target' => array('sanitize_callback' => 'sanitize_text_field'),
                'max_age' => array('sanitize_callback' => 'absint'),
            ),
        ));
    }

    public function can_edit_posts()
    {
        return current_user_can('edit_posts');
    }

    public function list_videos(WP_REST_Request $request)
    {
        $params = array(
            'page' => max(1, (int) $request->get_param('page')),
            'per_page' => max(1, min(100, (int) ($request->get_param('per_page') ?: 100))),
            'show_collections' => $request->get_param('show_collections') ?: 'true',
        );

        foreach (array('uploaded', 'archived', 'collection') as $key) {
            $value = $request->get_param($key);
            if (null !== $value && '' !== $value) {
                $params[$key] = $value;
            }
        }

        $response = (new Mave_WordPress_Api_Client())->list_videos($params);

        if (is_wp_error($response)) {
            return $response;
        }

        return rest_ensure_response($response);
    }

    public function create_upload_token(WP_REST_Request $request)
    {
        $settings = Mave_WordPress::settings();
        $api_key = Mave_WordPress::normalize_api_key($settings['api_key']);

        if ('' === $api_key) {
            return new WP_Error(
                'mave_missing_api_key',
                __('Mave API key is not configured.', 'mave-video'),
                array('status' => 400)
            );
        }

        $subject = trim((string) $request->get_param('subject'));

        if ('' === $subject) {
            $subject = trim((string) $request->get_param('collection'));
        }

        if ('' === $subject) {
            $subject = trim((string) $request->get_param('target'));
        }

        if ('' === $subject && !empty($settings['upload_subject'])) {
            $subject = trim((string) $settings['upload_subject']);
        }

        if ('' === $subject) {
            $subject = (new Mave_WordPress_Api_Client($settings))->discover_upload_subject();

            if (is_wp_error($subject)) {
                return $subject;
            }
        }

        $token = Mave_WordPress_JWT::sign_api_key(
            $api_key,
            $subject,
            $request->get_param('max_age') ?: 7200
        );

        return rest_ensure_response(array(
            'token' => $token,
            'subject' => $subject,
        ));
    }
}
