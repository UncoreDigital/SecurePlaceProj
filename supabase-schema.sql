-- Supabase Database Schema for SecurePlace App
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('super_admin', 'firm_admin', 'employee');
CREATE TYPE emergency_status AS ENUM ('reported', 'in_progress', 'resolved', 'cancelled');
CREATE TYPE class_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- Firms table
CREATE TABLE firms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(255),
    address TEXT,
    phone VARCHAR(20),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    contact_email VARCHAR(255),
    website VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'employee',
    firm_id UUID REFERENCES firms(id) ON DELETE SET NULL,
    phone VARCHAR(20),
    official_email VARCHAR(255),
    employee_code VARCHAR(50),
    is_volunteer BOOLEAN DEFAULT false,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Firm Admins table (dedicated table for firm administrators)
CREATE TABLE firm_admins (
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

-- Locations table
CREATE TABLE locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safety Classes table
CREATE TABLE safety_classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url TEXT,
    duration_minutes INTEGER DEFAULT 30,
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled Classes table
CREATE TABLE scheduled_classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    safety_class_id UUID REFERENCES safety_classes(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
    instructor_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status class_status DEFAULT 'scheduled',
    max_participants INTEGER DEFAULT 50,
    current_participants INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Class Participants table
CREATE TABLE class_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    scheduled_class_id UUID REFERENCES scheduled_classes(id) ON DELETE CASCADE NOT NULL,
    participant_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    attended BOOLEAN DEFAULT false,
    completion_date TIMESTAMP WITH TIME ZONE,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(scheduled_class_id, participant_id)
);

-- Emergencies table
CREATE TABLE emergencies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    reported_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status emergency_status DEFAULT 'reported',
    severity INTEGER CHECK (severity >= 1 AND severity <= 5) DEFAULT 1,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drills table
CREATE TABLE drills (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    drill_type VARCHAR(100) NOT NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    participants_count INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drill Participants table
CREATE TABLE drill_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    drill_id UUID REFERENCES drills(id) ON DELETE CASCADE NOT NULL,
    participant_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    attended BOOLEAN DEFAULT false,
    performance_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(drill_id, participant_id)
);

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_firm_id ON user_profiles(firm_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_firm_admins_user_id ON firm_admins(user_id);
CREATE INDEX idx_firm_admins_firm_id ON firm_admins(firm_id);
CREATE INDEX idx_firm_admins_email ON firm_admins(email);
CREATE INDEX idx_locations_firm_id ON locations(firm_id);
CREATE INDEX idx_safety_classes_firm_id ON safety_classes(firm_id);
CREATE INDEX idx_scheduled_classes_date ON scheduled_classes(scheduled_date);
CREATE INDEX idx_emergencies_firm_id ON emergencies(firm_id);
CREATE INDEX idx_emergencies_status ON emergencies(status);
CREATE INDEX idx_drills_firm_id ON drills(firm_id);
CREATE INDEX idx_drills_date ON drills(scheduled_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_firms_updated_at BEFORE UPDATE ON firms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_firm_admins_updated_at BEFORE UPDATE ON firm_admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safety_classes_updated_at BEFORE UPDATE ON safety_classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_classes_updated_at BEFORE UPDATE ON scheduled_classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_emergencies_updated_at BEFORE UPDATE ON emergencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drills_updated_at BEFORE UPDATE ON drills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
