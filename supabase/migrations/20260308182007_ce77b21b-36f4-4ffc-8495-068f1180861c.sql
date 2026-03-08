
-- NVO exam configurations
CREATE TABLE public.nvo_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('bel', 'math')),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Modules within each exam
CREATE TABLE public.nvo_exam_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.nvo_exams(id) ON DELETE CASCADE,
  module_number INTEGER NOT NULL CHECK (module_number IN (1, 2)),
  time_minutes INTEGER NOT NULL DEFAULT 60,
  max_points INTEGER NOT NULL DEFAULT 65,
  UNIQUE(exam_id, module_number)
);

-- Questions assigned to each module
CREATE TABLE public.nvo_module_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.nvo_exam_modules(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(module_id, question_id)
);

-- RLS
ALTER TABLE public.nvo_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nvo_exam_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nvo_module_questions ENABLE ROW LEVEL SECURITY;

-- Read policies (permissive)
CREATE POLICY "Anyone can read nvo_exams" ON public.nvo_exams FOR SELECT USING (true);
CREATE POLICY "Anyone can read nvo_exam_modules" ON public.nvo_exam_modules FOR SELECT USING (true);
CREATE POLICY "Anyone can read nvo_module_questions" ON public.nvo_module_questions FOR SELECT USING (true);

-- Write policies for teachers
CREATE POLICY "Teachers can insert nvo_exams" ON public.nvo_exams FOR INSERT WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can update nvo_exams" ON public.nvo_exams FOR UPDATE USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can delete nvo_exams" ON public.nvo_exams FOR DELETE USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can insert nvo_exam_modules" ON public.nvo_exam_modules FOR INSERT WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can update nvo_exam_modules" ON public.nvo_exam_modules FOR UPDATE USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can delete nvo_exam_modules" ON public.nvo_exam_modules FOR DELETE USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can insert nvo_module_questions" ON public.nvo_module_questions FOR INSERT WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can update nvo_module_questions" ON public.nvo_module_questions FOR UPDATE USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can delete nvo_module_questions" ON public.nvo_module_questions FOR DELETE USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
