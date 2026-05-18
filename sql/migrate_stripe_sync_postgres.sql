ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description               VARCHAR(500),
  ADD COLUMN IF NOT EXISTS stripe_created_at         BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_stripe_payment_intent_id'
  ) THEN
    ALTER TABLE donations
      ADD CONSTRAINT uq_stripe_payment_intent_id UNIQUE (stripe_payment_intent_id);
  END IF;
END;
$$;
