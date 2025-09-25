-- Migration: Add firm_admins table
-- Run this in your Supabase SQL Editor

-- Create Firm Admins table (dedicated table for firm administrators)
CREATE TABLE IF NOT EXISTS firm_admins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    official_email VARCHAR(255),
    employee_code VARCHAR(50),
    department VARCHAR(100),
    position VARCHAR(100),
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, firm_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_firm_admins_user_id ON firm_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_firm_admins_firm_id ON firm_admins(firm_id);
CREATE INDEX IF NOT EXISTS idx_firm_admins_email ON firm_admins(email);

-- Enable RLS
ALTER TABLE firm_admins ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for firm_admins
CREATE POLICY "Super admins can manage all firm admins" ON firm_admins
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Firm admins can manage admins in their firm" ON firm_admins
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'firm_admin' 
            AND firm_id = firm_admins.firm_id
        )
    );

CREATE POLICY "Users can view their own firm admin record" ON firm_admins
    FOR SELECT USING (user_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_firm_admins_updated_at 
    BEFORE UPDATE ON firm_admins 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
