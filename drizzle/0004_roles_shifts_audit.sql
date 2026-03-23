DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'operator_role') THEN
    CREATE TYPE operator_role AS ENUM ('admin', 'cashier');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_status') THEN
    CREATE TYPE shift_status AS ENUM ('open', 'paused', 'closed');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_event_type') THEN
    CREATE TYPE shift_event_type AS ENUM ('opened', 'paused', 'resumed', 'closed');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'operators' AND column_name = 'role'
  ) THEN
    ALTER TABLE operators
      ADD COLUMN role operator_role NOT NULL DEFAULT 'admin';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS shifts (
  id text PRIMARY KEY,
  status shift_status NOT NULL,
  opening_cash integer NOT NULL DEFAULT 0,
  closing_cash integer,
  opened_by_operator_id text REFERENCES operators(id) ON DELETE SET NULL,
  closed_by_operator_id text REFERENCES operators(id) ON DELETE SET NULL,
  note text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  paused_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shift_events (
  id text PRIMARY KEY,
  shift_id text NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  operator_id text REFERENCES operators(id) ON DELETE SET NULL,
  type shift_event_type NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id text PRIMARY KEY,
  operator_id text REFERENCES operators(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  description text NOT NULL,
  metadata text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_movements' AND column_name = 'shift_id'
  ) THEN
    ALTER TABLE cash_movements
      ADD COLUMN shift_id text REFERENCES shifts(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bill_adjustments' AND column_name = 'shift_id'
  ) THEN
    ALTER TABLE bill_adjustments
      ADD COLUMN shift_id text REFERENCES shifts(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE bill_adjustments
  ALTER COLUMN reason DROP NOT NULL;
