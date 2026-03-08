
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Subjects enum
CREATE TYPE public.subject_type AS ENUM ('bel', 'math');

-- Materials table (reading content)
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  subject subject_type NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read materials" ON public.materials FOR SELECT USING (true);
CREATE POLICY "Teachers can insert materials" ON public.materials FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can update materials" ON public.materials FOR UPDATE
  USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can delete materials" ON public.materials FOR DELETE
  USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

-- Quiz questions table
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer INTEGER NOT NULL,
  subject subject_type NOT NULL,
  explanation TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read questions" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "Teachers can insert questions" ON public.quiz_questions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can update questions" ON public.quiz_questions FOR UPDATE
  USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can delete questions" ON public.quiz_questions FOR DELETE
  USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

-- Storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', true);

CREATE POLICY "Anyone can read material files" ON storage.objects
  FOR SELECT USING (bucket_id = 'materials');
CREATE POLICY "Teachers can upload material files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'materials' AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Teachers can delete material files" ON storage.objects
  FOR DELETE USING (bucket_id = 'materials' AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin')));

-- File references table
CREATE TABLE public.material_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.material_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read material files ref" ON public.material_files FOR SELECT USING (true);
CREATE POLICY "Teachers can insert material files ref" ON public.material_files FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can delete material files ref" ON public.material_files FOR DELETE
  USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
