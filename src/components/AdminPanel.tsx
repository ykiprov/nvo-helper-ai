import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, BookOpen, Calculator, Loader2, Upload, FileText } from "lucide-react";
import { toast } from "sonner";

type SubjectType = "bel" | "math";

interface Material {
  id: string;
  title: string;
  content: string;
  subject: SubjectType;
  created_at: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  subject: SubjectType;
  explanation: string | null;
}

export default function AdminPanel() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<"materials" | "quiz">("materials");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Material form
  const [matTitle, setMatTitle] = useState("");
  const [matContent, setMatContent] = useState("");
  const [matSubject, setMatSubject] = useState<SubjectType>("bel");
  const [matFile, setMatFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Quiz form
  const [qQuestion, setQQuestion] = useState("");
  const [qOptions, setQOptions] = useState(["", "", "", ""]);
  const [qCorrect, setQCorrect] = useState(0);
  const [qSubject, setQSubject] = useState<SubjectType>("bel");
  const [qExplanation, setQExplanation] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [matRes, qRes] = await Promise.all([
      supabase.from("materials").select("*").order("created_at", { ascending: false }),
      supabase.from("quiz_questions").select("*").order("created_at", { ascending: false }),
    ]);
    setMaterials((matRes.data as Material[]) || []);
    setQuestions(
      (qRes.data || []).map((q) => ({
        ...q,
        options: Array.isArray(q.options) ? (q.options as string[]) : [],
      })) as QuizQuestion[]
    );
    setLoading(false);
  };

  const addMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle.trim() || !matContent.trim()) return;
    setSaving(true);

    const { data, error } = await supabase
      .from("materials")
      .insert({ title: matTitle, content: matContent, subject: matSubject, created_by: user!.id })
      .select()
      .single();

    if (error) {
      toast.error("Грешка: " + error.message);
      setSaving(false);
      return;
    }

    // Upload file if selected
    if (matFile && data) {
      const filePath = `${data.id}/${matFile.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("materials")
        .upload(filePath, matFile);
      if (uploadErr) {
        toast.error("Грешка при качване: " + uploadErr.message);
      } else {
        await supabase.from("material_files").insert({
          material_id: data.id,
          file_name: matFile.name,
          file_path: filePath,
          file_type: matFile.type,
        });
      }
    }

    toast.success("Материалът е добавен!");
    setMatTitle("");
    setMatContent("");
    setMatFile(null);
    setSaving(false);
    fetchData();
  };

  const addQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qQuestion.trim() || qOptions.some((o) => !o.trim())) return;
    setSaving(true);

    const { error } = await supabase.from("quiz_questions").insert({
      question: qQuestion,
      options: qOptions,
      correct_answer: qCorrect,
      subject: qSubject,
      explanation: qExplanation || null,
      created_by: user!.id,
    });

    if (error) {
      toast.error("Грешка: " + error.message);
    } else {
      toast.success("Въпросът е добавен!");
      setQQuestion("");
      setQOptions(["", "", "", ""]);
      setQCorrect(0);
      setQExplanation("");
      fetchData();
    }
    setSaving(false);
  };

  const deleteMaterial = async (id: string) => {
    await supabase.from("materials").delete().eq("id", id);
    toast.success("Изтрито!");
    fetchData();
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("quiz_questions").delete().eq("id", id);
    toast.success("Изтрито!");
    fetchData();
  };

  const subjectLabel = (s: SubjectType) => (s === "bel" ? "БЕЛ" : "Математика");
  const SubjectIcon = ({ s }: { s: SubjectType }) =>
    s === "bel" ? <BookOpen className="w-4 h-4" /> : <Calculator className="w-4 h-4" />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-bold text-foreground">Админ панел</h2>
        <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Изход
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
        <button
          onClick={() => setTab("materials")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            tab === "materials" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          📚 Материали ({materials.length})
        </button>
        <button
          onClick={() => setTab("quiz")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            tab === "quiz" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          ❓ Тестове ({questions.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : tab === "materials" ? (
        <div className="space-y-6">
          {/* Add material form */}
          <form onSubmit={addMaterial} className="bg-card rounded-2xl shadow-card p-6 space-y-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4" /> Нов материал
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                value={matTitle}
                onChange={(e) => setMatTitle(e.target.value)}
                placeholder="Заглавие"
                className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
              <select
                value={matSubject}
                onChange={(e) => setMatSubject(e.target.value as SubjectType)}
                className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="bel">БЕЛ</option>
                <option value="math">Математика</option>
              </select>
            </div>
            <textarea
              value={matContent}
              onChange={(e) => setMatContent(e.target.value)}
              placeholder="Съдържание на материала..."
              rows={6}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              required
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Upload className="w-4 h-4" />
                {matFile ? matFile.name : "Прикачи файл (PDF, DOC...)"}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setMatFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="gradient-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Запазване..." : "Добави материал"}
            </button>
          </form>

          {/* Materials list */}
          {materials.map((m) => (
            <div key={m.id} className="bg-card rounded-2xl shadow-card p-5 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <SubjectIcon s={m.subject} />
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {subjectLabel(m.subject)}
                  </span>
                </div>
                <h4 className="font-display font-semibold text-foreground">{m.title}</h4>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.content}</p>
              </div>
              <button onClick={() => deleteMaterial(m.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Add question form */}
          <form onSubmit={addQuestion} className="bg-card rounded-2xl shadow-card p-6 space-y-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4" /> Нов въпрос
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <textarea
                value={qQuestion}
                onChange={(e) => setQQuestion(e.target.value)}
                placeholder="Въпрос..."
                rows={2}
                className="sm:col-span-2 rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                required
              />
              <select
                value={qSubject}
                onChange={(e) => setQSubject(e.target.value as SubjectType)}
                className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="bel">БЕЛ</option>
                <option value="math">Математика</option>
              </select>
              <select
                value={qCorrect}
                onChange={(e) => setQCorrect(Number(e.target.value))}
                className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {qOptions.map((_, i) => (
                  <option key={i} value={i}>Верен отговор: {String.fromCharCode(65 + i)}</option>
                ))}
              </select>
            </div>
            {qOptions.map((opt, i) => (
              <input
                key={i}
                value={opt}
                onChange={(e) => {
                  const copy = [...qOptions];
                  copy[i] = e.target.value;
                  setQOptions(copy);
                }}
                placeholder={`Вариант ${String.fromCharCode(65 + i)}`}
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            ))}
            <textarea
              value={qExplanation}
              onChange={(e) => setQExplanation(e.target.value)}
              placeholder="Обяснение (по желание)..."
              rows={2}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
            <button
              type="submit"
              disabled={saving}
              className="gradient-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Запазване..." : "Добави въпрос"}
            </button>
          </form>

          {/* Questions list */}
          {questions.map((q) => (
            <div key={q.id} className="bg-card rounded-2xl shadow-card p-5 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <SubjectIcon s={q.subject} />
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {subjectLabel(q.subject)}
                  </span>
                </div>
                <h4 className="font-display font-semibold text-foreground text-sm">{q.question}</h4>
                <div className="mt-2 space-y-1">
                  {q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`text-xs px-3 py-1.5 rounded-lg ${
                        i === q.correct_answer
                          ? "bg-secondary/20 text-secondary font-medium"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {String.fromCharCode(65 + i)}. {opt}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => deleteQuestion(q.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
