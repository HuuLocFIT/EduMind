SET search_path TO course;

ALTER TABLE enrollments
ADD COLUMN IF NOT EXISTS certificate_reference VARCHAR(50);

COMMENT ON COLUMN enrollments.certificate_reference IS 'UUID-based reference for certificate verification URL. Prevents sequential enumeration.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_certificate_reference
ON enrollments(certificate_reference)
WHERE certificate_reference IS NOT NULL;
