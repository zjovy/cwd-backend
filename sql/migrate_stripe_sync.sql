ALTER TABLE donations
  ADD COLUMN stripe_payment_intent_id VARCHAR(255) NULL,
  ADD COLUMN description               VARCHAR(500) NULL,
  ADD COLUMN stripe_created_at         BIGINT       NULL,
  ADD UNIQUE KEY idx_stripe_pi_id (stripe_payment_intent_id);
