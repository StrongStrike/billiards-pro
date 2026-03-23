<?php

declare(strict_types=1);

const API_DEFAULT_TIMEZONE = 'Asia/Tashkent';

final class ApiException extends RuntimeException
{
    public function __construct(public readonly int $status, string $message)
    {
        parent::__construct($message, $status);
    }
}

function api_load_config(): array
{
    $base = require __DIR__ . '/config.example.php';
    $localPath = __DIR__ . '/config.local.php';
    if (file_exists($localPath)) {
        $local = require $localPath;
        if (is_array($local)) {
            $base = array_replace_recursive($base, $local);
        }
    }

    if (empty($base['app_secret']) || empty($base['db']['password'])) {
        throw new ApiException(500, 'Backend konfiguratsiyasi tugallanmagan');
    }

    return $base;
}

function api_apply_cors(array $config): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Vary: Origin');

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && api_origin_allowed($origin, $config['allowed_origins'] ?? [])) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
    }
}

function api_origin_allowed(string $origin, array $patterns): bool
{
    foreach ($patterns as $pattern) {
        if ($pattern === '*' || $origin === $pattern) {
            return true;
        }
        if (str_contains($pattern, '*')) {
            $regex = '#^' . str_replace('\*', '[^.]+', preg_quote($pattern, '#')) . '$#';
            if (preg_match($regex, $origin)) {
                return true;
            }
        }
    }

    return false;
}

function api_json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function api_route(): string
{
    $uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');

    if ($scriptDir !== '' && $scriptDir !== '/' && str_starts_with($uriPath, $scriptDir)) {
        $uriPath = substr($uriPath, strlen($scriptDir));
    }

    $route = '/' . trim($uriPath, '/');
    return $route === '//' ? '/' : $route;
}

function api_request_json(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        throw new ApiException(400, "JSON noto'g'ri");
    }

    return $decoded;
}

function api_pdo(array $config): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $db = $config['db'];
    $dsn = sprintf(
        'pgsql:host=%s;port=%d;dbname=%s;sslmode=%s',
        $db['host'],
        (int) $db['port'],
        $db['name'],
        $db['sslmode'] ?? 'disable'
    );

    $pdo = new PDO($dsn, $db['user'], $db['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec("SET TIME ZONE 'UTC'");

    return $pdo;
}

function api_fetch_all(PDO $pdo, string $sql, array $params = []): array
{
    $statement = $pdo->prepare($sql);
    $statement->execute($params);
    return $statement->fetchAll();
}

function api_fetch_one(PDO $pdo, string $sql, array $params = []): ?array
{
    $statement = $pdo->prepare($sql);
    $statement->execute($params);
    $row = $statement->fetch();
    return $row === false ? null : $row;
}

function api_execute(PDO $pdo, string $sql, array $params = []): void
{
    $statement = $pdo->prepare($sql);
    $statement->execute($params);
}

function api_iso(?string $value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }

    return (new DateTimeImmutable($value))->setTimezone(new DateTimeZone('UTC'))->format(DATE_ATOM);
}

function api_boolean(mixed $value): bool
{
    return filter_var($value, FILTER_VALIDATE_BOOL);
}

function api_create_id(string $prefix): string
{
    return $prefix . '-' . bin2hex(random_bytes(4));
}

function api_base64url_encode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function api_base64url_decode(string $value): string
{
    $padding = strlen($value) % 4;
    if ($padding > 0) {
        $value .= str_repeat('=', 4 - $padding);
    }
    return base64_decode(strtr($value, '-_', '+/')) ?: '';
}

function api_timezone_name(?string $timezone): string
{
    $resolved = trim((string) $timezone);
    if ($resolved === '') {
        return API_DEFAULT_TIMEZONE;
    }

    try {
        new DateTimeZone($resolved);
        return $resolved;
    } catch (Throwable) {
        return API_DEFAULT_TIMEZONE;
    }
}

function api_parse_time(string $value): DateTimeImmutable
{
    return new DateTimeImmutable($value);
}

function api_difference_minutes(string $startIso, string $endIso): int
{
    $diff = (int) floor((api_parse_time($endIso)->getTimestamp() - api_parse_time($startIso)->getTimestamp()) / 60);
    return max($diff, 0);
}

function api_session_end(array $session, ?string $fallbackIso = null): string
{
    return $session['endedAt'] ?? $fallbackIso ?? gmdate(DATE_ATOM);
}

function api_session_overlap_minutes(array $session, DateTimeImmutable $start, DateTimeImmutable $endExclusive, ?string $fallbackIso = null): int
{
    $sessionStart = api_parse_time($session['startedAt'])->getTimestamp();
    $sessionEnd = api_parse_time(api_session_end($session, $fallbackIso))->getTimestamp();
    $overlapStart = max($sessionStart, $start->getTimestamp());
    $overlapEnd = min($sessionEnd, $endExclusive->getTimestamp());

    if ($overlapEnd <= $overlapStart) {
        return 0;
    }

    return (int) floor(($overlapEnd - $overlapStart) / 60);
}

function api_calculate_game_charge(array $session, ?string $endIso = null): int
{
    $durationMinutes = api_difference_minutes($session['startedAt'], $session['endedAt'] ?? ($endIso ?? gmdate(DATE_ATOM)));
    return (int) round(($session['hourlyRateSnapshot'] * $durationMinutes) / 60);
}

