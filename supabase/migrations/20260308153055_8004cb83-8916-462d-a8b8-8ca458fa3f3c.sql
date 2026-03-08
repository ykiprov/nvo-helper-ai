
-- Drop all existing RESTRICTIVE policies and recreate as PERMISSIVE

-- topics
DROP POLICY IF EXISTS "Anyone can read topics" ON public.topics;
DROP POLICY IF EXISTS "Teachers can insert topics" ON public.topics;
DROP POLICY IF EXISTS "Teachers can update topics" ON public.topics;
DROP POLICY IF EXISTS "Teachers can delete topics" ON public.topics;

CREATE POLICY "Anyone can read topics" ON public.topics FOR SELECT USING (true);
CREATE POLICY "Teachers can insert topics" ON public.topics FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can update topics" ON public.topics FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can delete topics" ON public.topics FOR DELETE TO authenticated USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- materials
DROP POLICY IF EXISTS "Anyone can read materials" ON public.materials;
DROP POLICY IF EXISTS "Teachers can insert materials" ON public.materials;
DROP POLICY IF EXISTS "Teachers can update materials" ON public.materials;
DROP POLICY IF EXISTS "Teachers can delete materials" ON public.materials;

CREATE POLICY "Anyone can read materials" ON public.materials FOR SELECT USING (true);
CREATE POLICY "Teachers can insert materials" ON public.materials FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can update materials" ON public.materials FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can delete materials" ON public.materials FOR DELETE TO authenticated USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- quiz_questions
DROP POLICY IF EXISTS "Anyone can read questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Teachers can insert questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Teachers can update questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Teachers can delete questions" ON public.quiz_questions;

CREATE POLICY "Anyone can read questions" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "Teachers can insert questions" ON public.quiz_questions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can update questions" ON public.quiz_questions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can delete questions" ON public.quiz_questions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- material_files
DROP POLICY IF EXISTS "Anyone can read material files" ON public.material_files;
DROP POLICY IF EXISTS "Teachers can insert material files" ON public.material_files;
DROP POLICY IF EXISTS "Teachers can delete material files" ON public.material_files;

CREATE POLICY "Anyone can read material files" ON public.material_files FOR SELECT USING (true);
CREATE POLICY "Teachers can insert material files" ON public.material_files FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can delete material files" ON public.material_files FOR DELETE TO authenticated USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- test_attempts
DROP POLICY IF EXISTS "Anyone can insert test attempts" ON public.test_attempts;
DROP POLICY IF EXISTS "Anyone can read test attempts" ON public.test_attempts;
DROP POLICY IF EXISTS "Anyone can update test attempts" ON public.test_attempts;

CREATE POLICY "Anyone can insert test attempts" ON public.test_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read test attempts" ON public.test_attempts FOR SELECT USING (true);
CREATE POLICY "Anyone can update test attempts" ON public.test_attempts FOR UPDATE USING (true);

-- user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
