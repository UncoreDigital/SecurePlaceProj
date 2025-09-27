-- Row Level Security (RLS) Policies for SecurePlace App
-- Run this in your Supabase SQL Editor after creating the schema

-- Enable RLS on all tables
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_participants ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's firm_id
CREATE OR REPLACE FUNCTION get_user_firm_id(user_id UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT firm_id 
        FROM user_profiles 
        WHERE id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'super_admin' 
        FROM user_profiles 
        WHERE id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is firm admin
CREATE OR REPLACE FUNCTION is_firm_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'firm_admin' 
        FROM user_profiles 
        WHERE id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FIRMS POLICIES
-- Super admins can do everything with firms
CREATE POLICY "Super admins can manage all firms" ON firms
    FOR ALL USING (is_super_admin(auth.uid()));

-- Firm admins can view and update their own firm
CREATE POLICY "Firm admins can manage their firm" ON firms
    FOR ALL USING (
        id = get_user_firm_id(auth.uid()) AND 
        is_firm_admin(auth.uid())
    );

-- Employees can view their firm
CREATE POLICY "Employees can view their firm" ON firms
    FOR SELECT USING (id = get_user_firm_id(auth.uid()));

-- USER PROFILES POLICIES
-- Super admins can manage all user profiles
CREATE POLICY "Super admins can manage all user profiles" ON user_profiles
    FOR ALL USING (is_super_admin(auth.uid()));

-- Firm admins can manage users in their firm
CREATE POLICY "Firm admins can manage users in their firm" ON user_profiles
    FOR ALL USING (
        firm_id = get_user_firm_id(auth.uid()) AND 
        is_firm_admin(auth.uid())
    );

-- Users can view and update their own profile
CREATE POLICY "Users can manage their own profile" ON user_profiles
    FOR ALL USING (id = auth.uid());

-- FIRM ADMINS POLICIES
-- Super admins can manage all firm admins
CREATE POLICY "Super admins can manage all firm admins" ON firm_admins
    FOR ALL USING (is_super_admin(auth.uid()));

-- Firm admins can manage admins in their firm
CREATE POLICY "Firm admins can manage admins in their firm" ON firm_admins
    FOR ALL USING (
        firm_id = get_user_firm_id(auth.uid()) AND 
        is_firm_admin(auth.uid())
    );

-- Users can view their own firm admin record
CREATE POLICY "Users can view their own firm admin record" ON firm_admins
    FOR SELECT USING (user_id = auth.uid());

-- LOCATIONS POLICIES
-- Super admins can manage all locations
CREATE POLICY "Super admins can manage all locations" ON locations
    FOR ALL USING (is_super_admin(auth.uid()));

-- Firm admins can manage locations in their firm
CREATE POLICY "Firm admins can manage locations in their firm" ON locations
    FOR ALL USING (
        firm_id = get_user_firm_id(auth.uid()) AND 
        is_firm_admin(auth.uid())
    );

-- Employees can view locations in their firm
CREATE POLICY "Employees can view locations in their firm" ON locations
    FOR SELECT USING (firm_id = get_user_firm_id(auth.uid()));

-- SAFETY CLASSES POLICIES
-- Super admins can manage all safety classes
CREATE POLICY "Super admins can manage all safety classes" ON safety_classes
    FOR ALL USING (is_super_admin(auth.uid()));

-- Firm admins can manage safety classes in their firm
-- CREATE POLICY "Firm admins can manage safety classes in their firm" ON safety_classes
--     FOR ALL USING (
--         firm_id = get_user_firm_id(auth.uid()) AND 
--         is_firm_admin(auth.uid())
--     );

-- Employees can view safety classes in their firm
CREATE POLICY "Employees can view safety classes in their firm" ON safety_classes
    FOR SELECT USING (firm_id = get_user_firm_id(auth.uid()));

-- SCHEDULED CLASSES POLICIES
-- Super admins can manage all scheduled classes
CREATE POLICY "Super admins can manage all scheduled classes" ON scheduled_classes
    FOR ALL USING (is_super_admin(auth.uid()));

-- Firm admins can manage scheduled classes in their firm
CREATE POLICY "Firm admins can manage scheduled classes in their firm" ON scheduled_classes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM safety_classes sc 
            WHERE sc.id = scheduled_classes.safety_class_id 
            AND sc.firm_id = get_user_firm_id(auth.uid())
        ) AND is_firm_admin(auth.uid())
    );

-- Employees can view scheduled classes in their firm
CREATE POLICY "Employees can view scheduled classes in their firm" ON scheduled_classes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM safety_classes sc 
            WHERE sc.id = scheduled_classes.safety_class_id 
            AND sc.firm_id = get_user_firm_id(auth.uid())
        )
    );

-- CLASS PARTICIPANTS POLICIES
-- Super admins can manage all class participants
CREATE POLICY "Super admins can manage all class participants" ON class_participants
    FOR ALL USING (is_super_admin(auth.uid()));

-- Firm admins can manage participants in their firm's classes
CREATE POLICY "Firm admins can manage participants in their firm's classes" ON class_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM scheduled_classes sc
            JOIN safety_classes scl ON scl.id = sc.safety_class_id
            WHERE sc.id = class_participants.scheduled_class_id 
            AND scl.firm_id = get_user_firm_id(auth.uid())
        ) AND is_firm_admin(auth.uid())
    );

-- Users can view and update their own participation
CREATE POLICY "Users can manage their own participation" ON class_participants
    FOR ALL USING (participant_id = auth.uid());

-- EMERGENCIES POLICIES
-- Super admins can manage all emergencies
CREATE POLICY "Super admins can manage all emergencies" ON emergencies
    FOR ALL USING (is_super_admin(auth.uid()));

-- Firm admins can manage emergencies in their firm
CREATE POLICY "Firm admins can manage emergencies in their firm" ON emergencies
    FOR ALL USING (
        firm_id = get_user_firm_id(auth.uid()) AND 
        is_firm_admin(auth.uid())
    );

-- Employees can view and create emergencies in their firm
CREATE POLICY "Employees can view and create emergencies in their firm" ON emergencies
    FOR ALL USING (firm_id = get_user_firm_id(auth.uid()));

-- DRILLS POLICIES
-- Super admins can manage all drills
CREATE POLICY "Super admins can manage all drills" ON drills
    FOR ALL USING (is_super_admin(auth.uid()));

-- Firm admins can manage drills in their firm
CREATE POLICY "Firm admins can manage drills in their firm" ON drills
    FOR ALL USING (
        firm_id = get_user_firm_id(auth.uid()) AND 
        is_firm_admin(auth.uid())
    );

-- Employees can view drills in their firm
CREATE POLICY "Employees can view drills in their firm" ON drills
    FOR SELECT USING (firm_id = get_user_firm_id(auth.uid()));

-- DRILL PARTICIPANTS POLICIES
-- Super admins can manage all drill participants
CREATE POLICY "Super admins can manage all drill participants" ON drill_participants
    FOR ALL USING (is_super_admin(auth.uid()));

-- Firm admins can manage participants in their firm's drills
CREATE POLICY "Firm admins can manage participants in their firm's drills" ON drill_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM drills d
            WHERE d.id = drill_participants.drill_id 
            AND d.firm_id = get_user_firm_id(auth.uid())
        ) AND is_firm_admin(auth.uid())
    );

-- Users can view and update their own drill participation
CREATE POLICY "Users can manage their own drill participation" ON drill_participants
    FOR ALL USING (participant_id = auth.uid());
