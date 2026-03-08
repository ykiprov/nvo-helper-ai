import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, Save, GripVertical, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

type SubjectType = "bel" | "math";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  subject: SubjectType;
  question_type: string;
  max_points: number;
  topic_id: string | null;
}

interface Topic {
  id: string;
  name: string;
  subject: SubjectType;
}

interface NvoExam {
  id: string;
  title: string;
  subject: SubjectType;
  created_at: string;
}

interface NvoModule {
  id: string;
  exam_id: string;
  module_number: number;
  time_minutes: number;
  max_points: number;
}

interface NvoModuleQuestion {
  id: string;
  module_id: string;
  question_id: string;
  sort_order: number;
}

const DEFAULT_MODULES: Record<SubjectType, { module_number: number; time_minutes: number; max_points: number }[]> = {
  bel: [
    { module_number: 1, time_minutes: 60, max_points: 65 },
    { module_number: 2, time_minutes: 90, max_points: 35 },
  ],
  math: [
    { module_number: 1, time_minutes: 75, max_points: 65 },
    { module_number: 2, time_minutes: 90, max_points: 35 },
  ],
};

export default function ExamBuilder() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [exams, setExams] = useState<NvoExam[]>([]);
  const [modules, setModules] = useState<NvoModule[]>([]);
  const [moduleQuestions, setModuleQuestions] = useState<NvoModuleQuestion[]>([]);
  const [allQuestions, setAllQuestions] = useState<QuizQuestion[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  // New exam form
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState<SubjectType>("bel");

  // Expanded exam
  const [expandedExam, setExpandedExam] = useState<string | null>(null);

  // Filter for question picker
  const [filterTopic, setFilterTopic] = useState("");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [exRes, modRes, mqRes, qRes, tRes] = await Promise.all([
        supabase.from("nvo_exams").select("*").order("created_at", { ascending: false }),
        supabase.from("nvo_exam_modules").select("*"),
        supabase.from("nvo_module_questions").select("*").order("sort_order"),
        supabase.from("quiz_questions").select("*").order("created_at"),
        supabase.from("topics").select("*").order("subject").order("sort_order"),
      ]);
      setExams((exRes.data || []) as NvoExam[]);
      setModules((modRes.data || []) as NvoModule[]);
      setModuleQuestions((mqRes.data || []) as NvoModuleQuestion[]);
      setAllQuestions((qRes.data || []).map((q: any) => ({
        ...q, options: Array.isArray(q.options) ? q.options : [],
        question_type: q.question_type || "multiple_choice",
        max_points: q.max_points || 1,
      })) as QuizQuestion[]);
      setTopics((tRes.data || []) as Topic[]);
    } catch (err) {
      console.error("ExamBuilder fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const createExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);

    const { data: exam, error } = await supabase.from("nvo_exams").insert({
      title: newTitle, subject: newSubject, created_by: user!.id,
    }).select().single();

    if (error || !exam) { toast.error(error?.message || "Грешка"); setSaving(false); return; }

    // Create default modules
    const mods = DEFAULT_MODULES[newSubject];
    for (const m of mods) {
      await supabase.from("nvo_exam_modules").insert({
        exam_id: exam.id, module_number: m.module_number,
        time_minutes: m.time_minutes, max_points: m.max_points,
      });
    }

    toast.success("Пробното НВО е създадено!");
    setNewTitle("");
    setExpandedExam(exam.id);
    await fetchAll();
    setSaving(false);
  };

  const deleteExam = async (id: string) => {
    if (!confirm("Сигурни ли сте?")) return;
    await supabase.from("nvo_exams").delete().eq("id", id);
    toast.success("Изтрито!");
    if (expandedExam === id) setExpandedExam(null);
    fetchAll();
  };

  const updateModule = async (modId: string, updates: Partial<NvoModule>) => {
    const { error } = await supabase.from("nvo_exam_modules").update(updates).eq("id", modId);
    if (error) toast.error(error.message);
    else {
      setModules(prev => prev.map(m => m.id === modId ? { ...m, ...updates } : m));
      toast.success("Модулът е обновен!");
    }
  };

  const addQuestionToModule = async (moduleId: string, questionId: string) => {
    // Check if already added
    if (moduleQuestions.some(mq => mq.module_id === moduleId && mq.question_id === questionId)) {
      toast.error("Въпросът вече е добавен в този модул.");
      return;
    }
    const maxOrder = moduleQuestions.filter(mq => mq.module_id === moduleId).reduce((max, mq) => Math.max(max, mq.sort_order), -1);
    const { error } = await supabase.from("nvo_module_questions").insert({
      module_id: moduleId, question_id: questionId, sort_order: maxOrder + 1,
    });
    if (error) toast.error(error.message);
    else { toast.success("Въпросът е добавен!"); fetchAll(); }
  };

  const removeQuestionFromModule = async (mqId: string) => {
    await supabase.from("nvo_module_questions").delete().eq("id", mqId);
    toast.success("Премахнато!");
    fetchAll();
  };

  const moveQuestion = async (mqId: string, moduleId: string, direction: "up" | "down") => {
    const modQs = moduleQuestions.filter(mq => mq.module_id === moduleId).sort((a, b) => a.sort_order - b.sort_order);
    const idx = modQs.findIndex(mq => mq.id === mqId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= modQs.length) return;

    const a = modQs[idx];
    const b = modQs[swapIdx];
    await Promise.all([
      supabase.from("nvo_module_questions").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("nvo_module_questions").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    fetchAll();
  };

  const topicName = (id: string | null) => topics.find(t => t.id === id)?.name || "—";

  const inputCls = "rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Create new exam */}
      <form onSubmit={createExam} className="bg-card rounded-2xl shadow-card p-6 space-y-4">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4" /> Ново пробно НВО
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Заглавие (напр. Пробно НВО #1)" className={`${inputCls} col-span-2`} required />
          <select value={newSubject} onChange={e => setNewSubject(e.target.value as SubjectType)} className={inputCls}>
            <option value="bel">БЕЛ</option>
            <option value="math">Математика</option>
          </select>
        </div>
        <p className="text-xs text-muted-foreground">
          {newSubject === "bel"
            ? "Ще се създадат 2 модула: Модул 1 (60 мин, 65 т.) и Модул 2 (90 мин, 35 т.)"
            : "Ще се създадат 2 модула: Модул 1 (75 мин, 65 т.) и Модул 2 (90 мин, 35 т.)"}
        </p>
        <button type="submit" disabled={saving} className="gradient-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
          {saving ? "Създаване..." : "Създай пробно НВО"}
        </button>
      </form>

      {/* Existing exams */}
      {exams.map(exam => {
        const examModules = modules.filter(m => m.exam_id === exam.id).sort((a, b) => a.module_number - b.module_number);
        const isExpanded = expandedExam === exam.id;

        return (
          <div key={exam.id} className="bg-card rounded-2xl shadow-card overflow-hidden">
            <button onClick={() => setExpandedExam(isExpanded ? null : exam.id)}
              className="w-full flex items-center justify-between p-5 text-left">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {exam.subject === "bel" ? "БЕЛ" : "Математика"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {examModules.reduce((sum, m) => sum + moduleQuestions.filter(mq => mq.module_id === m.id).length, 0)} въпроса
                  </span>
                </div>
                <h4 className="font-display font-semibold text-foreground">{exam.title}</h4>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); deleteExam(exam.id); }}
                  className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
              </div>
            </button>

            {isExpanded && (
              <div className="px-5 pb-5 space-y-6">
                {examModules.map(mod => {
                  const modQs = moduleQuestions.filter(mq => mq.module_id === mod.id).sort((a, b) => a.sort_order - b.sort_order);
                  const currentPoints = modQs.reduce((sum, mq) => {
                    const q = allQuestions.find(aq => aq.id === mq.question_id);
                    return sum + (q?.max_points || 0);
                  }, 0);
                  const availableQs = allQuestions.filter(q =>
                    q.subject === exam.subject &&
                    !modQs.some(mq => mq.question_id === q.id) &&
                    (!filterTopic || q.topic_id === filterTopic)
                  );

                  return (
                    <div key={mod.id} className="border border-border rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h5 className="font-display font-semibold text-foreground">
                          Модул {mod.module_number}
                        </h5>
                        <div className="flex items-center gap-3 text-sm">
                          <label className="flex items-center gap-1 text-muted-foreground">
                            ⏱️
                            <input type="number" value={mod.time_minutes} min={1}
                              onChange={e => updateModule(mod.id, { time_minutes: Number(e.target.value) })}
                              className="w-16 rounded-lg border border-input bg-background px-2 py-1 text-sm" /> мин.
                          </label>
                          <label className="flex items-center gap-1 text-muted-foreground">
                            🎯
                            <input type="number" value={mod.max_points} min={1}
                              onChange={e => updateModule(mod.id, { max_points: Number(e.target.value) })}
                              className="w-16 rounded-lg border border-input bg-background px-2 py-1 text-sm" /> т.
                          </label>
                          <span className={`text-xs font-medium px-2 py-1 rounded-lg ${currentPoints === mod.max_points ? "bg-secondary/20 text-secondary" : currentPoints > mod.max_points ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"}`}>
                            {currentPoints}/{mod.max_points} т.
                          </span>
                        </div>
                      </div>

                      {/* Module questions */}
                      {modQs.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Няма добавени въпроси</p>
                      ) : (
                        <div className="space-y-1.5">
                          {modQs.map((mq, idx) => {
                            const q = allQuestions.find(aq => aq.id === mq.question_id);
                            if (!q) return null;
                            return (
                              <div key={mq.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm">
                                <div className="flex flex-col gap-0.5">
                                  <button onClick={() => moveQuestion(mq.id, mod.id, "up")} disabled={idx === 0}
                                    className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => moveQuestion(mq.id, mod.id, "down")} disabled={idx === modQs.length - 1}
                                    className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                </div>
                                <span className="text-muted-foreground font-mono text-xs w-6">{idx + 1}.</span>
                                <span className="flex-1 truncate text-foreground">{q.question}</span>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {q.question_type === "open_ended" ? "Отворен" : "Затворен"} · {q.max_points}т.
                                </span>
                                {q.topic_id && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">{topicName(q.topic_id)}</span>}
                                <button onClick={() => removeQuestionFromModule(mq.id)}
                                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add question picker */}
                      <div className="border-t border-border pt-3 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground font-medium">Добави въпрос:</span>
                          <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)}
                            className="rounded-lg border border-input bg-background px-2 py-1 text-xs">
                            <option value="">Всички теми</option>
                            {topics.filter(t => t.subject === exam.subject).map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {availableQs.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">Няма налични въпроси</p>
                          ) : availableQs.map(q => (
                            <button key={q.id} onClick={() => addQuestionToModule(mod.id, q.id)}
                              className="w-full flex items-center gap-2 text-left bg-background hover:bg-muted/50 rounded-lg px-3 py-2 text-sm transition-colors">
                              <Plus className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="flex-1 truncate">{q.question}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {q.question_type === "open_ended" ? "Отв." : "Затв."} · {q.max_points}т.
                              </span>
                              {q.topic_id && <span className="text-xs text-muted-foreground shrink-0">{topicName(q.topic_id)}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {exams.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Няма създадени пробни НВО-та. Създайте първото!</p>
      )}
    </div>
  );
}
