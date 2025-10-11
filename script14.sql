-- Add Type and Mode columns to safety_classes table
-- This script adds two new enum columns to support class type and delivery mode

-- First, create the enum types
CREATE TYPE class_type AS ENUM ('Safety Class', 'Drill');
CREATE TYPE class_mode AS ENUM ('Remote', 'InPerson');

-- Add the new columns to the safety_classes table
ALTER TABLE safety_classes 
ADD COLUMN type class_type DEFAULT 'Safety Class' NOT NULL,
ADD COLUMN mode class_mode DEFAULT 'Remote' NOT NULL;

-- Optional: Add comments to document the columns
COMMENT ON COLUMN safety_classes.type IS 'Type of safety class: Safety Class or Drill';
COMMENT ON COLUMN safety_classes.mode IS 'Delivery mode: Remote or InPerson';

-- Optional: Create indexes for better query performance
CREATE INDEX idx_safety_classes_type ON safety_classes(type);
CREATE INDEX idx_safety_classes_mode ON safety_classes(mode);
CREATE INDEX idx_safety_classes_type_mode ON safety_classes(type, mode);