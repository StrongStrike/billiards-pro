<?php

declare(strict_types=1);

require __DIR__ . '/lib-core.php';
require __DIR__ . '/lib-auth.php';
require __DIR__ . '/lib-read.php';
require __DIR__ . '/lib-report.php';
require __DIR__ . '/lib-write.php';

function api_run(): void
{
    $config = api_load_config();
    api_apply_cors($config);

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        return;
    }

    try {
        $route = api_route();
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

        if ($method === 'POST' && $route === '/auth/login') {
            api_json_response(api_login_handler($config));
            return;
        }

        if ($method === 'POST' && $route === '/auth/logout') {
            api_json_response(['ok' => true]);
            return;
        }

        if ($method === 'GET' && ($route === '/' || $route === '/health')) {
            $pdo = api_pdo($config);
            api_fetch_one($pdo, 'select 1 as ok');
            api_json_response([
                'ok' => true,
                'service' => 'billiards-cpanel-api',
                'generatedAt' => gmdate(DATE_ATOM),
            ]);
            return;
        }

        $operator = api_require_operator($config);

        if ($method === 'GET' && $route === '/bootstrap') {
            api_json_response(api_get_bootstrap_payload($config, $operator));
            return;
        }

        if ($method === 'GET' && $route === '/dashboard/activity') {
            api_json_response(api_get_dashboard_activity($config));
            return;
        }

        if ($method === 'GET' && $route === '/dashboard/overview') {
            $payload = api_get_bootstrap_payload($config, $operator);
            api_json_response([
                'operator' => $payload['operator'],
                'settings' => $payload['settings'],
                'tables' => $payload['tables'],
                'reservations' => $payload['reservations'],
                'kpis' => $payload['kpis'],
                'generatedAt' => $payload['generatedAt'],
            ]);
            return;
        }

        if ($method === 'GET' && $route === '/reports') {
            api_require_role($operator, ['admin']);
            $range = $_GET['range'] ?? 'day';
            if (!in_array($range, ['day', 'week', 'month', 'year'], true)) {
                $range = 'day';
            }
            api_json_response(api_build_report($config, (string) $range));
            return;
        }

        if ($method === 'GET' && $route === '/settings') {
            api_require_role($operator, ['admin']);
            api_json_response(api_get_bootstrap_payload($config, $operator)['settings']);
            return;
        }

        if ($method === 'PATCH' && $route === '/settings') {
            api_require_role($operator, ['admin']);
            api_update_settings($config, $operator, api_request_json());
            api_json_response(['ok' => true]);
            return;
        }

        if ($method === 'GET' && $route === '/inventory') {
            api_require_role($operator, ['admin']);
            $payload = api_get_bootstrap_payload($config, $operator);
            api_json_response([
                'products' => $payload['products'],
                'stockMovements' => $payload['stockMovements'],
            ]);
            return;
        }

        if ($method === 'PATCH' && $route === '/inventory') {
            api_require_role($operator, ['admin']);
            api_update_inventory($config, $operator, api_request_json());
            api_json_response(['ok' => true]);
            return;
        }

        if ($method === 'POST' && $route === '/orders') {
            api_create_table_order($config, $operator, api_request_json());
            api_json_response(['ok' => true]);
            return;
        }

        if ($method === 'POST' && $route === '/counter-sales') {
            api_create_counter_sale($config, $operator, api_request_json());
            api_json_response(['ok' => true]);
            return;
        }

        if ($method === 'POST' && $route === '/cash-movements') {
            api_create_cash_movement($config, $operator, api_request_json());
            api_json_response(['ok' => true]);
            return;
        }

        if ($method === 'POST' && $route === '/bill-adjustments') {
            api_create_bill_adjustment($config, $operator, api_request_json());
            api_json_response(['ok' => true]);
            return;
        }

        if ($method === 'GET' && $route === '/shifts/current') {
            $state = api_load_state($config);
            api_json_response(['shift' => api_current_shift($state)]);
            return;
        }

        if ($method === 'POST' && $route === '/shifts/open') {
            api_open_shift($config, $operator, api_request_json());
            api_json_response(['ok' => true]);
            return;
        }

        if ($method === 'POST' && $route === '/shifts/pause') {
            api_pause_shift($config, $operator, api_request_json());
            api_json_response(['ok' => true]);
            return;
        }

        if ($method === 'POST' && $route === '/shifts/resume') {
            api_resume_shift($config, $operator, api_request_json());
            api_json_response(['ok' => true]);
            return;
        }

        if ($method === 'POST' && $route === '/shifts/close') {
            api_close_shift($config, $operator, api_request_json());
            api_json_response(['ok' => true]);
            return;
        }

        if ($method === 'GET' && $route === '/audit') {
            api_require_role($operator, ['admin']);
            $state = api_load_state($config);
            api_json_response(['auditLogs' => array_slice($state['auditLogs'], 0, 80)]);
            return;
        }

        if ($method === 'PATCH' && preg_match('#^/operators/([^/]+)/role$#', $route, $matches)) {
            api_require_role($operator, ['admin']);
            api_update_operator_role($config, $operator, $matches[1], api_request_json());
            api_json_response(['ok' => true]);
            return;
        }

        if ($method === 'POST' && $route === '/reservations') {
            api_create_reservation($config, $operator, api_request_json());
            api_json_response(['ok' => true]);
            return;
        }

        if ($method === 'PATCH' && preg_match('#^/reservations/([^/]+)$#', $route, $matches)) {
            api_update_reservation($config, $operator, $matches[1], api_request_json());
            api_json_response(['ok' => true]);
            return;
        }

        if ($method === 'GET' && $route === '/tables') {
            $payload = api_get_bootstrap_payload($config, $operator);
            api_json_response([
                'tables' => $payload['tables'],
                'settings' => $payload['settings'],
            ]);
            return;
        }

        if ($method === 'POST' && preg_match('#^/tables/([^/]+)/session/start$#', $route, $matches)) {
            api_start_table_session($config, $operator, $matches[1], api_request_json());
            api_json_response(['ok' => true]);
            return;
        }

        if ($method === 'POST' && preg_match('#^/tables/([^/]+)/session/stop$#', $route, $matches)) {
            api_stop_table_session($config, $operator, $matches[1], api_request_json());
            api_json_response(['ok' => true]);
            return;
        }

        throw new ApiException(404, 'Route topilmadi');
    } catch (ApiException $exception) {
        api_json_response(['message' => $exception->getMessage()], $exception->status);
    } catch (Throwable $exception) {
        api_json_response(['message' => $exception->getMessage()], 500);
    }
}
