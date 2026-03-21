<?php

declare(strict_types=1);

function api_month_label(int $month): string
{
    $labels = [1 => 'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    return $labels[$month] ?? (string) $month;
}

function api_get_report_window(string $range, string $timezone, ?DateTimeImmutable $now = null): array
{
    $zone = new DateTimeZone(api_timezone_name($timezone));
    $clock = ($now ?? new DateTimeImmutable('now', new DateTimeZone('UTC')))->setTimezone($zone);

    if ($range === 'week') {
        $weekday = (int) $clock->format('N');
        $zonedStart = $clock->modify('-' . ($weekday - 1) . ' days')->setTime(0, 0);
        $zonedEndExclusive = $zonedStart->modify('+7 days');
        return [
            'range' => $range,
            'label' => 'Haftalik hisobot',
            'timezone' => $zone->getName(),
            'zonedStart' => $zonedStart,
            'zonedEndExclusive' => $zonedEndExclusive,
            'start' => $zonedStart->setTimezone(new DateTimeZone('UTC')),
            'endExclusive' => $zonedEndExclusive->setTimezone(new DateTimeZone('UTC')),
        ];
    }

    if ($range === 'month') {
        $zonedStart = $clock->modify('first day of this month')->setTime(0, 0);
        $zonedEndExclusive = $zonedStart->modify('+1 month');
        return [
            'range' => $range,
            'label' => 'Oylik hisobot',
            'timezone' => $zone->getName(),
            'zonedStart' => $zonedStart,
            'zonedEndExclusive' => $zonedEndExclusive,
            'start' => $zonedStart->setTimezone(new DateTimeZone('UTC')),
            'endExclusive' => $zonedEndExclusive->setTimezone(new DateTimeZone('UTC')),
        ];
    }

    if ($range === 'year') {
        $zonedStart = $clock->setDate((int) $clock->format('Y'), 1, 1)->setTime(0, 0);
        $zonedEndExclusive = $zonedStart->modify('+1 year');
        return [
            'range' => $range,
            'label' => 'Yillik hisobot',
            'timezone' => $zone->getName(),
            'zonedStart' => $zonedStart,
            'zonedEndExclusive' => $zonedEndExclusive,
            'start' => $zonedStart->setTimezone(new DateTimeZone('UTC')),
            'endExclusive' => $zonedEndExclusive->setTimezone(new DateTimeZone('UTC')),
        ];
    }

    $zonedStart = $clock->setTime(0, 0);
    $zonedEndExclusive = $zonedStart->modify('+1 day');
    return [
        'range' => $range,
        'label' => 'Kunlik hisobot',
        'timezone' => $zone->getName(),
        'zonedStart' => $zonedStart,
        'zonedEndExclusive' => $zonedEndExclusive,
        'start' => $zonedStart->setTimezone(new DateTimeZone('UTC')),
        'endExclusive' => $zonedEndExclusive->setTimezone(new DateTimeZone('UTC')),
    ];
}

function api_get_dashboard_buckets(string $timezone, ?DateTimeImmutable $now = null): array
{
    $zone = new DateTimeZone(api_timezone_name($timezone));
    $clock = ($now ?? new DateTimeImmutable('now', new DateTimeZone('UTC')))->setTimezone($zone);
    $zonedEnd = $clock->setTime((int) $clock->format('H'), 0);
    if ((int) $clock->format('i') > 0 || (int) $clock->format('s') > 0) {
        $zonedEnd = $zonedEnd->modify('+1 hour');
    }

    $buckets = [];
    for ($index = 0; $index < 6; $index++) {
        $zonedStart = $zonedEnd->modify((string) (($index - 6) * 2) . ' hours');
        $zonedEndExclusive = $zonedStart->modify('+2 hours');
        $buckets[] = [
            'label' => $zonedStart->format('H:i'),
            'start' => $zonedStart->setTimezone(new DateTimeZone('UTC')),
            'endExclusive' => $zonedEndExclusive->setTimezone(new DateTimeZone('UTC')),
            'durationMinutes' => (int) (($zonedEndExclusive->getTimestamp() - $zonedStart->getTimestamp()) / 60),
        ];
    }

    return $buckets;
}

function api_get_report_chart_buckets(string $range, string $timezone, ?DateTimeImmutable $now = null): array
{
    $window = api_get_report_window($range, $timezone, $now);
    $buckets = [];

    if ($range === 'year') {
        for ($index = 0; $index < 12; $index++) {
            $zonedStart = $window['zonedStart']->modify('+' . $index . ' month');
            $zonedEndExclusive = $zonedStart->modify('+1 month');
            $buckets[] = [
                'label' => api_month_label((int) $zonedStart->format('n')),
                'start' => $zonedStart->setTimezone(new DateTimeZone('UTC')),
                'endExclusive' => $zonedEndExclusive->setTimezone(new DateTimeZone('UTC')),
                'durationMinutes' => (int) (($zonedEndExclusive->getTimestamp() - $zonedStart->getTimestamp()) / 60),
            ];
        }
        return $buckets;
    }

    if ($range === 'week') {
        for ($index = 0; $index < 7; $index++) {
            $zonedStart = $window['zonedStart']->modify('+' . $index . ' day');
            $zonedEndExclusive = $zonedStart->modify('+1 day');
            $buckets[] = [
                'label' => $zonedStart->format('d') . ' ' . api_month_label((int) $zonedStart->format('n')),
                'start' => $zonedStart->setTimezone(new DateTimeZone('UTC')),
                'endExclusive' => $zonedEndExclusive->setTimezone(new DateTimeZone('UTC')),
                'durationMinutes' => 1440,
            ];
        }
        return $buckets;
    }

    if ($range === 'month') {
        $current = $window['zonedStart'];
        while ($current < $window['zonedEndExclusive']) {
            $next = $current->modify('+1 day');
            $buckets[] = [
                'label' => $current->format('d') . ' ' . api_month_label((int) $current->format('n')),
                'start' => $current->setTimezone(new DateTimeZone('UTC')),
                'endExclusive' => $next->setTimezone(new DateTimeZone('UTC')),
                'durationMinutes' => 1440,
            ];
            $current = $next;
        }
        return $buckets;
    }

    for ($index = 0; $index < 24; $index++) {
        $zonedStart = $window['zonedStart']->modify('+' . $index . ' hour');
        $zonedEndExclusive = $zonedStart->modify('+1 hour');
        $buckets[] = [
            'label' => $zonedStart->format('H:i'),
            'start' => $zonedStart->setTimezone(new DateTimeZone('UTC')),
            'endExclusive' => $zonedEndExclusive->setTimezone(new DateTimeZone('UTC')),
            'durationMinutes' => 60,
        ];
    }

    return $buckets;
}

function api_is_same_zoned_day(string $leftIso, DateTimeImmutable $right, string $timezone): bool
{
    $zone = new DateTimeZone(api_timezone_name($timezone));
    return api_parse_time($leftIso)->setTimezone($zone)->format('Y-m-d') === $right->setTimezone($zone)->format('Y-m-d');
}

function api_get_dashboard_activity(array $config): array
{
    $state = api_load_state($config);
    $buckets = api_get_dashboard_buckets($state['settings']['timezone']);
    $tables = array_values(array_filter($state['tables'], static fn (array $table): bool => $table['isActive']));

    $points = [];
    foreach ($buckets as $bucket) {
        $bucketSessions = array_values(array_filter($state['sessions'], static function (array $session) use ($bucket): bool {
            $sessionEnd = api_parse_time(api_session_end($session, $bucket['endExclusive']->format(DATE_ATOM)))->getTimestamp();
            return api_parse_time($session['startedAt'])->getTimestamp() < $bucket['endExclusive']->getTimestamp()
                && $sessionEnd > $bucket['start']->getTimestamp();
        }));

        $sessionMinutes = 0;
        foreach ($bucketSessions as $session) {
            $sessionMinutes += api_session_overlap_minutes($session, $bucket['start'], $bucket['endExclusive'], $bucket['endExclusive']->format(DATE_ATOM));
        }

        $completedSessionRevenue = 0;
        foreach ($state['sessions'] as $session) {
            if (
                $session['status'] === 'completed'
                && $session['endedAt']
                && api_parse_time($session['endedAt'])->getTimestamp() >= $bucket['start']->getTimestamp()
                && api_parse_time($session['endedAt'])->getTimestamp() < $bucket['endExclusive']->getTimestamp()
            ) {
                $completedSessionRevenue += api_calculate_session_summary(
                    $session,
                    0,
                    api_get_session_bill_adjustments($session['id'], $state['billAdjustments']),
                    $session['endedAt']
                )['gameCharge'] + api_summarize_bill_adjustments(api_get_session_bill_adjustments($session['id'], $state['billAdjustments']))['adjustmentAmount'];
            }
        }

        $paidOrderIds = [];
        foreach ($state['orders'] as $order) {
            $stamp = $order['paidAt'] ?? $order['createdAt'];
            if (
                $order['status'] === 'paid'
                && api_parse_time($stamp)->getTimestamp() >= $bucket['start']->getTimestamp()
                && api_parse_time($stamp)->getTimestamp() < $bucket['endExclusive']->getTimestamp()
            ) {
                $paidOrderIds[] = $order['id'];
            }
        }

        $paidRevenue = api_calculate_order_items_total(array_values(array_filter(
            $state['orderItems'],
            static fn (array $item): bool => in_array($item['orderId'], $paidOrderIds, true)
        )));

        $points[] = [
            'label' => $bucket['label'],
            'occupancy' => count($tables) > 0 && $bucket['durationMinutes'] > 0
                ? min(100, (int) round(($sessionMinutes / (count($tables) * $bucket['durationMinutes'])) * 100))
                : 0,
            'revenue' => $completedSessionRevenue + $paidRevenue,
        ];
    }

    return $points;
}

function api_build_report(array $config, string $range): array
{
    $state = api_load_state($config);
    $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $window = api_get_report_window($range, $state['settings']['timezone'], $now);

    $relevantSessions = array_values(array_filter($state['sessions'], static function (array $session) use ($window): bool {
        return $session['status'] === 'completed'
            && $session['endedAt']
            && api_parse_time($session['endedAt'])->getTimestamp() >= $window['start']->getTimestamp()
            && api_parse_time($session['endedAt'])->getTimestamp() < $window['endExclusive']->getTimestamp();
    }));

    $relevantOrders = array_values(array_filter($state['orders'], static function (array $order) use ($window): bool {
        $stamp = $order['paidAt'] ?? $order['createdAt'];
        return $order['status'] === 'paid'
            && api_parse_time($stamp)->getTimestamp() >= $window['start']->getTimestamp()
            && api_parse_time($stamp)->getTimestamp() < $window['endExclusive']->getTimestamp();
    }));
    $relevantOrderIds = array_column($relevantOrders, 'id');
    $relevantItems = array_values(array_filter(
        $state['orderItems'],
        static fn (array $item): bool => in_array($item['orderId'], $relevantOrderIds, true)
    ));

    $adjustmentsTotal = 0;
    $gameRevenue = 0;
    foreach ($relevantSessions as $session) {
        $sessionAdjustments = api_get_session_bill_adjustments($session['id'], $state['billAdjustments']);
        $adjustmentsTotal += api_summarize_bill_adjustments($sessionAdjustments)['adjustmentAmount'];
        $gameRevenue += api_calculate_session_summary($session, 0, $sessionAdjustments, $session['endedAt'])['gameCharge'];
    }
    $barRevenue = api_calculate_order_items_total($relevantItems);

    $playMinutes = 0;
    foreach ($state['sessions'] as $session) {
        $playMinutes += api_session_overlap_minutes($session, $window['start'], $window['endExclusive'], $now->format(DATE_ATOM));
    }

    $activeTablesCount = count(array_filter($state['tables'], static fn (array $table): bool => $table['isActive']));
    $totalAvailableMinutes = $activeTablesCount * max((int) (($window['endExclusive']->getTimestamp() - $window['start']->getTimestamp()) / 60), 0);
    $occupancyRate = $totalAvailableMinutes > 0 ? (int) round(($playMinutes / $totalAvailableMinutes) * 100) : 0;

    $topTables = [];
    foreach ($state['tables'] as $table) {
        $tableSessions = array_values(array_filter(
            $relevantSessions,
            static fn (array $session): bool => $session['tableId'] === $table['id']
        ));
        $revenue = 0;
        $minutes = 0;
        foreach ($tableSessions as $session) {
            $sessionOrderIds = [];
            foreach ($relevantOrders as $order) {
                if (($order['sessionId'] ?? null) === $session['id']) {
                    $sessionOrderIds[] = $order['id'];
                }
            }
            $sessionItems = array_values(array_filter(
                $relevantItems,
                static fn (array $item): bool => in_array($item['orderId'], $sessionOrderIds, true)
            ));
            $revenue += api_calculate_session_summary(
                $session,
                api_calculate_order_items_total($sessionItems),
                api_get_session_bill_adjustments($session['id'], $state['billAdjustments']),
                $session['endedAt']
            )['total'];
            $minutes += api_difference_minutes($session['startedAt'], (string) $session['endedAt']);
        }
        if ($revenue > 0 || $minutes > 0) {
            $topTables[] = [
                'tableId' => $table['id'],
                'tableName' => $table['name'],
                'revenue' => $revenue,
                'minutes' => $minutes,
            ];
        }
    }
    usort($topTables, static fn (array $left, array $right): int => $right['revenue'] <=> $left['revenue']);
    $topTables = array_slice($topTables, 0, 5);

    $topProducts = [];
    foreach ($state['products'] as $product) {
        $productItems = array_values(array_filter(
            $relevantItems,
            static fn (array $item): bool => $item['productId'] === $product['id']
        ));
        $quantity = 0;
        foreach ($productItems as $item) {
            $quantity += (int) $item['quantity'];
        }
        if ($quantity > 0) {
            $topProducts[] = [
                'productId' => $product['id'],
                'productName' => $product['name'],
                'revenue' => api_calculate_order_items_total($productItems),
                'quantity' => $quantity,
            ];
        }
    }
    usort($topProducts, static fn (array $left, array $right): int => $right['revenue'] <=> $left['revenue']);
    $topProducts = array_slice($topProducts, 0, 5);

    $chart = [];
    foreach (api_get_report_chart_buckets($range, $state['settings']['timezone'], $now) as $bucket) {
        $bucketSessions = array_values(array_filter($state['sessions'], static function (array $session) use ($bucket): bool {
            return $session['status'] === 'completed'
                && $session['endedAt']
                && api_parse_time($session['endedAt'])->getTimestamp() >= $bucket['start']->getTimestamp()
                && api_parse_time($session['endedAt'])->getTimestamp() < $bucket['endExclusive']->getTimestamp();
        }));

        $bucketOrders = array_values(array_filter($relevantOrders, static function (array $order) use ($bucket): bool {
            $stamp = $order['paidAt'] ?? $order['createdAt'];
            return api_parse_time($stamp)->getTimestamp() >= $bucket['start']->getTimestamp()
                && api_parse_time($stamp)->getTimestamp() < $bucket['endExclusive']->getTimestamp();
        }));
        $bucketOrderIds = array_column($bucketOrders, 'id');

        $occupiedMinutes = 0;
        foreach ($state['sessions'] as $session) {
            $occupiedMinutes += api_session_overlap_minutes($session, $bucket['start'], $bucket['endExclusive'], $now->format(DATE_ATOM));
        }

        $revenue = 0;
        foreach ($bucketSessions as $session) {
            $sessionOrderIds = [];
            foreach ($bucketOrders as $order) {
                if (($order['sessionId'] ?? null) === $session['id']) {
                    $sessionOrderIds[] = $order['id'];
                }
            }
            $sessionItems = array_values(array_filter(
                $state['orderItems'],
                static fn (array $item): bool => in_array($item['orderId'], $sessionOrderIds, true)
            ));
            $revenue += api_calculate_session_summary(
                $session,
                api_calculate_order_items_total($sessionItems),
                api_get_session_bill_adjustments($session['id'], $state['billAdjustments']),
                $session['endedAt']
            )['total'];
        }
        $revenue += api_calculate_order_items_total(array_values(array_filter(
            $state['orderItems'],
            function (array $item) use ($bucketOrderIds, $bucketOrders): bool {
                if (!in_array($item['orderId'], $bucketOrderIds, true)) {
                    return false;
                }
                foreach ($bucketOrders as $order) {
                    if ($order['id'] === $item['orderId']) {
                        return empty($order['sessionId']);
                    }
                }
                return false;
            }
        )));

        $chart[] = [
            'label' => $bucket['label'],
            'revenue' => $revenue,
            'sessions' => count($bucketSessions),
            'occupancy' => $activeTablesCount > 0 && $bucket['durationMinutes'] > 0
                ? (int) round(($occupiedMinutes / ($activeTablesCount * $bucket['durationMinutes'])) * 100)
                : 0,
        ];
    }

    return [
        'range' => $range,
        'label' => $window['label'],
        'revenue' => $gameRevenue + $barRevenue + $adjustmentsTotal,
        'gameRevenue' => $gameRevenue,
        'barRevenue' => $barRevenue,
        'adjustmentsTotal' => $adjustmentsTotal,
        'sessionsCount' => count($relevantSessions),
        'occupancyRate' => $occupancyRate,
        'playMinutes' => $playMinutes,
        'currency' => $state['settings']['currency'],
        'timezone' => $state['settings']['timezone'],
        'periodStart' => $window['start']->format(DATE_ATOM),
        'periodEnd' => $window['endExclusive']->modify('-1 minute')->format(DATE_ATOM),
        'topTables' => $topTables,
        'topProducts' => $topProducts,
        'chart' => $chart,
    ];
}
