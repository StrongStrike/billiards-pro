<?php

declare(strict_types=1);

function api_map_settings(array $row): array
{
    return [
        'clubName' => $row['club_name'],
        'currency' => $row['currency'],
        'timezone' => $row['timezone'],
        'operatorName' => $row['operator_name'],
        'operatorEmail' => $row['operator_email'],
        'standardHourlyRate' => (int) $row['standard_hourly_rate'],
        'vipHourlyRate' => (int) $row['vip_hourly_rate'],
        'showActivityChart' => api_boolean($row['show_activity_chart']),
        'showRightRail' => api_boolean($row['show_right_rail']),
    ];
}

function api_map_table(array $row): array
{
    return [
        'id' => $row['id'],
        'name' => $row['name'],
        'type' => $row['type'],
        'position' => (int) $row['position'],
        'accentColor' => $row['accent_color'],
        'isActive' => api_boolean($row['is_active']),
    ];
}

function api_map_session(array $row): array
{
    return [
        'id' => $row['id'],
        'tableId' => $row['table_id'],
        'customerName' => $row['customer_name'],
        'note' => $row['note'] ?: null,
        'startedAt' => api_iso($row['started_at']),
        'endedAt' => api_iso($row['ended_at']),
        'hourlyRateSnapshot' => (int) $row['hourly_rate_snapshot'],
        'status' => $row['status'],
    ];
}

function api_map_reservation(array $row): array
{
    return [
        'id' => $row['id'],
        'tableId' => $row['table_id'],
        'sessionId' => $row['session_id'] ?: null,
        'customerName' => $row['customer_name'],
        'phone' => $row['phone'],
        'guests' => (int) $row['guests'],
        'note' => $row['note'] ?: null,
        'startAt' => api_iso($row['start_at']),
        'endAt' => api_iso($row['end_at']),
        'status' => $row['status'],
        'createdAt' => api_iso($row['created_at']),
    ];
}

function api_map_category(array $row): array
{
    return [
        'id' => $row['id'],
        'name' => $row['name'],
        'description' => $row['description'] ?: null,
        'position' => (int) $row['position'],
    ];
}

function api_map_product(array $row): array
{
    return [
        'id' => $row['id'],
        'categoryId' => $row['category_id'],
        'name' => $row['name'],
        'unit' => $row['unit'],
        'price' => (int) $row['price'],
        'costPrice' => (int) $row['cost_price'],
        'stock' => (int) $row['stock'],
        'threshold' => (int) $row['threshold'],
        'isActive' => api_boolean($row['is_active']),
    ];
}

function api_map_order(array $row): array
{
    return [
        'id' => $row['id'],
        'mode' => $row['mode'],
        'status' => $row['status'],
        'createdAt' => api_iso($row['created_at']),
        'paidAt' => api_iso($row['paid_at']),
        'note' => $row['note'] ?: null,
        'tableId' => $row['table_id'] ?: null,
        'sessionId' => $row['session_id'] ?: null,
        'customerName' => $row['customer_name'] ?: null,
        'counterSaleId' => $row['mode'] === 'counter' ? ('counter-' . $row['id']) : null,
    ];
}

function api_map_order_item(array $row): array
{
    return [
        'id' => $row['id'],
        'orderId' => $row['order_id'],
        'productId' => $row['product_id'],
        'quantity' => (int) $row['quantity'],
        'unitPrice' => (int) $row['unit_price'],
    ];
}

function api_map_stock_movement(array $row): array
{
    return [
        'id' => $row['id'],
        'productId' => $row['product_id'],
        'type' => $row['type'],
        'quantity' => (int) $row['quantity'],
        'reason' => $row['reason'],
        'resultingStock' => (int) $row['resulting_stock'],
        'createdAt' => api_iso($row['created_at']),
    ];
}

