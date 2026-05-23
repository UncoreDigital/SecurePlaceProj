-- Migration: Custom MCQ Form Feature
-- Run this in your Supabase SQL Editor

-- MCQ Form linked to a safety class (one form per class)
CREATE TABLE IF NOT EXISTS class_forms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  safety_class_id UUID REFERENCES safety_classes(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  pass_score INTEGER DEFAULT 70 CHECK (pass_score >= 0 AND pass_score <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(safety_class_id)
);

-- Questions for the form (ordered)
CREATE TABLE IF NOT EXISTS form_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  form_id UUID REFERENCES class_forms(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  marks INTEGER NOT NULL DEFAULT 1 CHECK (marks >= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Options for each question (MCQ choices, one marked correct)
CREATE TABLE IF NOT EXISTS form_question_options (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_id UUID REFERENCES form_questions(id) ON DELETE CASCADE NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0
);

-- Employee form submissions (tied to a firm for analytics)
CREATE TABLE IF NOT EXISTS form_responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  form_id UUID REFERENCES class_forms(id) ON DELETE CASCADE NOT NULL,
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  employee_email VARCHAR(255),
  score INTEGER CHECK (score >= 0 AND score <= 100),
  passed BOOLEAN,
  marks_obtained INTEGER,
  total_marks INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual answers: which option the employee selected per question
CREATE TABLE IF NOT EXISTS form_response_answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  response_id UUID REFERENCES form_responses(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES form_questions(id) ON DELETE CASCADE NOT NULL,
  selected_option_id UUID REFERENCES form_question_options(id) ON DELETE SET NULL,
  UNIQUE(response_id, question_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_forms_safety_class_id ON class_forms(safety_class_id);
CREATE INDEX IF NOT EXISTS idx_form_questions_form_id ON form_questions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_question_options_question_id ON form_question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_form_id ON form_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_firm_id ON form_responses(firm_id);
CREATE INDEX IF NOT EXISTS idx_form_response_answers_response_id ON form_response_answers(response_id);

-- Trigger for class_forms updated_at
CREATE TRIGGER update_class_forms_updated_at
  BEFORE UPDATE ON class_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (allow public read for form submission, restrict write)
ALTER TABLE class_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_response_answers ENABLE ROW LEVEL SECURITY;

-- Public can read active forms (for employee form filling)
CREATE POLICY "Public can read active forms" ON class_forms
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can read form questions" ON form_questions
  FOR SELECT USING (true);

CREATE POLICY "Public can read form options" ON form_question_options
  FOR SELECT USING (true);

-- Public can insert responses
CREATE POLICY "Public can submit form responses" ON form_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can insert response answers" ON form_response_answers
  FOR INSERT WITH CHECK (true);

-- Service role has full access (used by API routes with service key)
CREATE POLICY "Service role full access to class_forms" ON class_forms
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to form_responses" ON form_responses
  FOR ALL USING (auth.role() = 'service_role');
