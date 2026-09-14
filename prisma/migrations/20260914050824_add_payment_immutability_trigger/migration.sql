-- Prevent any UPDATE or DELETE on Payment rows. Corrections must go
-- through PaymentReversal instead. This is enforced at the database level
-- so it holds even if application code has a bug or is bypassed entirely.
CREATE OR REPLACE FUNCTION "preventPaymentMutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Payment rows are immutable. Insert a PaymentReversal instead of updating or deleting.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_immutable_update
  BEFORE UPDATE ON "Payment"
  FOR EACH ROW
  EXECUTE FUNCTION "preventPaymentMutation"();

CREATE TRIGGER payment_immutable_delete
  BEFORE DELETE ON "Payment"
  FOR EACH ROW
  EXECUTE FUNCTION "preventPaymentMutation"();