function api_map_cash_movement(array $row): array
{
    return [
        'id' => $row['id'],
        'type' => $row['type'],
        'amount' => (int) $row['amount'],
        'reason' => $row['reason'],
        'operatorId' => $row['operator_id'] ?: null,
        'shiftId' => $row['shift_id'] ?: null,
        'createdAt' => api_iso($row['created_at']),
    ];
}

function api_map_bill_adjustment(array $row): array
{
    $normalizedAmount = $row['type'] === 'manual_charge'
        ? ($row['amount'] !== null ? (int) $row['amount'] : 0)
        : ($row['amount'] !== null ? -abs((int) $row['amount']) : 0);

    return [
        'id' => $row['id'],
        'sessionId' => $row['session_id'],
        'operatorId' => $row['operator_id'] ?: null,
        'shiftId' => $row['shift_id'] ?: null,
        'type' => 'manual_charge',
        'amount' => $normalizedAmount,
        'reason' => $row['reason'] ?: null,
        'createdAt' => api_iso($row['created_at']),
    ];
}

function api_map_shift(array $row): array
{
    return [
        'id' => $row['id'],
        'status' => $row['status'],
        'openingCash' => (int) $row['opening_cash'],
        'closingCash' => $row['closing_cash'] !== null ? (int) $row['closing_cash'] : null,
        'openedByOperatorId' => $row['opened_by_operator_id'] ?: null,
        'closedByOperatorId' => $row['closed_by_operator_id'] ?: null,
        'note' => $row['note'] ?: null,
        'openedAt' => api_iso($row['opened_at']),
        'pausedAt' => api_iso($row['paused_at']),
        'closedAt' => api_iso($row['closed_at']),
        'updatedAt' => api_iso($row['updated_at']),
    ];
}

function api_map_shift_event(array $row): array
{
    return [
        'id' => $row['id'],
        'shiftId' => $row['shift_id'],
        'operatorId' => $row['operator_id'] ?: null,
        'type' => $row['type'],
        'note' => $row['note'] ?: null,
        'createdAt' => api_iso($row['created_at']),
    ];
}

function api_map_audit_log(array $row): array
{
    return [
        'id' => $row['id'],
        'operatorId' => $row['operator_id'] ?: null,
        'action' => $row['action'],
        'entityType' => $row['entity_type'],
        'entityId' => $row['entity_id'] ?: null,
        'description' => $row['description'],
        'metadata' => $row['metadata'] ?: null,
        'createdAt' => api_iso($row['created_at']),
    ];
}

function api_map_operator(array $row): array
{
    return [
        'id' => $row['id'],
        'name' => $row['full_name'],
        'email' => $row['email'],
        'role' => $row['role'],
        'isActive' => api_boolean($row['is_active']),
        'createdAt' => api_iso($row['created_at']),
    ];
}

function api_load_state(array $config): array
{
    $pdo = api_pdo($config);
    $settingsRow = api_fetch_one($pdo, 'select * from club_settings limit 1');
    if (!$settingsRow) {
        throw new ApiException(500, 'Klub sozlamalari topilmadi');
    }

    return [
        'settings' => api_map_settings($settingsRow),
        'tables' => array_map('api_map_table', api_fetch_all($pdo, 'select * from billiard_tables order by position asc')),
        'sessions' => array_map('api_map_session', api_fetch_all($pdo, 'select * from table_sessions order by started_at desc')),
        'reservations' => array_map('api_map_reservation', api_fetch_all($pdo, 'select * from reservations order by start_at asc')),
        'categories' => array_map('api_map_category', api_fetch_all($pdo, 'select * from product_categories order by position asc, name asc')),
        'products' => array_map('api_map_product', api_fetch_all($pdo, 'select * from products order by name asc')),
        'orders' => array_map('api_map_order', api_fetch_all($pdo, 'select * from orders order by created_at desc')),
        'orderItems' => array_map('api_map_order_item', api_fetch_all($pdo, 'select * from order_items order by created_at asc')),
        'stockMovements' => array_map('api_map_stock_movement', api_fetch_all($pdo, 'select * from stock_movements order by created_at desc')),
        'cashMovements' => array_map('api_map_cash_movement', api_fetch_all($pdo, 'select * from cash_movements order by created_at desc')),
        'billAdjustments' => array_map('api_map_bill_adjustment', api_fetch_all($pdo, 'select * from bill_adjustments order by created_at desc')),
        'shifts' => array_map('api_map_shift', api_fetch_all($pdo, 'select * from shifts order by opened_at desc')),
        'shiftEvents' => array_map('api_map_shift_event', api_fetch_all($pdo, 'select * from shift_events order by created_at desc')),
        'auditLogs' => array_map('api_map_audit_log', api_fetch_all($pdo, 'select * from audit_logs order by created_at desc')),
        'operators' => array_map('api_map_operator', api_fetch_all($pdo, 'select * from operators order by created_at asc')),
    ];
}

