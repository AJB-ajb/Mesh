-- Migration: Create skill_nodes tree table, profile_skills + posting_skills join tables, and seed taxonomy
-- See spec/skills.md for full design rationale.

-- ============================================
-- 1. SKILL_NODES TABLE
-- ============================================

CREATE TABLE public.skill_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.skill_nodes(id) ON DELETE CASCADE,
  name text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',
  description text,
  depth integer NOT NULL DEFAULT 0,
  is_leaf boolean NOT NULL DEFAULT true,
  created_by text NOT NULL DEFAULT 'seed'
    CHECK (created_by IN ('seed', 'llm', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- No duplicate siblings
CREATE UNIQUE INDEX skill_nodes_parent_name_unique ON public.skill_nodes (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

-- Fast alias lookup
CREATE INDEX skill_nodes_aliases_idx ON public.skill_nodes USING gin(aliases);

-- Fast child lookups
CREATE INDEX skill_nodes_parent_id_idx ON public.skill_nodes(parent_id);

-- Fast name search
CREATE INDEX skill_nodes_name_lower_idx ON public.skill_nodes(lower(name));

-- Enable RLS
ALTER TABLE public.skill_nodes ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read skill nodes
CREATE POLICY "Skill nodes are readable by authenticated users"
  ON public.skill_nodes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert skill nodes (for LLM auto-adding)
CREATE POLICY "Authenticated users can insert skill nodes"
  ON public.skill_nodes
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 2. PROFILE_SKILLS JOIN TABLE
-- ============================================

CREATE TABLE public.profile_skills (
  profile_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skill_nodes(id) ON DELETE CASCADE,
  level integer CHECK (level IS NULL OR (level >= 0 AND level <= 10)),
  PRIMARY KEY (profile_id, skill_id)
);

CREATE INDEX profile_skills_skill_idx ON public.profile_skills(skill_id);

ALTER TABLE public.profile_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile skills"
  ON public.profile_skills
  FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can manage their own profile skills"
  ON public.profile_skills
  FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their own profile skills"
  ON public.profile_skills
  FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Users can delete their own profile skills"
  ON public.profile_skills
  FOR DELETE
  USING (profile_id = auth.uid());

-- ============================================
-- 3. POSTING_SKILLS JOIN TABLE
-- ============================================

CREATE TABLE public.posting_skills (
  posting_id uuid NOT NULL REFERENCES public.postings(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skill_nodes(id) ON DELETE CASCADE,
  level_min integer CHECK (level_min IS NULL OR (level_min >= 0 AND level_min <= 10)),
  PRIMARY KEY (posting_id, skill_id)
);

CREATE INDEX posting_skills_skill_idx ON public.posting_skills(skill_id);

ALTER TABLE public.posting_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posting skills are viewable by authenticated users"
  ON public.posting_skills
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Posting creators can manage posting skills"
  ON public.posting_skills
  FOR INSERT
  WITH CHECK (
    posting_id IN (SELECT id FROM public.postings WHERE creator_id = auth.uid())
  );

CREATE POLICY "Posting creators can update posting skills"
  ON public.posting_skills
  FOR UPDATE
  USING (
    posting_id IN (SELECT id FROM public.postings WHERE creator_id = auth.uid())
  );

CREATE POLICY "Posting creators can delete posting skills"
  ON public.posting_skills
  FOR DELETE
  USING (
    posting_id IN (SELECT id FROM public.postings WHERE creator_id = auth.uid())
  );

-- ============================================
-- 4. SEED TAXONOMY
-- ============================================
-- Grouping nodes (marked * in spec) have is_leaf = false.
-- All other nodes are taggable leaves.

DO $$
DECLARE
  -- Root categories (depth 0, all grouping)
  v_technology uuid;
  v_music uuid;
  v_performing_arts uuid;
  v_visual_arts uuid;
  v_writing uuid;
  v_languages uuid;
  v_communication uuid;
  v_management uuid;
  v_sports uuid;
  v_academic uuid;
  v_games uuid;
  v_culinary uuid;
  -- Depth 1 grouping nodes
  v_programming uuid;
  v_design uuid;
  v_hardware uuid;
  v_instruments uuid;
  v_music_production uuid;
  v_music_theory uuid;
  v_comedy uuid;
  v_team_sports uuid;
  v_individual_sports uuid;
  v_natural_sciences uuid;
  v_mathematics uuid;
  v_social_sciences uuid;
  v_humanities uuid;
  v_board_games uuid;
  v_card_games uuid;
  v_data_science uuid;
  v_devops uuid;
  v_mobile_dev uuid;
  -- Depth 2+ intermediate nodes
  v_python uuid;
  v_javascript uuid;
  v_java uuid;
  v_sql uuid;
  v_nodejs uuid;
  v_react uuid;
  v_guitar uuid;
  v_film_video uuid;
BEGIN
  -- ============================================
  -- ROOT CATEGORIES (depth 0)
  -- ============================================
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Technology', NULL, 0, false, 'seed') RETURNING id INTO v_technology;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Music', NULL, 0, false, 'seed') RETURNING id INTO v_music;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Performing Arts', NULL, 0, false, 'seed') RETURNING id INTO v_performing_arts;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Visual Arts', NULL, 0, false, 'seed') RETURNING id INTO v_visual_arts;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Writing', NULL, 0, false, 'seed') RETURNING id INTO v_writing;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Languages', NULL, 0, false, 'seed') RETURNING id INTO v_languages;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Communication', NULL, 0, false, 'seed') RETURNING id INTO v_communication;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Management', NULL, 0, false, 'seed') RETURNING id INTO v_management;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Sports & Fitness', NULL, 0, false, 'seed') RETURNING id INTO v_sports;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Academic', NULL, 0, false, 'seed') RETURNING id INTO v_academic;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Games', NULL, 0, false, 'seed') RETURNING id INTO v_games;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Culinary', NULL, 0, false, 'seed') RETURNING id INTO v_culinary;

  -- ============================================
  -- TECHNOLOGY children (depth 1)
  -- ============================================
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Programming', v_technology, 1, false, 'seed') RETURNING id INTO v_programming;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Design', v_technology, 1, false, 'seed') RETURNING id INTO v_design;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Hardware', v_technology, 1, false, 'seed') RETURNING id INTO v_hardware;

  -- Design children (depth 2, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('UI/UX Design', v_design, 2, true, ARRAY['UX', 'UI', 'UX Design', 'UI Design', 'User Experience', 'User Interface Design'], 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Graphic Design', v_design, 2, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('3D Modeling', v_design, 2, true, ARRAY['3D', '3D Design'], 'seed');

  -- Hardware children (depth 2, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Electronics', v_hardware, 2, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Robotics', v_hardware, 2, true, 'seed');

  -- ============================================
  -- PROGRAMMING children (depth 2)
  -- ============================================
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Python', v_programming, 2, true, 'seed') RETURNING id INTO v_python;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('JavaScript', v_programming, 2, true, ARRAY['JS'], 'seed') RETURNING id INTO v_javascript;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('TypeScript', v_programming, 2, true, ARRAY['TS'], 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Java', v_programming, 2, true, 'seed') RETURNING id INTO v_java;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('C/C++', v_programming, 2, true, ARRAY['C', 'C++', 'Cpp'], 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Rust', v_programming, 2, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Go', v_programming, 2, true, ARRAY['Golang'], 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('SQL', v_programming, 2, true, 'seed') RETURNING id INTO v_sql;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Data Science', v_programming, 2, false, 'seed') RETURNING id INTO v_data_science;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('DevOps', v_programming, 2, false, 'seed') RETURNING id INTO v_devops;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Mobile Development', v_programming, 2, false, ARRAY['Mobile Dev'], 'seed') RETURNING id INTO v_mobile_dev;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Game Development', v_programming, 2, true, ARRAY['Game Dev', 'Gamedev'], 'seed');

  -- Python children (depth 3, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Django', v_python, 3, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Flask', v_python, 3, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('FastAPI', v_python, 3, true, 'seed');

  -- JavaScript children (depth 3)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('React', v_javascript, 3, true, ARRAY['ReactJS', 'React.js'], 'seed') RETURNING id INTO v_react;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Vue', v_javascript, 3, true, ARRAY['Vue.js', 'VueJS'], 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Node.js', v_javascript, 3, true, ARRAY['NodeJS', 'Node'], 'seed') RETURNING id INTO v_nodejs;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Svelte', v_javascript, 3, true, ARRAY['SvelteJS'], 'seed');

  -- React children (depth 4, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Next.js', v_react, 4, true, ARRAY['NextJS', 'Next'], 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('React Native', v_react, 4, true, 'seed');

  -- Node.js children (depth 4, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Express', v_nodejs, 4, true, ARRAY['Express.js', 'ExpressJS'], 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('NestJS', v_nodejs, 4, true, 'seed');

  -- Java children (depth 3, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Spring', v_java, 3, true, ARRAY['Spring Boot', 'Spring Framework'], 'seed');

  -- SQL children (depth 3, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('PostgreSQL', v_sql, 3, true, ARRAY['Postgres', 'psql'], 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('MySQL', v_sql, 3, true, 'seed');

  -- Data Science children (depth 3, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Machine Learning', v_data_science, 3, true, ARRAY['ML'], 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Data Engineering', v_data_science, 3, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Data Visualization', v_data_science, 3, true, ARRAY['Data Viz'], 'seed');

  -- DevOps children (depth 3, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Docker', v_devops, 3, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Kubernetes', v_devops, 3, true, ARRAY['K8s'], 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('CI/CD', v_devops, 3, true, ARRAY['Continuous Integration', 'Continuous Deployment'], 'seed');

  -- Mark Python, JavaScript, Java, SQL as non-leaf since they have children
  UPDATE public.skill_nodes SET is_leaf = false WHERE id IN (v_python, v_javascript, v_java, v_sql, v_nodejs, v_react);

  -- ============================================
  -- MUSIC children
  -- ============================================
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Instruments', v_music, 1, false, 'seed') RETURNING id INTO v_instruments;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Music Production', v_music, 1, true, 'seed') RETURNING id INTO v_music_production;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Music Theory', v_music, 1, true, 'seed') RETURNING id INTO v_music_theory;

  -- Instruments children (depth 2, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Piano', v_instruments, 2, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Guitar', v_instruments, 2, true, 'seed') RETURNING id INTO v_guitar;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Drums', v_instruments, 2, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Violin', v_instruments, 2, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Voice / Vocals', v_instruments, 2, true, ARRAY['Singing', 'Voice', 'Vocals'], 'seed');

  -- Guitar children (depth 3, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Classical Guitar', v_guitar, 3, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Electric Guitar', v_guitar, 3, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Bass Guitar', v_guitar, 3, true, 'seed');

  -- Mark Guitar as non-leaf
  UPDATE public.skill_nodes SET is_leaf = false WHERE id = v_guitar;

  -- Music Production children (depth 2, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Mixing', v_music_production, 2, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Mastering', v_music_production, 2, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Sound Design', v_music_production, 2, true, 'seed');

  -- Mark Music Production as non-leaf
  UPDATE public.skill_nodes SET is_leaf = false WHERE id = v_music_production;

  -- Music Theory children (depth 2, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Composition', v_music_theory, 2, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Harmony', v_music_theory, 2, true, 'seed');

  -- Mark Music Theory as non-leaf
  UPDATE public.skill_nodes SET is_leaf = false WHERE id = v_music_theory;

  -- ============================================
  -- PERFORMING ARTS children
  -- ============================================
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Acting', v_performing_arts, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Directing', v_performing_arts, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Stagecraft', v_performing_arts, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Dance', v_performing_arts, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Comedy', v_performing_arts, 1, false, 'seed') RETURNING id INTO v_comedy;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Film / Video', v_performing_arts, 1, true, ARRAY['Film', 'Video', 'Filmmaking'], 'seed');

  -- Comedy children (depth 2, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Stand-up', v_comedy, 2, true, ARRAY['Stand-up Comedy', 'Standup'], 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Improv', v_comedy, 2, true, ARRAY['Improvisation', 'Improv Comedy'], 'seed');

  -- ============================================
  -- VISUAL ARTS children
  -- ============================================
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Drawing', v_visual_arts, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Painting', v_visual_arts, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Photography', v_visual_arts, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Sculpture', v_visual_arts, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Digital Art', v_visual_arts, 1, true, 'seed');

  -- ============================================
  -- WRITING children
  -- ============================================
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Creative Writing', v_writing, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Technical Writing', v_writing, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Journalism', v_writing, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Copywriting', v_writing, 1, true, 'seed');

  -- ============================================
  -- LANGUAGES children
  -- ============================================
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('English', v_languages, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('German', v_languages, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Spanish', v_languages, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('French', v_languages, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Mandarin', v_languages, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Japanese', v_languages, 1, true, 'seed');

  -- ============================================
  -- COMMUNICATION children
  -- ============================================
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Public Speaking', v_communication, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Negotiation', v_communication, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Debate', v_communication, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Presentation', v_communication, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Conversation Practice', v_communication, 1, true, 'seed');

  -- ============================================
  -- MANAGEMENT children
  -- ============================================
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Project Management', v_management, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Team Leadership', v_management, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Product Management', v_management, 1, true, 'seed');

  -- ============================================
  -- SPORTS & FITNESS children
  -- ============================================
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Team Sports', v_sports, 1, false, 'seed') RETURNING id INTO v_team_sports;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Individual Sports', v_sports, 1, false, 'seed') RETURNING id INTO v_individual_sports;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Martial Arts', v_sports, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Yoga / Pilates', v_sports, 1, true, ARRAY['Yoga', 'Pilates'], 'seed');

  -- Team Sports children (depth 2, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Football', v_team_sports, 2, true, ARRAY['Soccer'], 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Basketball', v_team_sports, 2, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Volleyball', v_team_sports, 2, true, 'seed');

  -- Individual Sports children (depth 2, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Tennis', v_individual_sports, 2, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Running', v_individual_sports, 2, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Swimming', v_individual_sports, 2, true, 'seed');

  -- ============================================
  -- ACADEMIC children
  -- ============================================
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Natural Sciences', v_academic, 1, false, 'seed') RETURNING id INTO v_natural_sciences;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Mathematics', v_academic, 1, true, ARRAY['Math', 'Maths'], 'seed') RETURNING id INTO v_mathematics;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Social Sciences', v_academic, 1, false, 'seed') RETURNING id INTO v_social_sciences;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Humanities', v_academic, 1, false, 'seed') RETURNING id INTO v_humanities;

  -- Natural Sciences children (depth 2, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Physics', v_natural_sciences, 2, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Chemistry', v_natural_sciences, 2, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Biology', v_natural_sciences, 2, true, 'seed');

  -- Mathematics children (depth 2, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Statistics', v_mathematics, 2, true, ARRAY['Stats'], 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Linear Algebra', v_mathematics, 2, true, ARRAY['LinAlg'], 'seed');

  -- Mark Mathematics as non-leaf
  UPDATE public.skill_nodes SET is_leaf = false WHERE id = v_mathematics;

  -- Social Sciences children (depth 2, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Psychology', v_social_sciences, 2, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Economics', v_social_sciences, 2, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Sociology', v_social_sciences, 2, true, 'seed');

  -- Humanities children (depth 2, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Philosophy', v_humanities, 2, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('History', v_humanities, 2, true, 'seed');

  -- ============================================
  -- GAMES children
  -- ============================================
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Board Games', v_games, 1, false, 'seed') RETURNING id INTO v_board_games;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Card Games', v_games, 1, false, 'seed') RETURNING id INTO v_card_games;

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Puzzle Games', v_games, 1, true, 'seed');

  -- Board Games children (depth 2, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Chess', v_board_games, 2, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Go', v_board_games, 2, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Strategy Games', v_board_games, 2, true, 'seed');

  -- Card Games children (depth 2, leaves)
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Poker', v_card_games, 2, true, 'seed');

  -- ============================================
  -- CULINARY children
  -- ============================================
  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Cooking', v_culinary, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, aliases, created_by)
  VALUES ('Pastry / Baking', v_culinary, 1, true, ARRAY['Baking', 'Pastry'], 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Fermentation', v_culinary, 1, true, 'seed');

  INSERT INTO public.skill_nodes (name, parent_id, depth, is_leaf, created_by)
  VALUES ('Bartending', v_culinary, 1, true, 'seed');
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.skill_nodes IS 'Hierarchical skill taxonomy tree. Each node has one parent (null for roots). See spec/skills.md.';
COMMENT ON COLUMN public.skill_nodes.parent_id IS 'FK to parent node. NULL for root categories.';
COMMENT ON COLUMN public.skill_nodes.aliases IS 'Alternative names that map to this node (e.g., ReactJS → React)';
COMMENT ON COLUMN public.skill_nodes.depth IS 'Distance from root (0 = root category)';
COMMENT ON COLUMN public.skill_nodes.is_leaf IS 'True = users can tag this skill. False = grouping node for tree structure.';
COMMENT ON COLUMN public.skill_nodes.created_by IS 'Who created this node: seed (initial), llm (auto-added), admin (manual)';
COMMENT ON TABLE public.profile_skills IS 'Join table: profiles ↔ skill_nodes with optional proficiency level (0-10)';
COMMENT ON TABLE public.posting_skills IS 'Join table: postings ↔ skill_nodes with optional minimum level requirement (0-10)';
