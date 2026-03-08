
-- Topics table
CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject public.subject_type NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read topics" ON public.topics FOR SELECT USING (true);
CREATE POLICY "Teachers can insert topics" ON public.topics FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can update topics" ON public.topics FOR UPDATE USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can delete topics" ON public.topics FOR DELETE USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

-- Add topic_id to materials
ALTER TABLE public.materials ADD COLUMN topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL;

-- Add question_type, grading_criteria, max_points to quiz_questions
ALTER TABLE public.quiz_questions ADD COLUMN question_type text NOT NULL DEFAULT 'multiple_choice';
ALTER TABLE public.quiz_questions ADD COLUMN grading_criteria text;
ALTER TABLE public.quiz_questions ADD COLUMN max_points integer NOT NULL DEFAULT 1;
ALTER TABLE public.quiz_questions ADD COLUMN topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL;

-- Test attempts table for tracking student progress
CREATE TABLE public.test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type text NOT NULL DEFAULT 'topic',
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  subject public.subject_type,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score numeric,
  max_score numeric,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert test attempts" ON public.test_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read own test attempts" ON public.test_attempts FOR SELECT USING (true);
CREATE POLICY "Anyone can update test attempts" ON public.test_attempts FOR UPDATE USING (true);
