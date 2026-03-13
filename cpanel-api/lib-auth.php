<?php

declare(strict_types=1);

const API_TOKEN_TTL_SECONDS = 1209600;

function api_issue_token(array $operator, array $config): string
{
    $payload = [
        'id' => $operator['id'],
        'email' => $operator['email'],
        'name' => $operator['full_name'],
        'exp' => time() + API_TOKEN_TTL_SECONDS,
    ];
    $encodedPayload = api_base64url_encode(json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    $signature = hash_hmac('sha256', $encodedPayload, $config['app_secret'], true);
    return $encodedPayload . '.' . api_base64url_encode($signature);
}

function api_verify_token(string $token, array $config): array
{
    [$payloadPart, $signaturePart] = array_pad(explode('.', $token, 2), 2, null);
    if (!$payloadPart || !$signaturePart) {
        throw new ApiException(401, "Token noto'g'ri");
    }

    $expected = hash_hmac('sha256', $payloadPart, $config['app_secret'], true);
    $actual = api_base64url_decode($signaturePart);
    if ($actual === '' || !hash_equals($expected, $actual)) {
        throw new ApiException(401, "Token noto'g'ri");
    }

    $payload = json_decode(api_base64url_decode($payloadPart), true);
    if (!is_array($payload) || empty($payload['id']) || empty($payload['exp'])) {
        throw new ApiException(401, "Token noto'g'ri");
    }
    if ((int) $payload['exp'] <= time()) {
        throw new ApiException(401, 'Sessiya muddati tugagan');
    }

    return $payload;
}

function api_hash_password_verify(string $password, string $storedHash): bool
{
    [$prefix, $iterationsValue, $saltValue, $hashValue] = array_pad(explode(':', $storedHash, 4), 4, null);
    if ($prefix !== 'pbkdf2_sha256' || !$iterationsValue || !$saltValue || !$hashValue) {
        return false;
    }

    $iterations = (int) $iterationsValue;
    $salt = api_base64url_decode($saltValue);
    $expected = api_base64url_decode($hashValue);
    if ($iterations <= 0 || $salt === '' || $expected === '') {
        return false;
    }

    $actual = hash_pbkdf2('sha256', $password, $salt, $iterations, strlen($expected), true);
    return hash_equals($expected, $actual);
}

function api_login_handler(array $config): array
{
    $body = api_request_json();
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    $password = (string) ($body['password'] ?? '');

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
        throw new ApiException(400, "Email yoki parol noto'g'ri");
    }

    $pdo = api_pdo($config);
    $operator = api_fetch_one(
        $pdo,
        'select id, full_name, email, password_hash, is_active from operators where email = :email limit 1',
        ['email' => $email]
    );

    if (!$operator || !api_boolean($operator['is_active']) || !api_hash_password_verify($password, $operator['password_hash'])) {
        throw new ApiException(401, "Email yoki parol noto'g'ri");
    }

    return [
        'operator' => [
            'id' => $operator['id'],
            'name' => $operator['full_name'],
            'email' => $operator['email'],
            'mode' => 'database',
        ],
        'token' => api_issue_token($operator, $config),
    ];
}

function api_require_operator(array $config): array
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/Bearer\s+(.+)/i', $header, $matches)) {
        throw new ApiException(401, 'Avval tizimga kiring');
    }

    $payload = api_verify_token($matches[1], $config);
    $pdo = api_pdo($config);
    $operator = api_fetch_one(
        $pdo,
        'select id, full_name, email, is_active from operators where id = :id limit 1',
        ['id' => $payload['id']]
    );

    if (!$operator || !api_boolean($operator['is_active'])) {
        throw new ApiException(401, 'Operator topilmadi');
    }

    return [
        'id' => $operator['id'],
        'name' => $operator['full_name'],
        'email' => $operator['email'],
        'mode' => 'database',
    ];
}