function api_current_shift(array $state): ?array
{
    foreach ($state['shifts'] as $shift) {
        if (in_array($shift['status'], ['open', 'paused'], true)) {
            return $shift;
        }
    }

    return null;
}

function api_build_counter_sales(array $orders, array $orderItems): array
{
    $sales = [];
    foreach ($orders as $order) {
        if ($order['mode'] !== 'counter' || $order['status'] !== 'paid') {
            continue;
        }

        $sales[] = [
            'id' => $order['counterSaleId'] ?? ('counter-' . $order['id']),
            'orderId' => $order['id'],
            'customerName' => $order['customerName'] ?? null,
            'createdAt' => $order['paidAt'] ?? $order['createdAt'],
            'total' => api_calculate_order_total($order['id'], $orderItems),
        ];
    }

    usort($sales, static fn (array $left, array $right): int => strcmp($right['createdAt'], $left['createdAt']));
    return $sales;
}

function api_table_rate(string $type, array $settings): int
{
    return $type === 'vip' ? (int) $settings['vipHourlyRate'] : (int) $settings['standardHourlyRate'];
}

function api_table_status(string $tableId, ?string $activeSessionId, array $reservations, ?DateTimeImmutable $now = null): string
{
    if ($activeSessionId) {
        return 'active';
    }

    $clock = $now ?? new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $lookahead = $clock->modify('+4 hours')->getTimestamp();

    foreach ($reservations as $reservation) {
        if ($reservation['tableId'] !== $tableId || $reservation['status'] !== 'scheduled') {
            continue;
        }

        $start = api_parse_time($reservation['startAt'])->getTimestamp();
        if ($start >= $clock->getTimestamp() && $start <= $lookahead) {
            return 'reserved';
        }
    }

    return 'free';
}

function api_table_snapshots(array $state, ?DateTimeImmutable $now = null): array
{
    $clock = $now ?? new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $tables = array_values(array_filter($state['tables'], static fn (array $table): bool => $table['isActive']));
    usort($tables, static fn (array $left, array $right): int => $left['position'] <=> $right['position']);

    $snapshots = [];
    foreach ($tables as $table) {
        $activeSession = null;
        foreach ($state['sessions'] as $session) {
            if ($session['tableId'] === $table['id'] && $session['status'] === 'active') {
                $activeSession = $session;
                break;
            }
        }

        $nextReservation = null;
        foreach ($state['reservations'] as $reservation) {
            if (
                $reservation['tableId'] === $table['id']
                && $reservation['status'] === 'scheduled'
                && api_parse_time($reservation['endAt'])->getTimestamp() > $clock->getTimestamp()
            ) {
                $nextReservation = $reservation;
                break;
            }
        }

        $pendingOrderTotal = 0;
        if ($activeSession) {
            foreach ($state['orders'] as $order) {
                if ($order['sessionId'] === $activeSession['id'] && $order['mode'] === 'table' && $order['status'] === 'confirmed') {
                    $pendingOrderTotal += api_calculate_order_total($order['id'], $state['orderItems']);
                }
            }
        }

        $currentSummary = null;
        if ($activeSession) {
            $currentSummary = api_calculate_session_summary(
                $activeSession,
                $pendingOrderTotal,
                api_get_session_bill_adjustments($activeSession['id'], $state['billAdjustments']),
                $clock->format(DATE_ATOM)
            );
        }

        $snapshots[] = [
            'id' => $table['id'],
            'name' => $table['name'],
            'type' => $table['type'],
            'position' => $table['position'],
            'accentColor' => $table['accentColor'],
            'status' => api_table_status($table['id'], $activeSession['id'] ?? null, $state['reservations'], $clock),
            'hourlyRate' => api_table_rate($table['type'], $state['settings']),
            'activeSession' => $activeSession,
            'nextReservation' => $nextReservation,
            'pendingOrderTotal' => $pendingOrderTotal,
            'currentSummary' => $currentSummary,
        ];
    }

    return $snapshots;
}

