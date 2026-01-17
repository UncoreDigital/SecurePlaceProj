-- Create Certificates Table for Supabase Database
-- This script creates a table to store certificate information for safety training completion

-- Create certificate status enum
CREATE TYPE certificate_status AS ENUM ('draft', 'issued', 'revoked', 'expired');

-- Create certificates table
CREATE TABLE certificates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Certificate Details
    title VARCHAR(255) NOT NULL DEFAULT 'Certificate of Completion',
    certificate_number VARCHAR(100) UNIQUE NOT NULL,
    
    -- Recipient Information
    recipient_name VARCHAR(255) NOT NULL,
    
    -- Organization Information
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    firm_name VARCHAR(255) NOT NULL,
    
    -- Certificate Metadata
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status certificate_status DEFAULT 'issued',
    
    -- Signature Information
    signer_name VARCHAR(255),
    
    -- Audit Fields
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
);

-- Create indexes for better performance
CREATE INDEX idx_certificates_firm_id ON certificates(firm_id);
CREATE INDEX idx_certificates_status ON certificates(status);
CREATE INDEX idx_certificates_issue_date ON certificates(issue_date);
CREATE INDEX idx_certificates_certificate_number ON certificates(certificate_number);