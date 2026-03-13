<?php

return [
    'app_secret' => '',
    'allowed_origins' => [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://*.vercel.app',
        'https://elite-electronics.uz',
    ],
    'db' => [
        'host' => '127.0.0.1',
        'port' => 5432,
        'name' => 'odilbek_billiards',
        'user' => 'odilbek_billiards_app',
        'password' => '',
        'sslmode' => 'disable',
    ],
];
