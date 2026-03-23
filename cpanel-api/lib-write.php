<?php

declare(strict_types=1);

function api_append_audit_log(PDO $pdo, array $input): void
{
    api_execute(
        $pdo,
        'insert into audit_logs (id, operator_id, action, entity_type, entity_id, description, metadata, created_at)
         values (:id, :operator_id, :action, :entity_type, :entity_id, :description, :metadata, :created_at)',
        [
            'id' => api_create_id('audit'),
            'operator_id' => $input['operatorId'] ?? null,
            'action' => $input['action'],
            'entity_type' => $input['entityType'],
            'entity_id' => $input['entityId'] ?? null,
            'description' => $input['description'],
            'metadata' => isset($input['metadata']) ? json_encode($input['metadata'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null,
            'created_at' => gmdate(DATE_ATOM),
        ]
    );
}

function api_append_shift_event(PDO $pdo, array $input): void
{
    api_execute(
        $pdo,
        'insert into shift_events (id, shift_id, operator_id, type, note, created_at)
         values (:id, :shift_id, :operator_id, :type, :note, :created_at)',
        [
            'id' => api_create_id('shift-event'),
            'shift_id' => $input['shiftId'],
            'operator_id' => $input['operatorId'] ?? null,
            'type' => $input['type'],
            'note' => $input['note'] ?? null,
            'created_at' => gmdate(DATE_ATOM),
        ]
    );
}

function api_fetch_current_shift_row(PDO $pdo): ?array
{
    return api_fetch_one(
        $pdo,
        "select * from shifts where status in ('open', 'paused') order by opened_at desc limit 1"
    );
}

function api_start_table_session(array $config, array $operator, string $tableId, array $input): void
{
    $customerName = trim((string) ($input['customerName'] ?? ''));
    $note = trim((string) ($input['note'] ?? ''));
    if (mb_strlen($customerName) < 2) {
        throw new ApiException(400, 'Mijoz ismi kiritilishi kerak');
    }

    $pdo = api_pdo($config);
    $pdo->beginTransaction();
    try {
        $tableRow = api_fetch_one($pdo, 'select * from billiard_tables where id = :id limit 1', ['id' => $tableId]);
        $settingsRow = api_fetch_one($pdo, 'select * from club_settings limit 1');
        if (!$tableRow || !$settingsRow) {
            throw new ApiException(400, 'Stol yoki klub sozlamalari topilmadi');
        }

        $activeSession = api_fetch_one(
            $pdo,
            "select * from table_sessions where table_id = :table_id and status = 'active' limit 1",
            ['table_id' => $tableId]
        );
        if ($activeSession) {
            throw new ApiException(400, 'Bu stol allaqachon band');
        }

        $now = gmdate(DATE_ATOM);
        $sessionId = api_create_id('session');
        api_execute(
            $pdo,
            'insert into table_sessions (id, table_id, customer_name, note, started_at, hourly_rate_snapshot, status, created_at, updated_at)
             values (:id, :table_id, :customer_name, :note, :started_at, :hourly_rate_snapshot, :status, :created_at, :updated_at)',
            [
                'id' => $sessionId,
                'table_id' => $tableId,
                'customer_name' => $customerName,
                'note' => $note !== '' ? $note : null,
                'started_at' => $now,
                'hourly_rate_snapshot' => $tableRow['type'] === 'vip' ? (int) $settingsRow['vip_hourly_rate'] : (int) $settingsRow['standard_hourly_rate'],
                'status' => 'active',
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );
        api_append_audit_log($pdo, [
            'operatorId' => $operator['id'] ?? null,
            'action' => 'session.started',
            'entityType' => 'session',
            'entityId' => $sessionId,
            'description' => $tableRow['name'] . ' uchun yangi seans boshlandi',
            'metadata' => ['tableId' => $tableId, 'customerName' => $customerName],
        ]);

        $pdo->commit();
    } catch (Throwable $exception) {
        $pdo->rollBack();
        throw $exception;
    }
}

function api_stop_table_session(array $config, array $operator, string $tableId, array $input): void
{
    $pdo = api_pdo($config);
    $pdo->beginTransaction();

    try {
        $activeSessionRow = api_fetch_one(
            $pdo,
            "select * from table_sessions where table_id = :table_id and status = 'active' limit 1",
            ['table_id' => $tableId]
        );
        if (!$activeSessionRow) {
            throw new ApiException(400, 'Faol seans topilmadi');
        }

        $confirmedOrdersRows = api_fetch_all(
            $pdo,
            "select * from orders where session_id = :session_id and status = 'confirmed'",
            ['session_id' => $activeSessionRow['id']]
        );
        $confirmedOrderIds = array_column($confirmedOrdersRows, 'id');
        $sessionItemsRows = [];
        if ($confirmedOrderIds !== []) {
            $placeholders = implode(', ', array_fill(0, count($confirmedOrderIds), '?'));
            $statement = $pdo->prepare("select * from order_items where order_id in ($placeholders)");
            $statement->execute($confirmedOrderIds);
            $sessionItemsRows = $statement->fetchAll();
        }

        $sessionItems = array_map('api_map_order_item', $sessionItemsRows);
        $requiredByProduct = api_aggregate_quantities_by_product(array_map(
            static fn (array $item): array => ['productId' => $item['productId'], 'quantity' => $item['quantity']],
            $sessionItems
        ));
        $settledAt = gmdate(DATE_ATOM);

        if ($requiredByProduct !== []) {
            $productIds = array_keys($requiredByProduct);
            $placeholders = implode(', ', array_fill(0, count($productIds), '?'));
            $statement = $pdo->prepare("select * from products where id in ($placeholders)");
            $statement->execute($productIds);
            $productRows = array_map('api_map_product', $statement->fetchAll());

            foreach ($productRows as $productRow) {
                $required = $requiredByProduct[$productRow['id']] ?? 0;
                if ($productRow['stock'] < $required) {
                    throw new ApiException(400, $productRow['name'] . " uchun yetarli qoldiq yo'q");
                }
            }

            foreach ($productRows as $productRow) {
                $quantity = $requiredByProduct[$productRow['id']] ?? 0;
                if ($quantity <= 0) {
                    continue;
                }

                $nextStock = $productRow['stock'] - $quantity;
                api_execute(
                    $pdo,
                    'update products set stock = :stock, updated_at = :updated_at where id = :id',
                    ['stock' => $nextStock, 'updated_at' => $settledAt, 'id' => $productRow['id']]
                );
                api_execute(
                    $pdo,
                    'insert into stock_movements (id, product_id, order_id, session_id, type, quantity, reason, resulting_stock, created_at)
                     values (:id, :product_id, :order_id, :session_id, :type, :quantity, :reason, :resulting_stock, :created_at)',
                    [
                        'id' => api_create_id('movement'),
                        'product_id' => $productRow['id'],
                        'order_id' => $confirmedOrderIds[0] ?? null,
                        'session_id' => $activeSessionRow['id'],
                        'type' => 'out',
                        'quantity' => $quantity,
                        'reason' => $activeSessionRow['customer_name'] . ' seansi',
                        'resulting_stock' => $nextStock,
                        'created_at' => $settledAt,
                    ]
                );
            }

            if ($confirmedOrderIds !== []) {
                $placeholders = implode(', ', array_fill(0, count($confirmedOrderIds), '?'));
                $statement = $pdo->prepare("update orders set status = 'paid', paid_at = ?, updated_at = ? where id in ($placeholders)");
                $statement->execute(array_merge([$settledAt, $settledAt], $confirmedOrderIds));
            }
        }

        $note = trim((string) ($input['note'] ?? $activeSessionRow['note']));
        api_execute(
            $pdo,
            'update table_sessions set status = :status, ended_at = :ended_at, note = :note, updated_at = :updated_at where id = :id',
            [
                'status' => 'completed',
                'ended_at' => $settledAt,
                'note' => $note !== '' ? $note : null,
                'updated_at' => $settledAt,
                'id' => $activeSessionRow['id'],
            ]
        );

        api_execute(
            $pdo,
            "update reservations set status = 'completed', updated_at = :updated_at where session_id = :session_id",
            ['updated_at' => $settledAt, 'session_id' => $activeSessionRow['id']]
        );
        api_append_audit_log($pdo, [
            'operatorId' => $operator['id'] ?? null,
            'action' => 'session.stopped',
            'entityType' => 'session',
            'entityId' => $activeSessionRow['id'],
            'description' => $activeSessionRow['customer_name'] . ' seansi yopildi',
            'metadata' => ['tableId' => $tableId, 'settledAt' => $settledAt],
        ]);

        $pdo->commit();
    } catch (Throwable $exception) {
        $pdo->rollBack();
        throw $exception;
    }
}

function api_create_table_order(array $config, array $operator, array $input): void
{
    $items = $input['items'] ?? [];
    if (!is_array($items) || count($items) < 1) {
        throw new ApiException(400, 'Kamida bitta mahsulot kerak');
    }

    $pdo = api_pdo($config);
    $pdo->beginTransaction();
    try {
        $sessionId = isset($input['sessionId']) ? (string) $input['sessionId'] : null;
        $tableId = isset($input['tableId']) ? (string) $input['tableId'] : null;

        if ($sessionId) {
            $activeSessionRow = api_fetch_one(
                $pdo,
                "select * from table_sessions where id = :id and status = 'active' limit 1",
                ['id' => $sessionId]
            );
        } elseif ($tableId) {
            $activeSessionRow = api_fetch_one(
                $pdo,
                "select * from table_sessions where table_id = :table_id and status = 'active' limit 1",
                ['table_id' => $tableId]
            );
        } else {
            $activeSessionRow = null;
        }

        if (!$activeSessionRow) {
            throw new ApiException(400, 'Faol stol seansi topilmadi');
        }

        $records = api_fetch_orders_and_items($pdo);
        $productRows = array_map('api_map_product', api_fetch_all($pdo, 'select * from products'));

        $normalizedItems = [];
        foreach ($items as $item) {
            $productId = (string) ($item['productId'] ?? '');
            $quantity = (int) ($item['quantity'] ?? 0);
            if ($productId === '' || $quantity <= 0) {
                throw new ApiException(400, "Mahsulot va miqdor noto'g'ri");
            }
            $normalizedItems[] = ['productId' => $productId, 'quantity' => $quantity];
        }

        api_ensure_stock_availability($normalizedItems, $productRows, $records['orders'], $records['orderItems']);

        $existingOrderRow = api_fetch_one(
            $pdo,
            "select * from orders where session_id = :session_id and mode = 'table' and status = 'confirmed' limit 1",
            ['session_id' => $activeSessionRow['id']]
        );

        $now = gmdate(DATE_ATOM);
        $orderId = $existingOrderRow['id'] ?? api_create_id('order');
        $note = trim((string) ($input['note'] ?? ''));

        if (!$existingOrderRow) {
            api_execute(
                $pdo,
                'insert into orders (id, mode, status, note, table_id, session_id, created_at, updated_at)
                 values (:id, :mode, :status, :note, :table_id, :session_id, :created_at, :updated_at)',
                [
                    'id' => $orderId,
                    'mode' => 'table',
                    'status' => 'confirmed',
                    'note' => $note !== '' ? $note : null,
                    'table_id' => $activeSessionRow['table_id'],
                    'session_id' => $activeSessionRow['id'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        } elseif ($note !== '') {
            api_execute(
                $pdo,
                'update orders set note = :note, updated_at = :updated_at where id = :id',
                ['note' => $note, 'updated_at' => $now, 'id' => $orderId]
            );
        }

        foreach ($normalizedItems as $line) {
            $product = null;
            foreach ($productRows as $candidate) {
                if ($candidate['id'] === $line['productId']) {
                    $product = $candidate;
                    break;
                }
            }
            if (!$product) {
                throw new ApiException(400, 'Mahsulot topilmadi');
            }

            api_execute(
                $pdo,
                'insert into order_items (id, order_id, product_id, quantity, unit_price, created_at)
                 values (:id, :order_id, :product_id, :quantity, :unit_price, :created_at)',
                [
                    'id' => api_create_id('item'),
                    'order_id' => $orderId,
                    'product_id' => $product['id'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $product['price'],
                    'created_at' => $now,
                ]
            );
        }

        api_append_audit_log($pdo, [
            'operatorId' => $operator['id'] ?? null,
            'action' => 'order.table.created',
            'entityType' => 'order',
            'entityId' => $orderId,
            'description' => 'Stol uchun bar buyurtmasi saqlandi',
            'metadata' => [
                'tableId' => $activeSessionRow['table_id'],
                'sessionId' => $activeSessionRow['id'],
                'items' => count($normalizedItems),
            ],
        ]);

        $pdo->commit();
    } catch (Throwable $exception) {
        $pdo->rollBack();
        throw $exception;
    }
}

function api_create_counter_sale(array $config, array $operator, array $input): void
{
    $items = $input['items'] ?? [];
    if (!is_array($items) || count($items) < 1) {
        throw new ApiException(400, 'Kamida bitta mahsulot kerak');
    }

    $pdo = api_pdo($config);
    $pdo->beginTransaction();
    try {
        $records = api_fetch_orders_and_items($pdo);
        $productRows = array_map('api_map_product', api_fetch_all($pdo, 'select * from products'));
        $normalizedItems = [];

        foreach ($items as $item) {
            $productId = (string) ($item['productId'] ?? '');
            $quantity = (int) ($item['quantity'] ?? 0);
            if ($productId === '' || $quantity <= 0) {
                throw new ApiException(400, "Mahsulot va miqdor noto'g'ri");
            }
            $normalizedItems[] = ['productId' => $productId, 'quantity' => $quantity];
        }

        api_ensure_stock_availability($normalizedItems, $productRows, $records['orders'], $records['orderItems']);

        $orderId = api_create_id('order');
        $createdAt = gmdate(DATE_ATOM);
        $requestedByProduct = api_aggregate_quantities_by_product($normalizedItems);
        $customerName = trim((string) ($input['customerName'] ?? ''));
        $note = trim((string) ($input['note'] ?? ''));

        api_execute(
            $pdo,
            'insert into orders (id, mode, status, note, customer_name, created_at, paid_at, updated_at)
             values (:id, :mode, :status, :note, :customer_name, :created_at, :paid_at, :updated_at)',
            [
                'id' => $orderId,
                'mode' => 'counter',
                'status' => 'paid',
                'note' => $note !== '' ? $note : null,
                'customer_name' => $customerName !== '' ? $customerName : null,
                'created_at' => $createdAt,
                'paid_at' => $createdAt,
                'updated_at' => $createdAt,
            ]
        );

        foreach ($normalizedItems as $line) {
            $product = null;
            foreach ($productRows as $candidate) {
                if ($candidate['id'] === $line['productId']) {
                    $product = $candidate;
                    break;
                }
            }
            if (!$product) {
                throw new ApiException(400, 'Mahsulot topilmadi');
            }

            api_execute(
                $pdo,
                'insert into order_items (id, order_id, product_id, quantity, unit_price, created_at)
                 values (:id, :order_id, :product_id, :quantity, :unit_price, :created_at)',
                [
                    'id' => api_create_id('item'),
                    'order_id' => $orderId,
                    'product_id' => $product['id'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $product['price'],
                    'created_at' => $createdAt,
                ]
            );
        }

        foreach ($requestedByProduct as $productId => $quantity) {
            $product = null;
            foreach ($productRows as $candidate) {
                if ($candidate['id'] === $productId) {
                    $product = $candidate;
                    break;
                }
            }
            if (!$product) {
                throw new ApiException(400, 'Mahsulot topilmadi');
            }

            $nextStock = $product['stock'] - $quantity;
            api_execute(
                $pdo,
                'update products set stock = :stock, updated_at = :updated_at where id = :id',
                ['stock' => $nextStock, 'updated_at' => $createdAt, 'id' => $product['id']]
            );
            api_execute(
                $pdo,
                'insert into stock_movements (id, product_id, order_id, session_id, type, quantity, reason, resulting_stock, created_at)
                 values (:id, :product_id, :order_id, :session_id, :type, :quantity, :reason, :resulting_stock, :created_at)',
                [
                    'id' => api_create_id('movement'),
                    'product_id' => $product['id'],
                    'order_id' => $orderId,
                    'session_id' => null,
                    'type' => 'out',
                    'quantity' => $quantity,
                    'reason' => $customerName !== '' ? $customerName . ' counter savdosi' : 'Counter savdosi',
                    'resulting_stock' => $nextStock,
                    'created_at' => $createdAt,
                ]
            );
        }

        api_append_audit_log($pdo, [
            'operatorId' => $operator['id'] ?? null,
            'action' => 'order.counter.created',
            'entityType' => 'order',
            'entityId' => $orderId,
            'description' => 'Kassa savdosi rasmiylashtirildi',
            'metadata' => [
                'customerName' => $customerName !== '' ? $customerName : null,
                'items' => count($normalizedItems),
            ],
        ]);

        $pdo->commit();
    } catch (Throwable $exception) {
        $pdo->rollBack();
        throw $exception;
    }
}

function api_create_cash_movement(array $config, array $operator, array $input): void
{
    $type = (string) ($input['type'] ?? '');
    $amount = (int) ($input['amount'] ?? 0);
    $reason = trim((string) ($input['reason'] ?? ''));

    if (!in_array($type, ['service_in', 'service_out', 'expense', 'cash_drop', 'change'], true)) {
        throw new ApiException(400, "Kassa amali turi noto'g'ri");
    }

    if ($amount <= 0) {
        throw new ApiException(400, "Summa musbat bo'lishi kerak");
    }

    if (mb_strlen($reason) < 4) {
        throw new ApiException(400, "Izoh kamida 4 belgidan iborat bo'lishi kerak");
    }

    $pdo = api_pdo($config);
    $currentShift = api_fetch_current_shift_row($pdo);
    $cashId = api_create_id('cash');
    api_execute(
        $pdo,
        'insert into cash_movements (id, operator_id, shift_id, type, amount, reason, created_at)
         values (:id, :operator_id, :shift_id, :type, :amount, :reason, :created_at)',
        [
            'id' => $cashId,
            'operator_id' => $operator['id'] ?? null,
            'shift_id' => $currentShift['id'] ?? null,
            'type' => $type,
            'amount' => $amount,
            'reason' => $reason,
            'created_at' => gmdate(DATE_ATOM),
        ]
    );
    api_append_audit_log($pdo, [
        'operatorId' => $operator['id'] ?? null,
        'action' => 'cash.movement.created',
        'entityType' => 'cash',
        'entityId' => $cashId,
        'description' => 'Kassa harakati saqlandi',
        'metadata' => [
            'type' => $type,
            'amount' => $amount,
            'shiftId' => $currentShift['id'] ?? null,
        ],
    ]);
}

function api_create_bill_adjustment(array $config, array $operator, array $input): void
{
    $sessionId = (string) ($input['sessionId'] ?? '');
    $type = (string) ($input['type'] ?? '');
    $amount = array_key_exists('amount', $input) ? (int) $input['amount'] : null;
    $reason = trim((string) ($input['reason'] ?? ''));

    if ($sessionId === '') {
        throw new ApiException(400, 'Seans topilmadi');
    }

    if ($type !== 'manual_charge') {
        throw new ApiException(400, "Billing tuzatish turi noto'g'ri");
    }

    if ($amount === null || $amount === 0) {
        throw new ApiException(400, "Nol bo'lmagan summani kiriting");
    }

    $pdo = api_pdo($config);
    $sessionRow = api_fetch_one(
        $pdo,
        "select * from table_sessions where id = :id and status = 'active' limit 1",
        ['id' => $sessionId]
    );
    if (!$sessionRow) {
        throw new ApiException(400, 'Faol seans topilmadi');
    }

    $currentShift = api_fetch_current_shift_row($pdo);
    $adjustmentId = api_create_id('adjustment');

    api_execute(
        $pdo,
        'insert into bill_adjustments (id, session_id, operator_id, shift_id, type, amount, minutes, reason, created_at)
         values (:id, :session_id, :operator_id, :shift_id, :type, :amount, :minutes, :reason, :created_at)',
        [
            'id' => $adjustmentId,
            'session_id' => $sessionId,
            'operator_id' => $operator['id'] ?? null,
            'shift_id' => $currentShift['id'] ?? null,
            'type' => $type,
            'amount' => $amount,
            'minutes' => null,
            'reason' => $reason !== '' ? $reason : null,
            'created_at' => gmdate(DATE_ATOM),
        ]
    );
    api_append_audit_log($pdo, [
        'operatorId' => $operator['id'] ?? null,
        'action' => 'bill.adjustment.created',
        'entityType' => 'bill',
        'entityId' => $adjustmentId,
        'description' => "Qo'lda billing tuzatishi qo'shildi",
        'metadata' => [
            'amount' => $amount,
            'sessionId' => $sessionId,
            'shiftId' => $currentShift['id'] ?? null,
        ],
    ]);
}

function api_open_shift(array $config, array $operator, array $input): void
{
    $openingCash = (int) ($input['openingCash'] ?? 0);
    $note = trim((string) ($input['note'] ?? ''));
    if ($openingCash < 0) {
        throw new ApiException(400, "Boshlang'ich naqd manfiy bo'lishi mumkin emas");
    }

    $pdo = api_pdo($config);
    if (api_fetch_current_shift_row($pdo)) {
        throw new ApiException(400, "Avval joriy smenani yoping yoki davom ettiring");
    }

    $shiftId = api_create_id('shift');
    $now = gmdate(DATE_ATOM);
    api_execute(
        $pdo,
        'insert into shifts (id, status, opening_cash, opened_by_operator_id, note, opened_at, updated_at)
         values (:id, :status, :opening_cash, :opened_by_operator_id, :note, :opened_at, :updated_at)',
        [
            'id' => $shiftId,
            'status' => 'open',
            'opening_cash' => $openingCash,
            'opened_by_operator_id' => $operator['id'] ?? null,
            'note' => $note !== '' ? $note : null,
            'opened_at' => $now,
            'updated_at' => $now,
        ]
    );
    api_append_shift_event($pdo, [
        'shiftId' => $shiftId,
        'operatorId' => $operator['id'] ?? null,
        'type' => 'opened',
        'note' => $note !== '' ? $note : null,
    ]);
    api_append_audit_log($pdo, [
        'operatorId' => $operator['id'] ?? null,
        'action' => 'shift.opened',
        'entityType' => 'shift',
        'entityId' => $shiftId,
        'description' => 'Smena ochildi',
        'metadata' => ['openingCash' => $openingCash],
    ]);
}

function api_pause_shift(array $config, array $operator, array $input): void
{
    $note = trim((string) ($input['note'] ?? ''));
    $pdo = api_pdo($config);
    $currentShift = api_fetch_current_shift_row($pdo);
    if (!$currentShift || $currentShift['status'] !== 'open') {
        throw new ApiException(400, "Faol smenani pauzaga qo'yish mumkin");
    }

    $now = gmdate(DATE_ATOM);
    api_execute(
        $pdo,
        "update shifts set status = 'paused', paused_at = :paused_at, note = :note, updated_at = :updated_at where id = :id",
        [
            'paused_at' => $now,
            'note' => $note !== '' ? $note : ($currentShift['note'] ?: null),
            'updated_at' => $now,
            'id' => $currentShift['id'],
        ]
    );
    api_append_shift_event($pdo, [
        'shiftId' => $currentShift['id'],
        'operatorId' => $operator['id'] ?? null,
        'type' => 'paused',
        'note' => $note !== '' ? $note : null,
    ]);
    api_append_audit_log($pdo, [
        'operatorId' => $operator['id'] ?? null,
        'action' => 'shift.paused',
        'entityType' => 'shift',
        'entityId' => $currentShift['id'],
        'description' => "Smena pauzaga qo'yildi",
    ]);
}

function api_resume_shift(array $config, array $operator, array $input): void
{
    $note = trim((string) ($input['note'] ?? ''));
    $pdo = api_pdo($config);
    $currentShift = api_fetch_current_shift_row($pdo);
    if (!$currentShift || $currentShift['status'] !== 'paused') {
        throw new ApiException(400, 'Pauzadagi smenani davom ettirish mumkin');
    }

    $now = gmdate(DATE_ATOM);
    api_execute(
        $pdo,
        "update shifts set status = 'open', paused_at = null, updated_at = :updated_at where id = :id",
        [
            'updated_at' => $now,
            'id' => $currentShift['id'],
        ]
    );
    api_append_shift_event($pdo, [
        'shiftId' => $currentShift['id'],
        'operatorId' => $operator['id'] ?? null,
        'type' => 'resumed',
        'note' => $note !== '' ? $note : null,
    ]);
    api_append_audit_log($pdo, [
        'operatorId' => $operator['id'] ?? null,
        'action' => 'shift.resumed',
        'entityType' => 'shift',
        'entityId' => $currentShift['id'],
        'description' => 'Smena davom ettirildi',
    ]);
}

function api_close_shift(array $config, array $operator, array $input): void
{
    $closingCash = (int) ($input['closingCash'] ?? -1);
    $note = trim((string) ($input['note'] ?? ''));
    if ($closingCash < 0) {
        throw new ApiException(400, "Yakuniy naqd manfiy bo'lishi mumkin emas");
    }

    $pdo = api_pdo($config);
    $currentShift = api_fetch_current_shift_row($pdo);
    if (!$currentShift) {
        throw new ApiException(400, 'Yopish uchun faol smena topilmadi');
    }

    $now = gmdate(DATE_ATOM);
    api_execute(
        $pdo,
        "update shifts set status = 'closed', closing_cash = :closing_cash, closed_by_operator_id = :closed_by_operator_id, closed_at = :closed_at, note = :note, updated_at = :updated_at where id = :id",
        [
            'closing_cash' => $closingCash,
            'closed_by_operator_id' => $operator['id'] ?? null,
            'closed_at' => $now,
            'note' => $note !== '' ? $note : ($currentShift['note'] ?: null),
            'updated_at' => $now,
            'id' => $currentShift['id'],
        ]
    );
    api_append_shift_event($pdo, [
        'shiftId' => $currentShift['id'],
        'operatorId' => $operator['id'] ?? null,
        'type' => 'closed',
        'note' => $note !== '' ? $note : null,
    ]);
    api_append_audit_log($pdo, [
        'operatorId' => $operator['id'] ?? null,
        'action' => 'shift.closed',
        'entityType' => 'shift',
        'entityId' => $currentShift['id'],
        'description' => 'Smena yopildi',
        'metadata' => ['closingCash' => $closingCash],
    ]);
}

function api_create_reservation(array $config, array $operator, array $input): void
{
    $tableId = (string) ($input['tableId'] ?? '');
    $customerName = trim((string) ($input['customerName'] ?? ''));
    $phone = trim((string) ($input['phone'] ?? ''));
    $guests = (int) ($input['guests'] ?? 0);
    $startAt = (string) ($input['startAt'] ?? '');
    $endAt = (string) ($input['endAt'] ?? '');
    $note = trim((string) ($input['note'] ?? ''));

    if ($tableId === '' || $customerName === '' || $phone === '' || $guests <= 0 || $startAt === '' || $endAt === '') {
        throw new ApiException(400, "Bron ma'lumotlari to'liq emas");
    }

    api_assert_reservation_times($startAt, $endAt);

    $pdo = api_pdo($config);
    $pdo->beginTransaction();
    try {
        $reservations = array_map('api_map_reservation', api_fetch_all($pdo, 'select * from reservations'));
        if (api_has_reservation_overlap($reservations, [
            'tableId' => $tableId,
            'startAt' => $startAt,
            'endAt' => $endAt,
            'status' => 'scheduled',
        ])) {
            throw new ApiException(400, "Tanlangan vaqt boshqa bron bilan to'qnashmoqda");
        }

        $now = gmdate(DATE_ATOM);
        $reservationId = api_create_id('reservation');
        api_execute(
            $pdo,
            'insert into reservations (id, table_id, customer_name, phone, guests, note, start_at, end_at, status, created_at, updated_at)
             values (:id, :table_id, :customer_name, :phone, :guests, :note, :start_at, :end_at, :status, :created_at, :updated_at)',
            [
                'id' => $reservationId,
                'table_id' => $tableId,
                'customer_name' => $customerName,
                'phone' => $phone,
                'guests' => $guests,
                'note' => $note !== '' ? $note : null,
                'start_at' => $startAt,
                'end_at' => $endAt,
                'status' => 'scheduled',
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );
        api_append_audit_log($pdo, [
            'operatorId' => $operator['id'] ?? null,
            'action' => 'reservation.created',
            'entityType' => 'reservation',
            'entityId' => $reservationId,
            'description' => 'Yangi bron yaratildi',
            'metadata' => ['tableId' => $tableId, 'customerName' => $customerName],
        ]);

        $pdo->commit();
    } catch (Throwable $exception) {
        $pdo->rollBack();
        throw $exception;
    }
}

function api_update_reservation(array $config, array $operator, string $reservationId, array $input): void
{
    $pdo = api_pdo($config);
    $pdo->beginTransaction();
    try {
        $reservationRow = api_fetch_one($pdo, 'select * from reservations where id = :id limit 1', ['id' => $reservationId]);
        if (!$reservationRow) {
            throw new ApiException(400, 'Bron topilmadi');
        }

        $current = api_map_reservation($reservationRow);
        $nextReservation = [
            'id' => $current['id'],
            'tableId' => $current['tableId'],
            'customerName' => trim((string) ($input['customerName'] ?? $current['customerName'])),
            'phone' => trim((string) ($input['phone'] ?? $current['phone'])),
            'guests' => (int) ($input['guests'] ?? $current['guests']),
            'note' => array_key_exists('note', $input) ? trim((string) ($input['note'] ?? '')) : ($current['note'] ?? null),
            'startAt' => (string) ($input['startAt'] ?? $current['startAt']),
            'endAt' => (string) ($input['endAt'] ?? $current['endAt']),
            'status' => (string) ($input['status'] ?? $current['status']),
            'sessionId' => $current['sessionId'],
        ];

        api_assert_reservation_times($nextReservation['startAt'], $nextReservation['endAt']);

        $reservations = array_map('api_map_reservation', api_fetch_all($pdo, 'select * from reservations'));
        if (api_has_reservation_overlap($reservations, $nextReservation, $reservationId)) {
            throw new ApiException(400, "Yangilangan bron boshqa bron bilan to'qnashmoqda");
        }

        $now = gmdate(DATE_ATOM);
        $sessionId = $reservationRow['session_id'] ?: null;

        if (!empty($input['convertToSession'])) {
            if (in_array($current['status'], ['cancelled', 'completed'], true)) {
                throw new ApiException(400, "Yakunlangan yoki bekor qilingan bronni seansga aylantirib bo'lmaydi");
            }

            $activeSession = api_fetch_one(
                $pdo,
                "select * from table_sessions where table_id = :table_id and status = 'active' limit 1",
                ['table_id' => $reservationRow['table_id']]
            );
            if ($activeSession) {
                throw new ApiException(400, 'Bu stol hozir band');
            }

            $tableRow = api_fetch_one($pdo, 'select * from billiard_tables where id = :id limit 1', ['id' => $reservationRow['table_id']]);
            $settingsRow = api_fetch_one($pdo, 'select * from club_settings limit 1');
            if (!$tableRow || !$settingsRow) {
                throw new ApiException(400, 'Stol yoki klub sozlamalari topilmadi');
            }

            $sessionId = api_create_id('session');
            api_execute(
                $pdo,
                'insert into table_sessions (id, table_id, customer_name, note, started_at, hourly_rate_snapshot, status, created_at, updated_at)
                 values (:id, :table_id, :customer_name, :note, :started_at, :hourly_rate_snapshot, :status, :created_at, :updated_at)',
                [
                    'id' => $sessionId,
                    'table_id' => $reservationRow['table_id'],
                    'customer_name' => $nextReservation['customerName'],
                    'note' => $nextReservation['note'] ?: null,
                    'started_at' => $now,
                    'hourly_rate_snapshot' => $tableRow['type'] === 'vip' ? (int) $settingsRow['vip_hourly_rate'] : (int) $settingsRow['standard_hourly_rate'],
                    'status' => 'active',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
            $nextReservation['status'] = 'arrived';
        }

        api_execute(
            $pdo,
            'update reservations set customer_name = :customer_name, phone = :phone, guests = :guests, start_at = :start_at, end_at = :end_at, note = :note, status = :status, session_id = :session_id, updated_at = :updated_at where id = :id',
            [
                'customer_name' => $nextReservation['customerName'],
                'phone' => $nextReservation['phone'],
                'guests' => $nextReservation['guests'],
                'start_at' => $nextReservation['startAt'],
                'end_at' => $nextReservation['endAt'],
                'note' => $nextReservation['note'] ?: null,
                'status' => $nextReservation['status'],
                'session_id' => $sessionId,
                'updated_at' => $now,
                'id' => $reservationId,
            ]
        );
        api_append_audit_log($pdo, [
            'operatorId' => $operator['id'] ?? null,
            'action' => !empty($input['convertToSession']) ? 'reservation.converted' : 'reservation.updated',
            'entityType' => 'reservation',
            'entityId' => $reservationId,
            'description' => !empty($input['convertToSession']) ? "Bron faol seansga aylantirildi" : 'Bron yangilandi',
            'metadata' => [
                'status' => $nextReservation['status'],
                'sessionId' => $sessionId,
            ],
        ]);

        $pdo->commit();
    } catch (Throwable $exception) {
        $pdo->rollBack();
        throw $exception;
    }
}

function api_update_settings(array $config, array $operator, array $input): void
{
    $pdo = api_pdo($config);
    $pdo->beginTransaction();
    try {
        $settingsRow = api_fetch_one($pdo, 'select * from club_settings limit 1');
        if (!$settingsRow) {
            throw new ApiException(400, 'Klub sozlamalari topilmadi');
        }

        $now = gmdate(DATE_ATOM);
        api_execute(
            $pdo,
            'update club_settings set club_name = :club_name, currency = :currency, timezone = :timezone, operator_name = :operator_name, operator_email = :operator_email, standard_hourly_rate = :standard_hourly_rate, vip_hourly_rate = :vip_hourly_rate, show_activity_chart = :show_activity_chart, show_right_rail = :show_right_rail, updated_at = :updated_at where id = :id',
            [
                'club_name' => trim((string) ($input['clubName'] ?? $settingsRow['club_name'])) ?: $settingsRow['club_name'],
                'currency' => trim((string) ($input['currency'] ?? $settingsRow['currency'])) ?: $settingsRow['currency'],
                'timezone' => trim((string) ($input['timezone'] ?? $settingsRow['timezone'])) ?: $settingsRow['timezone'],
                'operator_name' => trim((string) ($input['operatorName'] ?? $settingsRow['operator_name'])) ?: $settingsRow['operator_name'],
                'operator_email' => strtolower(trim((string) ($input['operatorEmail'] ?? $settingsRow['operator_email']))) ?: $settingsRow['operator_email'],
                'standard_hourly_rate' => (int) ($input['standardHourlyRate'] ?? $settingsRow['standard_hourly_rate']),
                'vip_hourly_rate' => (int) ($input['vipHourlyRate'] ?? $settingsRow['vip_hourly_rate']),
                'show_activity_chart' => array_key_exists('showActivityChart', $input) ? (bool) $input['showActivityChart'] : api_boolean($settingsRow['show_activity_chart']),
                'show_right_rail' => array_key_exists('showRightRail', $input) ? (bool) $input['showRightRail'] : api_boolean($settingsRow['show_right_rail']),
                'updated_at' => $now,
                'id' => $settingsRow['id'],
            ]
        );

        if (!empty($input['tables']) && is_array($input['tables'])) {
            foreach ($input['tables'] as $table) {
                api_execute(
                    $pdo,
                    'update billiard_tables set name = :name, type = :type, updated_at = :updated_at where id = :id',
                    [
                        'name' => trim((string) ($table['name'] ?? '')),
                        'type' => in_array(($table['type'] ?? ''), ['standard', 'vip'], true) ? $table['type'] : 'standard',
                        'updated_at' => $now,
                        'id' => (string) ($table['id'] ?? ''),
                    ]
                );
            }
        }

        if (array_key_exists('operatorName', $input) || array_key_exists('operatorEmail', $input)) {
            $operatorRow = api_fetch_one($pdo, 'select * from operators order by created_at asc limit 1');
            if ($operatorRow) {
                api_execute(
                    $pdo,
                    'update operators set full_name = :full_name, email = :email, updated_at = :updated_at where id = :id',
                    [
                        'full_name' => trim((string) ($input['operatorName'] ?? $operatorRow['full_name'])) ?: $operatorRow['full_name'],
                        'email' => strtolower(trim((string) ($input['operatorEmail'] ?? $operatorRow['email']))) ?: $operatorRow['email'],
                        'updated_at' => $now,
                        'id' => $operatorRow['id'],
                    ]
                );
            }
        }

        api_append_audit_log($pdo, [
            'operatorId' => $operator['id'] ?? null,
            'action' => 'settings.updated',
            'entityType' => 'settings',
            'entityId' => $settingsRow['id'],
            'description' => 'Klub sozlamalari yangilandi',
            'metadata' => [
                'clubName' => trim((string) ($input['clubName'] ?? $settingsRow['club_name'])) ?: $settingsRow['club_name'],
                'tablesUpdated' => is_array($input['tables'] ?? null) ? count($input['tables']) : 0,
            ],
        ]);

        $pdo->commit();
    } catch (Throwable $exception) {
        $pdo->rollBack();
        throw $exception;
    }
}

function api_update_inventory(array $config, array $operator, array $input): void
{
    $action = (string) ($input['action'] ?? '');
    $productId = (string) ($input['productId'] ?? '');
    if ($action === '' || $productId === '') {
        throw new ApiException(400, "Ombor parametrlari noto'g'ri");
    }

    $pdo = api_pdo($config);
    $pdo->beginTransaction();
    try {
        $productRow = api_fetch_one($pdo, 'select * from products where id = :id limit 1', ['id' => $productId]);
        if (!$productRow) {
            throw new ApiException(400, 'Mahsulot topilmadi');
        }
        $product = api_map_product($productRow);
        $now = gmdate(DATE_ATOM);

        if ($action === 'product') {
            api_execute(
                $pdo,
                'update products set name = :name, price = :price, cost_price = :cost_price, stock = :stock, threshold = :threshold, is_active = :is_active, updated_at = :updated_at where id = :id',
                [
                    'name' => trim((string) ($input['name'] ?? $product['name'])) ?: $product['name'],
                    'price' => (int) ($input['price'] ?? $product['price']),
                    'cost_price' => (int) ($input['costPrice'] ?? $product['costPrice']),
                    'stock' => (int) ($input['stock'] ?? $product['stock']),
                    'threshold' => (int) ($input['threshold'] ?? $product['threshold']),
                    'is_active' => array_key_exists('isActive', $input) ? (bool) $input['isActive'] : $product['isActive'],
                    'updated_at' => $now,
                    'id' => $productId,
                ]
            );
            api_append_audit_log($pdo, [
                'operatorId' => $operator['id'] ?? null,
                'action' => 'inventory.product.updated',
                'entityType' => 'inventory',
                'entityId' => $productId,
                'description' => $product['name'] . ' mahsuloti yangilandi',
                'metadata' => [
                    'price' => (int) ($input['price'] ?? $product['price']),
                    'stock' => (int) ($input['stock'] ?? $product['stock']),
                    'isActive' => array_key_exists('isActive', $input) ? (bool) $input['isActive'] : $product['isActive'],
                ],
            ]);
            $pdo->commit();
            return;
        }

        $type = (string) ($input['type'] ?? '');
        $quantity = (int) ($input['quantity'] ?? 0);
        $reason = trim((string) ($input['reason'] ?? ''));
        if (!in_array($type, ['in', 'out', 'correction'], true) || $reason === '') {
            throw new ApiException(400, "Ombor harakati noto'g'ri");
        }
        if ($type !== 'correction' && $quantity <= 0) {
            throw new ApiException(400, "Kirim va chiqim uchun miqdor musbat bo'lishi kerak");
        }

        if ($type === 'out') {
            $records = api_fetch_orders_and_items($pdo);
            $reserved = api_get_reserved_stock($product['id'], $records['orders'], $records['orderItems']);
            $available = $product['stock'] - $reserved;
            if ($available < $quantity) {
                throw new ApiException(400, 'Qoldiq yetarli emas');
            }
        }

        $nextStock = $type === 'in'
            ? $product['stock'] + $quantity
            : ($type === 'out' ? $product['stock'] - $quantity : $quantity);

        api_execute(
            $pdo,
            'update products set stock = :stock, updated_at = :updated_at where id = :id',
            ['stock' => $nextStock, 'updated_at' => $now, 'id' => $productId]
        );
        api_execute(
            $pdo,
            'insert into stock_movements (id, product_id, order_id, session_id, type, quantity, reason, resulting_stock, created_at)
             values (:id, :product_id, :order_id, :session_id, :type, :quantity, :reason, :resulting_stock, :created_at)',
            [
                'id' => api_create_id('movement'),
                'product_id' => $productId,
                'order_id' => null,
                'session_id' => null,
                'type' => $type,
                'quantity' => $quantity,
                'reason' => $reason,
                'resulting_stock' => $nextStock,
                'created_at' => $now,
            ]
        );
        api_append_audit_log($pdo, [
            'operatorId' => $operator['id'] ?? null,
            'action' => 'inventory.stock.updated',
            'entityType' => 'inventory',
            'entityId' => $productId,
            'description' => $product['name'] . ' uchun ombor harakati yozildi',
            'metadata' => [
                'type' => $type,
                'quantity' => $quantity,
                'resultingStock' => $nextStock,
            ],
        ]);

        $pdo->commit();
    } catch (Throwable $exception) {
        $pdo->rollBack();
        throw $exception;
    }
}

function api_update_operator_role(array $config, array $actor, string $operatorId, array $input): void
{
    $role = (string) ($input['role'] ?? '');
    if (!in_array($role, ['admin', 'cashier'], true)) {
        throw new ApiException(400, "Ruxsat noto'g'ri");
    }

    $pdo = api_pdo($config);
    $operatorRow = api_fetch_one($pdo, 'select * from operators where id = :id limit 1', ['id' => $operatorId]);
    if (!$operatorRow) {
        throw new ApiException(404, 'Operator topilmadi');
    }

    $now = gmdate(DATE_ATOM);
    api_execute(
        $pdo,
        'update operators set role = :role, updated_at = :updated_at where id = :id',
        [
            'role' => $role,
            'updated_at' => $now,
            'id' => $operatorId,
        ]
    );

    api_append_audit_log($pdo, [
        'operatorId' => $actor['id'] ?? null,
        'action' => 'operator.role.updated',
        'entityType' => 'operator',
        'entityId' => $operatorId,
        'description' => $operatorRow['full_name'] . ' roli yangilandi',
        'metadata' => ['role' => $role],
    ]);
}
