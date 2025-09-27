-- Enable read access for all users
CREATE POLICY "Enable read access for all users" ON safety_classes to public
    USING (true);
    