function api_calculate_order_items_total(array $items): int
{
    $sum = 0;
    foreach ($items as $item) {
        $sum += ((int) $item['unitPrice']) * ((int) $item['quantity']);
    }
    return $sum;
}

function api_calculate_order_total(string $orderId, array $orderItems): int
{
    return api_calculate_order_items_total(array_values(array_filter(
        $orderItems,
        static fn (array $item): bool => $item['orderId'] === $orderId
    )));
}

function api_aggregate_quantities_by_product(array $items): array
{
    $result = [];
    foreach ($items as $item) {
        $productId = $item['productId'];
        $result[$productId] = ($result[$productId] ?? 0) + (int) $item['quantity'];
    }
    return $result;
}

function api_get_reserved_stock(string $productId, array $orders, array $orderItems, array $excludeOrderIds = []): int
{
    $confirmedOrderIds = [];
    foreach ($orders as $order) {
        if ($order['status'] === 'confirmed' && $order['mode'] === 'table' && !in_array($order['id'], $excludeOrderIds, true)) {
            $confirmedOrderIds[$order['id']] = true;
        }
    }

    $reserved = 0;
    foreach ($orderItems as $item) {
        if ($item['productId'] === $productId && isset($confirmedOrderIds[$item['orderId']])) {
            $reserved += (int) $item['quantity'];
        }
    }
    return $reserved;
}

function api_has_reservation_overlap(array $reservations, array $candidate, ?string $ignoreReservationId = null): bool
{
    if (($candidate['status'] ?? 'scheduled') === 'cancelled') {
        return false;
    }

    $candidateStart = api_parse_time($candidate['startAt'])->getTimestamp();
    $candidateEnd = api_parse_time($candidate['endAt'])->getTimestamp();

    foreach ($reservations as $reservation) {
        if ($ignoreReservationId && $reservation['id'] === $ignoreReservationId) {
            continue;
        }
        if ($reservation['tableId'] !== $candidate['tableId'] || $reservation['status'] === 'cancelled') {
            continue;
        }

        $reservationStart = api_parse_time($reservation['startAt'])->getTimestamp();
        $reservationEnd = api_parse_time($reservation['endAt'])->getTimestamp();
        if ($candidateStart < $reservationEnd && $candidateEnd > $reservationStart) {
            return true;
        }
    }

    return false;
}

function api_assert_reservation_times(string $startAt, string $endAt): void
{
    if (api_parse_time($endAt)->getTimestamp() <= api_parse_time($startAt)->getTimestamp()) {
        throw new ApiException(400, "Bron yakun vaqti boshlanishdan keyin bo'lishi kerak");
    }
}

function api_ensure_stock_availability(array $items, array $products, array $orders, array $orderItems, array $excludeOrderIds = []): void
{
    foreach ($items as $item) {
        $product = null;
        foreach ($products as $candidate) {
            if ($candidate['id'] === $item['productId']) {
                $product = $candidate;
                break;
            }
        }
        if (!$product) {
            throw new ApiException(400, 'Mahsulot topilmadi');
        }

        $reserved = api_get_reserved_stock($product['id'], $orders, $orderItems, $excludeOrderIds);
        $available = $product['stock'] - $reserved;
        if ($available < (int) $item['quantity']) {
            throw new ApiException(400, $product['name'] . " uchun yetarli qoldiq yo'q");
        }
    }
}

function api_fetch_orders_and_items(PDO $pdo): array
{
    return [
        'orders' => array_map('api_map_order', api_fetch_all($pdo, 'select * from orders')),
        'orderItems' => array_map('api_map_order_item', api_fetch_all($pdo, 'select * from order_items')),
    ];
}

function api_get_session_bill_adjustments(string $sessionId, array $billAdjustments): array
{
    return array_values(array_filter(
        $billAdjustments,
        static fn (array $adjustment): bool => $adjustment['sessionId'] === $sessionId
    ));
}

function api_summarize_bill_adjustments(array $adjustments): array
{
    $summary = ['adjustmentAmount' => 0];

    foreach ($adjustments as $adjustment) {
        $amount = (int) ($adjustment['amount'] ?? 0);
        if ($adjustment['type'] === 'manual_charge') {
            $summary['adjustmentAmount'] += $amount;
        }
    }

    return $summary;
}

function api_calculate_session_summary(array $session, int $orderTotal, array $billAdjustments, ?string $endIso = null): array
{
    $durationMinutes = api_difference_minutes($session['startedAt'], $session['endedAt'] ?? ($endIso ?? gmdate(DATE_ATOM)));
    $adjustmentSummary = api_summarize_bill_adjustments($billAdjustments);
    $baseGameCharge = api_calculate_game_charge($session, $endIso);
    $gameCharge = api_calculate_game_charge($session, $endIso);
    $total = max($gameCharge + $orderTotal + (int) $adjustmentSummary['adjustmentAmount'], 0);

    return [
        'baseGameCharge' => $baseGameCharge,
        'gameCharge' => $gameCharge,
        'orderTotal' => $orderTotal,
        'adjustmentAmount' => (int) $adjustmentSummary['adjustmentAmount'],
        'total' => $total,
        'durationMinutes' => $durationMinutes,
    ];
}
