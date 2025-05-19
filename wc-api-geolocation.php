<?php
/**
 * MaxMind Geolocation Integration for WooCommerce REST API
 * 
 * Instructions:
 * 1. Upload this file to your WordPress installation
 * 2. Include it in your functions.php or use a custom plugin
 * 3. This will create a REST API endpoint at /wp-json/api/geolocation
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

add_action('rest_api_init', 'register_geolocation_endpoint');

function register_geolocation_endpoint() {
    register_rest_route('api', '/geolocation', [
        'methods' => 'GET',
        'callback' => 'get_user_geolocation',
        'permission_callback' => '__return_true',
    ]);
}

function get_user_geolocation() {
    // MaxMind credentials
    $account_id = '1151868';
    $license_key = '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';
    
    // Get client IP
    $ip = get_client_ip();
    
    // If WooCommerce is active, try to use its geolocation first
    if (function_exists('WC')) {
        $wc_geo = WC_Geolocation::geolocate_ip($ip);
        if (!empty($wc_geo['country'])) {
            $response = [
                'country_code' => $wc_geo['country'],
                'country_name' => WC()->countries->countries[$wc_geo['country']] ?? '',
                'source' => 'woocommerce'
            ];
            return new WP_REST_Response($response, 200);
        }
    }
    
    // Call MaxMind API
    $url = "https://geolite.info/geoip/v2.1/country/{$ip}";
    $args = [
        'headers' => [
            'Authorization' => 'Basic ' . base64_encode("{$account_id}:{$license_key}")
        ]
    ];
    
    $response = wp_remote_get($url, $args);
    
    if (is_wp_error($response)) {
        return new WP_REST_Response([
            'error' => $response->get_error_message(),
            'ip' => $ip
        ], 500);
    }
    
    $body = json_decode(wp_remote_retrieve_body($response), true);
    
    if (isset($body['country'])) {
        $result = [
            'country_code' => $body['country']['iso_code'],
            'country_name' => $body['country']['names']['en'],
            'source' => 'maxmind',
            'ip' => $ip
        ];
        
        if (isset($body['city']['names']['en'])) {
            $result['city'] = $body['city']['names']['en'];
        }
        
        if (isset($body['subdivisions'][0]['names']['en'])) {
            $result['region'] = $body['subdivisions'][0]['names']['en'];
        }
        
        return new WP_REST_Response($result, 200);
    }
    
    // Fallback response
    return new WP_REST_Response([
        'country_code' => 'AE', // Default to UAE if geolocation fails
        'country_name' => 'United Arab Emirates',
        'source' => 'default',
        'ip' => $ip
    ], 200);
}

function get_client_ip() {
    $ipaddress = '';
    
    if (isset($_SERVER['HTTP_CLIENT_IP']))
        $ipaddress = $_SERVER['HTTP_CLIENT_IP'];
    else if(isset($_SERVER['HTTP_X_FORWARDED_FOR']))
        $ipaddress = $_SERVER['HTTP_X_FORWARDED_FOR'];
    else if(isset($_SERVER['HTTP_X_FORWARDED']))
        $ipaddress = $_SERVER['HTTP_X_FORWARDED'];
    else if(isset($_SERVER['HTTP_FORWARDED_FOR']))
        $ipaddress = $_SERVER['HTTP_FORWARDED_FOR'];
    else if(isset($_SERVER['HTTP_FORWARDED']))
        $ipaddress = $_SERVER['HTTP_FORWARDED'];
    else if(isset($_SERVER['REMOTE_ADDR']))
        $ipaddress = $_SERVER['REMOTE_ADDR'];
    else
        $ipaddress = '127.0.0.1';
        
    // If we got multiple IPs (from proxies), take the first one
    if (strpos($ipaddress, ',') !== false) {
        $ipaddress = explode(',', $ipaddress)[0];
    }
    
    return $ipaddress;
} 