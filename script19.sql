-- Certificate Number Auto-Increment Setup
-- This script creates a simple sequence for certificate numbers
-- Use nextval('certificate_number_seq') to get the next number

-- Create a sequence for certificate numbers
CREATE SEQUENCE IF NOT EXISTS certificate_number_seq START 1;

-- Create function to get next certificate number (optional helper)
CREATE OR REPLACE FUNCTION get_next_certificate_number()
RETURNS INTEGER AS $$
BEGIN
    RETURN nextval('certificate_number_seq');
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON SEQUENCE certificate_number_seq IS 'Sequence for auto-incrementing certificate numbers';
COMMENT ON FUNCTION get_next_certificate_number() IS 'Helper function to get next certificate number';

-- View to check certificate numbering
CREATE OR REPLACE VIEW certificate_numbering_info AS
SELECT 
    'Current Sequence Value' as info_type,
    currval('certificate_number_seq')::TEXT as value
UNION ALL
SELECT 
    'Next Certificate Number' as info_type,
    (currval('certificate_number_seq') + 1)::TEXT as value
UNION ALL
SELECT 
    'Total Certificates' as info_type,
    COUNT(*)::TEXT as value
FROM certificates;

COMMENT ON VIEW certificate_numbering_info IS 'Shows current certificate numbering information';

-- Usage Examples:
-- Get next certificate number: SELECT nextval('certificate_number_seq');
-- Or use helper function: SELECT get_next_certificate_number();