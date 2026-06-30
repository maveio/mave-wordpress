<?php

if (!defined('ABSPATH')) {
    exit;
}

final class Mave_WordPress_JWT
{
    public static function sign_api_key($display_api_key, $subject, $max_age = 7200, $claims = array())
    {
        $display_api_key = Mave_WordPress::normalize_api_key($display_api_key);
        $subject = trim((string) $subject);
        $max_age = max(60, min(86400, (int) $max_age));

        if ('' === $display_api_key || '' === $subject) {
            return '';
        }

        $now = time();
        $payload = array_merge(
            is_array($claims) ? $claims : array(),
            array(
                'sub' => $subject,
                'iat' => $now,
                'exp' => $now + $max_age,
            )
        );

        $header = array('alg' => 'HS256', 'typ' => 'JWT');
        $signing_input = self::base64url(wp_json_encode($header)) . '.' . self::base64url(wp_json_encode($payload));
        $signature = hash_hmac('sha256', $signing_input, $display_api_key, true);

        return $signing_input . '.' . self::base64url($signature);
    }

    private static function base64url($value)
    {
        return rtrim(strtr(base64_encode((string) $value), '+/', '-_'), '=');
    }
}
