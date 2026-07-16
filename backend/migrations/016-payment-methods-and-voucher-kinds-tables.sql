-- Catálogos de medios de pago y tipos de voucher (fuera de companies.settings JSON)

CREATE TABLE IF NOT EXISTS company_voucher_kinds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  face_value_mode VARCHAR(16) NOT NULL DEFAULT 'OPEN',
  default_face_value NUMERIC(15, 2) NULL,
  require_face_value BOOLEAN NOT NULL DEFAULT false,
  default_issuer_name VARCHAR(255) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_company_voucher_kinds_company
  ON company_voucher_kinds (company_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_voucher_kinds_company_code_alive
  ON company_voucher_kinds (company_id, code)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS company_payment_methods (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  method VARCHAR(40) NOT NULL,
  alias VARCHAR(255) NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  require_reference BOOLEAN NOT NULL DEFAULT false,
  bank_account_key VARCHAR(120) NULL,
  metadata JSONB NULL,
  voucher_kind_id UUID NULL REFERENCES company_voucher_kinds(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_company_payment_methods_company
  ON company_payment_methods (company_id);

CREATE INDEX IF NOT EXISTS idx_company_payment_methods_voucher_kind
  ON company_payment_methods (voucher_kind_id)
  WHERE voucher_kind_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS pos_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  point_of_sale_id UUID NOT NULL REFERENCES points_of_sale(id) ON DELETE CASCADE,
  company_payment_method_id UUID NOT NULL REFERENCES company_payment_methods(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  preload_on_payment_screen BOOLEAN NOT NULL DEFAULT false,
  preload_order INT NULL,
  is_default_for_change BOOLEAN NOT NULL DEFAULT false,
  bank_account_key VARCHAR(120) NULL,
  require_reference BOOLEAN NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT UQ_pos_payment_methods_pos_cmp UNIQUE (point_of_sale_id, company_payment_method_id)
);

CREATE INDEX IF NOT EXISTS idx_pos_payment_methods_pos
  ON pos_payment_methods (point_of_sale_id);

-- Backfill voucher kinds from settings.voucherKinds
DO $$
DECLARE
  rec RECORD;
  kind_item JSONB;
  kind_id UUID;
  kind_code TEXT;
  kind_name TEXT;
  seq INT;
  require_fv BOOLEAN;
BEGIN
  FOR rec IN
    SELECT id AS company_id, settings::jsonb AS settings
    FROM companies
    WHERE settings IS NOT NULL
      AND settings::jsonb ? 'voucherKinds'
      AND jsonb_typeof(settings::jsonb->'voucherKinds') = 'array'
  LOOP
    seq := 0;
    FOR kind_item IN SELECT * FROM jsonb_array_elements(rec.settings->'voucherKinds')
    LOOP
      seq := seq + 1;
      kind_code := upper(regexp_replace(coalesce(kind_item->>'code', ''), '[^A-Z0-9_-]', '', 'g'));
      IF kind_code IS NULL OR kind_code = '' THEN
        kind_code := 'VK' || lpad(seq::text, 5, '0');
      END IF;
      -- Prefer VK##### style if legacy code is free-form; keep legacy if unique
      kind_name := nullif(trim(coalesce(kind_item->>'name', '')), '');
      IF kind_name IS NULL THEN
        kind_name := kind_code;
      END IF;
      require_fv := coalesce((kind_item->>'requireFaceValue')::boolean, false)
        OR kind_item->>'requireFaceValue' IN ('1', 'true', 'TRUE');
      kind_id := gen_random_uuid();
      INSERT INTO company_voucher_kinds (
        id, company_id, code, name, is_active, face_value_mode,
        default_face_value, require_face_value, default_issuer_name
      ) VALUES (
        kind_id,
        rec.company_id,
        kind_code,
        kind_name,
        coalesce((kind_item->>'isActive')::boolean, true)
          OR kind_item->>'isActive' IN ('1', 'true', 'TRUE')
          OR NOT (kind_item ? 'isActive'),
        'OPEN',
        NULL,
        require_fv,
        nullif(trim(coalesce(kind_item->>'defaultIssuerName', '')), '')
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Backfill company payment methods from settings.paymentMethods
DO $$
DECLARE
  rec RECORD;
  pm JSONB;
  pm_id UUID;
  pm_method TEXT;
  vk_id UUID;
BEGIN
  FOR rec IN
    SELECT id AS company_id, settings::jsonb AS settings
    FROM companies
    WHERE settings IS NOT NULL
      AND settings::jsonb ? 'paymentMethods'
      AND jsonb_typeof(settings::jsonb->'paymentMethods') = 'array'
  LOOP
    FOR pm IN SELECT * FROM jsonb_array_elements(rec.settings->'paymentMethods')
    LOOP
      BEGIN
        pm_id := (pm->>'id')::uuid;
      EXCEPTION WHEN others THEN
        pm_id := gen_random_uuid();
      END;
      pm_method := upper(trim(coalesce(pm->>'method', '')));
      IF pm_method = '' THEN
        CONTINUE;
      END IF;
      vk_id := NULL;
      IF pm_method = 'VOUCHER' THEN
        -- Enlace best-effort: primer kind activo de la empresa
        SELECT id INTO vk_id
        FROM company_voucher_kinds
        WHERE company_id = rec.company_id AND deleted_at IS NULL AND is_active = true
        ORDER BY code
        LIMIT 1;
      END IF;
      INSERT INTO company_payment_methods (
        id, company_id, method, alias, display_order, is_active,
        require_reference, bank_account_key, metadata, voucher_kind_id
      ) VALUES (
        pm_id,
        rec.company_id,
        pm_method,
        nullif(trim(coalesce(pm->>'alias', '')), ''),
        coalesce((pm->>'displayOrder')::int, 0),
        CASE
          WHEN pm ? 'isActive' THEN coalesce((pm->>'isActive')::boolean, true)
          ELSE true
        END,
        coalesce((pm->>'requireReference')::boolean, false)
          OR pm_method IN ('CUSTOMER_CREDIT_NOTE', 'ORDER_ADVANCE', 'VOUCHER'),
        nullif(trim(coalesce(pm->>'bankAccountKey', '')), ''),
        CASE WHEN pm ? 'metadata' THEN pm->'metadata' ELSE NULL END,
        vk_id
      )
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Backfill POS payment methods
DO $$
DECLARE
  pos_rec RECORD;
  pm JSONB;
  cmp_id UUID;
BEGIN
  FOR pos_rec IN
    SELECT id AS pos_id, settings::jsonb AS settings
    FROM points_of_sale
    WHERE settings IS NOT NULL
      AND settings::jsonb ? 'paymentMethods'
      AND jsonb_typeof(settings::jsonb->'paymentMethods') = 'array'
  LOOP
    FOR pm IN SELECT * FROM jsonb_array_elements(pos_rec.settings->'paymentMethods')
    LOOP
      BEGIN
        cmp_id := (pm->>'companyPaymentMethodId')::uuid;
      EXCEPTION WHEN others THEN
        CONTINUE;
      END;
      IF NOT EXISTS (SELECT 1 FROM company_payment_methods WHERE id = cmp_id) THEN
        CONTINUE;
      END IF;
      INSERT INTO pos_payment_methods (
        point_of_sale_id, company_payment_method_id, is_enabled,
        preload_on_payment_screen, preload_order, is_default_for_change,
        bank_account_key, require_reference
      ) VALUES (
        pos_rec.pos_id,
        cmp_id,
        coalesce((pm->>'isEnabled')::boolean, true),
        coalesce((pm->>'preloadOnPaymentScreen')::boolean, false),
        CASE WHEN pm->>'preloadOrder' IS NULL OR pm->>'preloadOrder' = 'null'
          THEN NULL ELSE (pm->>'preloadOrder')::int END,
        coalesce((pm->>'isDefaultForChange')::boolean, false),
        nullif(trim(coalesce(pm->>'bankAccountKey', '')), ''),
        CASE
          WHEN pm->>'requireReference' IS NULL OR pm->>'requireReference' = 'null' THEN NULL
          ELSE (pm->>'requireReference')::boolean
        END
      )
      ON CONFLICT ON CONSTRAINT UQ_pos_payment_methods_pos_cmp DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Strip migrated keys from settings (source of truth = tables)
UPDATE companies
SET settings = (settings::jsonb - 'paymentMethods' - 'voucherKinds')::json
WHERE settings IS NOT NULL
  AND (settings::jsonb ? 'paymentMethods' OR settings::jsonb ? 'voucherKinds');

UPDATE points_of_sale
SET settings = (settings::jsonb - 'paymentMethods')::json
WHERE settings IS NOT NULL
  AND settings::jsonb ? 'paymentMethods';

-- FK from promotion scopes (only rows that resolve to existing methods)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_promo_scope_pm_company_pm'
  ) THEN
    -- Drop orphan scope rows that no longer resolve
    DELETE FROM promotion_scope_payment_methods pspm
    WHERE NOT EXISTS (
      SELECT 1 FROM company_payment_methods cpm
      WHERE cpm.id = pspm.company_payment_method_id
    );
    ALTER TABLE promotion_scope_payment_methods
      ADD CONSTRAINT fk_promo_scope_pm_company_pm
      FOREIGN KEY (company_payment_method_id)
      REFERENCES company_payment_methods(id)
      ON DELETE RESTRICT;
  END IF;
END $$;