function api_dashboard_kpis(array $state, array $tableSnapshots, ?DateTimeImmutable $now = null): array
{
    $clock = $now ?? new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $window = api_get_report_window('day', $state['settings']['timezone'], $clock);
    $occupancyEnd = $clock < $window['endExclusive'] ? $clock : $window['endExclusive'];

    $completedSessions = array_values(array_filter($state['sessions'], function (array $session) use ($clock, $state): bool {
        return $session['status'] === 'completed'
            && $session['endedAt']
            && api_is_same_zoned_day($session['endedAt'], $clock, $state['settings']['timezone']);
    }));

    $paidOrders = array_values(array_filter($state['orders'], function (array $order) use ($clock, $state): bool {
        $stamp = $order['paidAt'] ?? $order['createdAt'];
        return $order['status'] === 'paid' && api_is_same_zoned_day($stamp, $clock, $state['settings']['timezone']);
    }));
    $paidOrderIds = array_column($paidOrders, 'id');
    $paidItems = array_values(array_filter(
        $state['orderItems'],
        static fn (array $item): bool => in_array($item['orderId'], $paidOrderIds, true)
    ));
    $paidCounterOrders = array_values(array_filter(
        $paidOrders,
        static fn (array $order): bool => $order['mode'] === 'counter'
    ));
    $paidCounterOrderIds = array_column($paidCounterOrders, 'id');
    $paidCounterItems = array_values(array_filter(
        $state['orderItems'],
        static fn (array $item): bool => in_array($item['orderId'], $paidCounterOrderIds, true)
    ));
    $cashAdjustmentsToday = array_values(array_filter($state['cashMovements'], function (array $movement) use ($clock, $state): bool {
        return api_is_same_zoned_day($movement['createdAt'], $clock, $state['settings']['timezone']);
    }));
    $billAdjustmentsToday = array_values(array_filter($state['billAdjustments'], function (array $adjustment) use ($clock, $state): bool {
        return api_is_same_zoned_day($adjustment['createdAt'], $clock, $state['settings']['timezone']);
    }));
    $cashAdjustmentNet = 0;
    foreach ($cashAdjustmentsToday as $movement) {
        $sign = in_array($movement['type'], ['service_in', 'change'], true) ? 1 : -1;
        $cashAdjustmentNet += $sign * (int) $movement['amount'];
    }
    $counterCashRevenue = api_calculate_order_items_total($paidCounterItems);

    $sessionRevenue = 0;
    foreach ($completedSessions as $session) {
        $sessionOrderIds = [];
        foreach ($paidOrders as $order) {
            if (($order['sessionId'] ?? null) === $session['id']) {
                $sessionOrderIds[] = $order['id'];
            }
        }

        $sessionItems = array_values(array_filter(
            $paidItems,
            static fn (array $item): bool => in_array($item['orderId'], $sessionOrderIds, true)
        ));

        $sessionRevenue += api_calculate_session_summary(
            $session,
            api_calculate_order_items_total($sessionItems),
            api_get_session_bill_adjustments($session['id'], $state['billAdjustments']),
            $session['endedAt']
        )['total'];
    }
    $barRevenue = api_calculate_order_items_total($paidItems);
    $counterOnlyRevenue = api_calculate_order_items_total(array_values(array_filter(
        $paidItems,
        function (array $item) use ($paidOrders): bool {
            foreach ($paidOrders as $order) {
                if ($order['id'] === $item['orderId']) {
                    return empty($order['sessionId']);
                }
            }

            return false;
        }
    )));
    $totalRevenue = $sessionRevenue + $counterOnlyRevenue;

    $occupiedMinutes = 0;
    foreach ($state['sessions'] as $session) {
        $occupiedMinutes += api_session_overlap_minutes($session, $window['start'], $occupancyEnd, $clock->format(DATE_ATOM));
    }
    $totalAvailableMinutes = count($tableSnapshots) * max((int) (($occupancyEnd->getTimestamp() - $window['start']->getTimestamp()) / 60), 1);

    $reservationsToday = 0;
    foreach ($state['reservations'] as $reservation) {
        if ($reservation['status'] !== 'cancelled' && api_is_same_zoned_day($reservation['startAt'], $clock, $state['settings']['timezone'])) {
            $reservationsToday++;
        }
    }

    return [
        'totalRevenue' => $totalRevenue,
        'activeTables' => count(array_filter($tableSnapshots, static fn (array $table): bool => $table['status'] === 'active')),
        'reservationsToday' => $reservationsToday,
        'gamesToday' => count($completedSessions),
        'occupancyRate' => $totalAvailableMinutes > 0 ? (int) round(($occupiedMinutes / $totalAvailableMinutes) * 100) : 0,
        'barRevenue' => $barRevenue,
        'cashOnHand' => $counterCashRevenue + $cashAdjustmentNet,
        'cashAdjustmentNet' => $cashAdjustmentNet,
        'cashMovementsToday' => count($cashAdjustmentsToday),
        'billAdjustmentsToday' => count($billAdjustmentsToday),
    ];
}

