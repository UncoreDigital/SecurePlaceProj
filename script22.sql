-- Add certificate_details column to certificates table

ALTER TABLE certificates
ADD COLUMN certificate_details TEXT;

COMMENT ON COLUMN certificates.certificate_details IS 'Additional details for the certificate';
