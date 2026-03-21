# cPanel API

Bu katalog `frontend Vercel + backend/API cPanel + PostgreSQL cPanel` sxemasi uchun PHP backend.

## Deploy joyi

Fayllarni `~/public_html/api` ichiga joylashtiring.

## Asosiy endpointlar

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/bootstrap`
- `GET /api/dashboard/activity`
- `GET /api/reports?range=day|month|year`
- `PATCH /api/settings`
- `PATCH /api/inventory`
- `POST /api/orders`
- `POST /api/counter-sales`
- `POST /api/bill-adjustments`
- `POST /api/reservations`
- `PATCH /api/reservations/{id}`
- `POST /api/tables/{id}/session/start`
- `POST /api/tables/{id}/session/stop`

## Konfiguratsiya

`config.local.php` ni `config.example.php` asosida yarating.

Minimal misol:

```php
<?php

return [
    'app_secret' => 'uzun-random-maxfiy-kalit',
    'allowed_origins' => [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://*.vercel.app',
        'https://your-frontend-domain.example',
    ],
    'db' => [
        'host' => '127.0.0.1',
        'port' => 5432,
        'name' => 'odilbek_billiards',
        'user' => 'odilbek_billiards_app',
        'password' => 'postgres-password',
        'sslmode' => 'disable',
    ],
];
```

## Eslatma

- Free `vercel.app` frontend uchun yetadi, lekin cPanel backend uchun alohida ishlaydigan domain yoki subdomain kerak.
- Agar backend `elite-electronics.uz/api` da ishlasa, shu domain DNS orqali serverga yechilayotgan bo'lishi kerak.