function api_low_stock_products(array $state): array
{
    $result = [];
    foreach ($state['products'] as $product) {
        $available = $product['stock'] - api_get_reserved_stock($product['id'], $state['orders'], $state['orderItems']);
        if ($available <= $product['threshold']) {
            $result[] = $product;
        }
    }
    return $result;
}

function api_get_bootstrap_payload(array $config, array $operator): array
{
    $state = api_load_state($config);
    $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $tables = api_table_snapshots($state, $now);
    $kpis = api_dashboard_kpis($state, $tables, $now);

    return [
        'operator' => $operator,
        'operators' => ($operator['role'] ?? 'admin') === 'admin' ? $state['operators'] : [],
        'settings' => $state['settings'],
        'tables' => $tables,
        'reservations' => $state['reservations'],
        'categories' => $state['categories'],
        'products' => $state['products'],
        'orders' => $state['orders'],
        'orderItems' => $state['orderItems'],
        'counterSales' => api_build_counter_sales($state['orders'], $state['orderItems']),
        'stockMovements' => $state['stockMovements'],
        'cashMovements' => $state['cashMovements'],
        'billAdjustments' => $state['billAdjustments'],
        'activeShift' => api_current_shift($state),
        'shiftEvents' => $state['shiftEvents'],
        'auditLogs' => ($operator['role'] ?? 'admin') === 'admin' ? array_slice($state['auditLogs'], 0, 30) : [],
        'kpis' => $kpis,
        'lowStockProducts' => api_low_stock_products($state),
        'generatedAt' => $now->format(DATE_ATOM),
    ];
}
