-- Create templates table for posting templates
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content text NOT NULL,
  category text DEFAULT 'general',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- RLS: authenticated users can read active templates
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active templates"
  ON templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Seed with existing 5 templates
INSERT INTO templates (title, description, content, category, sort_order) VALUES
(
  'Study Group',
  'Find study partners',
  E'Looking for study partners!\n\nSubject: [your subject here]\nGoal: Prepare for exams / learn together\nSchedule: [preferred times]\nLevel: All welcome',
  'general',
  1
),
(
  'Hackathon Team',
  'Build a hackathon team',
  E'Building a hackathon team!\n\nHackathon: [name and date]\nProject idea: [brief description]\nLooking for: [roles/skills needed]\nExperience level: Any',
  'general',
  2
),
(
  'Side Project',
  'Find collaborators for a project',
  E'Side project looking for collaborators!\n\nProject: [name or brief description]\nTech stack: [technologies used]\nTime commitment: [hours per week]\nCurrent status: [just starting / in progress]',
  'general',
  3
),
(
  'Mentorship',
  'Find a mentor or mentee',
  E'Looking for a mentor/mentee!\n\nTopic: [area of expertise]\nI can offer: [what you bring]\nLooking for: [what you need]\nFrequency: [how often to meet]',
  'general',
  4
),
(
  'Social',
  'Organize a social activity',
  E'Let''s hang out!\n\nActivity: [what you want to do]\nWhen: [preferred times]\nWhere: [location or online]\nGroup size: [how many people]',
  'general',
  5
);
