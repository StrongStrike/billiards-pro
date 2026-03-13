# Billiards Pro Tashkent

Uzbek Latin tilidagi professional ichki admin panel: rus billiard stollari, bronlar, bar buyurtmalari, ombor va hisobotlarni boshqarish uchun.

## Ishlaydigan production sxema

- Frontend: `Vercel`
- Backend/API: `cPanel` ichidagi `PHP 8 + PostgreSQL`
- Database: `cPanel` ichidagi `PostgreSQL`
- Auth: `operators` jadvali + bearer token

Bu hostingda tashqi `5432` port yopiq bo'lgani uchun `Vercel -> PostgreSQL` to'g'ridan-to'g'ri sxemasi ishlamaydi. Shu sabab loyiha `Vercel frontend + cPanel API + cPanel PostgreSQL` modeliga moslashtirilgan.

## Muhim domen qoidasi

`vercel.app` frontend uchun yetadi, lekin `cPanel` backend uchun alohida ishlaydigan domain yoki subdomain kerak. Agar backend `elite-electronics.uz/api` da ishlasa, `elite-electronics.uz` ni o'chirib yubormang. Uni backend host sifatida qoldirish kerak, yoki o'rniga cPanel ga qaragan boshqa domain/subdomain tayyorlash kerak.

Hozirgi hostingda darhol ishlaydigan variant:

- frontend: `https://your-project.vercel.app`
- backend: `https://cp70.sp-server.net/~odilbek/api`

Eng sodda custom-domain variant:

- frontend: `https://your-project.vercel.app`
- backend: `https://elite-electronics.uz/api`

Yaxshiroq variant:

- frontend: `https://your-brand.uz` -> Vercel
- backend: `https://api.your-brand.uz` -> cPanel

## Stack

- `pnpm`
- `Next.js 16.1.6`
- `React 19.2.4`
- `TypeScript 5.9.3`
- `Tailwind CSS 4`
- `TanStack Query`
- `Recharts`
- `React Hook Form`
- `Zod`
- `Drizzle ORM`
- `PostgreSQL`
- `PHP 8.1`
- `date-fns-tz`

## Frontend env

Frontend tashqi API bilan ishlashi uchun `.env.local` ichida kamida shuni kiriting:

```env
NEXT_PUBLIC_API_BASE_URL=https://cp70.sp-server.net/~odilbek/api
```

Shundan keyin:

```bash
pnpm install
pnpm dev
```

App `http://localhost:3000` da ochiladi va ma'lumotlarni cPanel backend dan oladi.

## Local monolith va DB maintenance env

Repo ichida hali ham local Next API va Drizzle seed/migration oqimi saqlangan. Bu lokal diagnostika yoki DB maintenance uchun kerak:

```env
NEXT_PUBLIC_API_BASE_URL=
DATABASE_URL=postgresql://user:password@127.0.0.1:5432/db_name?sslmode=disable
AUTH_SESSION_SECRET=uzun_random_maxfiy_kalit
SEED_ADMIN_EMAIL=admin@billiards.uz
SEED_ADMIN_PASSWORD=BilliardsPro2026!
SEED_ADMIN_NAME=Aziz Manager
```

## cPanel deploy tartibi

1. `PostgreSQL Databases` ichida baza va user yarating.
2. User ga bazaga to'liq huquq bering.
3. `cpanel-api` katalogini `~/public_html/api` ga yuklang.
4. `config.local.php` yarating.
5. SQL migratsiyalarni bajaring.
6. Seed ni yuklang.
7. `GET /api/health` ni tekshiring.
8. Vercel da `NEXT_PUBLIC_API_BASE_URL` ni backend URL ga qo'ying.

## Joriy production endpoint

Backend hozir quyidagi URL da ishlayapti:

```text
https://cp70.sp-server.net/~odilbek/api
```

`elite-electronics.uz` DNS yoki WHM tomondan to'g'ri ulangach, xohlasangiz backend ni keyin `https://elite-electronics.uz/api` ga ko'chirasiz.

## cPanel config.local.php namunasi

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

## SQL bootstrap

Schema:

```bash
psql -h 127.0.0.1 -U odilbek_billiards_app -d odilbek_billiards -f drizzle/0000_initial_schema.sql
psql -h 127.0.0.1 -U odilbek_billiards_app -d odilbek_billiards -f drizzle/0001_cpanel_operator_auth.sql
```

Seed SQL generatsiya:

```bash
pnpm exec tsx scripts/export-seed-sql.ts > seed.sql
```

Seed apply:

```bash
psql -h 127.0.0.1 -U odilbek_billiards_app -d odilbek_billiards -f seed.sql
```

## Asosiy xususiyatlar

- Dashboard, stollar, buyurtmalar, bronlar, hisobotlar, ombor va sozlamalar bir xil route surface bilan ishlaydi.
- Frontend `NEXT_PUBLIC_API_BASE_URL` mavjud bo'lsa tashqi cPanel API ga ulanadi.
- Hisobotlar va dashboard KPI lar `club_settings.timezone` ga tayanadi.
- Valyuta butun UI bo'ylab `club_settings.currency` dan olinadi.
- Bronlar sahifasida kunlik timeline mavjud.
- Stol buyurtmalari stock ni rezerv qiladi, ammo checkout ni o'zining rezervlari bilan bloklamaydi.

## Scripts

- `pnpm dev` - frontend local dev
- `pnpm build` - production build
- `pnpm start` - production server
- `pnpm lint` - ESLint
- `pnpm test` - Vitest
- `pnpm db:push` - local Drizzle push
- `pnpm db:seed` - local Postgres seed
- `pnpm exec tsx scripts/export-seed-sql.ts > seed.sql` - cPanel uchun seed SQL tayyorlash

## Vercel deploy

1. GitHub ga push qiling.
2. Vercel ichida repo ni import qiling.
3. `NEXT_PUBLIC_API_BASE_URL` ni kiriting.
4. Deploy qiling.
5. Frontend ochilgandan keyin login cPanel backend dagi operator bilan ishlaydi.

## Backend health check

- `GET /api/health`

U `200 OK` va JSON qaytarishi kerak:

```json
{
  "ok": true,
  "service": "billiards-cpanel-api"
}
```

## Main routes

- `/login`
- `/dashboard`
- `/stollar`
- `/buyurtmalar`
- `/bronlar`
- `/hisobotlar`
- `/ombor`
- `/sozlamalar`
