import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, BookOpen, Calculator, Loader2, Upload, Edit2, Save, X, Tag } from "lucide-react";
import { toast } from "sonner";

type SubjectType = "bel" | "math";
type QuestionType = "multiple_choice" | "open_ended";

interface Topic {
  id: string;
  name: string;
  subject: SubjectType;
  description: string | null;
  sort_order: number;
}

interface Material {
  id: string;
  title: string;
  content: string;
  subject: SubjectType;
  topic_id: string | null;
  created_at: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  subject: SubjectType;
  question_type: QuestionType;
  grading_criteria: string | null;
  max_points: number;
  topic_id: string | null;
  explanation: string | null;
}

export default function AdminPanel() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<"materials" | "quiz" | "topics">("topics");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Topic form
  const [topicName, setTopicName] = useState("");
  const [topicSubject, setTopicSubject] = useState<SubjectType>("bel");
  const [topicDesc, setTopicDesc] = useState("");

  // Material form
  const [matTitle, setMatTitle] = useState("");
  const [matContent, setMatContent] = useState("");
  const [matSubject, setMatSubject] = useState<SubjectType>("bel");
  const [matTopicId, setMatTopicId] = useState("");
  const [matFile, setMatFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Quiz form
  const [qQuestion, setQQuestion] = useState("");
  const [qOptions, setQOptions] = useState(["", "", "", ""]);
  const [qCorrect, setQCorrect] = useState(0);
  const [qSubject, setQSubject] = useState<SubjectType>("bel");
  const [qTopicId, setQTopicId] = useState("");
  const [qExplanation, setQExplanation] = useState("");
  const [qType, setQType] = useState<QuestionType>("multiple_choice");
  const [qCriteria, setQCriteria] = useState("");
  const [qMaxPoints, setQMaxPoints] = useState(1);

  // Edit state
  const [editingMat, setEditingMat] = useState<string | null>(null);
  const [editMatData, setEditMatData] = useState<Partial<Material>>({});
  const [editingQ, setEditingQ] = useState<string | null>(null);
  const [editQData, setEditQData] = useState<Partial<QuizQuestion>>({});
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [editTopicData, setEditTopicData] = useState<Partial<Topic>>({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [topRes, matRes, qRes] = await Promise.all([
      supabase.from("topics").select("*").order("subject").order("sort_order"),
      supabase.from("materials").select("*").order("created_at", { ascending: false }),
      supabase.from("quiz_questions").select("*").order("created_at", { ascending: false }),
    ]);
    setTopics((topRes.data || []) as Topic[]);
    setMaterials((matRes.data || []) as Material[]);
    setQuestions(
      (qRes.data || []).map((q: any) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : [],
        question_type: q.question_type || "multiple_choice",
        max_points: q.max_points || 1,
      })) as QuizQuestion[]
    );
    setLoading(false);
  };

  // Topic CRUD
  const addTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("topics").insert({
      name: topicName, subject: topicSubject, description: topicDesc || null,
      sort_order: topics.filter(t => t.subject === topicSubject).length + 1,
    });
    if (error) toast.error(error.message);
    else { toast.success("Темата е добавена!"); setTopicName(""); setTopicDesc(""); fetchData(); }
    setSaving(false);
  };

  const saveTopic = async (id: string) => {
    const { error } = await supabase.from("topics").update({
      name: editTopicData.name, description: editTopicData.description || null,
      subject: editTopicData.subject,
    }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Темата е запазена!"); setEditingTopic(null); fetchData(); }
  };

  const deleteTopic = async (id: string) => {
    await supabase.from("topics").delete().eq("id", id);
    toast.success("Темата е изтрита!");
    fetchData();
  };

  // Material CRUD
  const addMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle.trim() || !matContent.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("materials").insert({
      title: matTitle, content: matContent, subject: matSubject,
      topic_id: matTopicId || null, created_by: user!.id,
    }).select().single();

    if (error) { toast.error(error.message); setSaving(false); return; }

    if (matFile && data) {
      const filePath = `${data.id}/${matFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("materials").upload(filePath, matFile);
      if (uploadErr) toast.error("Грешка при качване: " + uploadErr.message);
      else await supabase.from("material_files").insert({
        material_id: data.id, file_name: matFile.name, file_path: filePath, file_type: matFile.type,
      });
    }
    toast.success("Материалът е добавен!");
    setMatTitle(""); setMatContent(""); setMatFile(null); setMatTopicId("");
    setSaving(false); fetchData();
  };

  const saveMaterial = async (id: string) => {
    const { error } = await supabase.from("materials").update({
      title: editMatData.title, content: editMatData.content,
      subject: editMatData.subject, topic_id: editMatData.topic_id || null,
    }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Запазено!"); setEditingMat(null); fetchData(); }
  };

  const deleteMaterial = async (id: string) => {
    await supabase.from("materials").delete().eq("id", id);
    toast.success("Изтрито!"); fetchData();
  };

  // Question CRUD
  const addQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qQuestion.trim()) return;
    if (qType === "multiple_choice" && qOptions.some(o => !o.trim())) return;
    setSaving(true);
    const { error } = await supabase.from("quiz_questions").insert({
      question: qQuestion,
      options: qType === "multiple_choice" ? qOptions : [],
      correct_answer: qType === "multiple_choice" ? qCorrect : 0,
      subject: qSubject, topic_id: qTopicId || null,
      explanation: qExplanation || null,
      question_type: qType,
      grading_criteria: qType === "open_ended" ? qCriteria : null,
      max_points: qMaxPoints, created_by: user!.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Въпросът е добавен!");
      setQQuestion(""); setQOptions(["", "", "", ""]); setQCorrect(0);
      setQExplanation(""); setQCriteria(""); setQMaxPoints(1); setQTopicId("");
      fetchData();
    }
    setSaving(false);
  };

  const saveQuestion = async (id: string) => {
    const { error } = await supabase.from("quiz_questions").update({
      question: editQData.question,
      options: editQData.question_type === "multiple_choice" ? editQData.options : [],
      correct_answer: editQData.correct_answer,
      subject: editQData.subject,
      topic_id: editQData.topic_id || null,
      explanation: editQData.explanation,
      question_type: editQData.question_type,
      grading_criteria: editQData.grading_criteria,
      max_points: editQData.max_points,
    }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Запазено!"); setEditingQ(null); fetchData(); }
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("quiz_questions").delete().eq("id", id);
    toast.success("Изтрито!"); fetchData();
  };

  const topicsForSubject = (s: SubjectType) => topics.filter(t => t.subject === s);
  const topicName2 = (id: string | null) => topics.find(t => t.id === id)?.name || "—";
  const subjectLabel = (s: SubjectType) => s === "bel" ? "БЕЛ" : "Математика";

  const inputCls = "rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-bold text-foreground">Админ панел</h2>
        <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Изход</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
        {(["topics", "materials", "quiz"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            {t === "topics" ? `🏷️ Теми (${topics.length})` : t === "materials" ? `📚 Материали (${materials.length})` : `❓ Тестове (${questions.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : tab === "topics" ? (
        <div className="space-y-6">
          <form onSubmit={addTopic} className="bg-card rounded-2xl shadow-card p-6 space-y-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2"><Tag className="w-4 h-4" /> Нова тема</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input value={topicName} onChange={e => setTopicName(e.target.value)} placeholder="Име на темата" className={inputCls} required />
              <select value={topicSubject} onChange={e => setTopicSubject(e.target.value as SubjectType)} className={inputCls}>
                <option value="bel">БЕЛ</option><option value="math">Математика</option>
              </select>
            </div>
            <textarea value={topicDesc} onChange={e => setTopicDesc(e.target.value)} placeholder="Описание..." rows={2} className={`w-full ${inputCls} resize-y`} />
            <button type="submit" disabled={saving} className="gradient-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? "Запазване..." : "Добави тема"}
            </button>
          </form>

          {["bel", "math"].map(s => {
            const subTopics = topicsForSubject(s as SubjectType);
            if (subTopics.length === 0) return null;
            return (
              <div key={s}>
                <h4 className="font-display font-semibold text-foreground mb-3">{s === "bel" ? "🇧🇬 БЕЛ" : "📐 Математика"}</h4>
                <div className="space-y-2">
                  {subTopics.map(t => editingTopic === t.id ? (
                    <div key={t.id} className="bg-card rounded-xl shadow-card p-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input value={editTopicData.name || ""} onChange={e => setEditTopicData({...editTopicData, name: e.target.value})} className={`${inputCls} w-full`} placeholder="Име" />
                        <select value={editTopicData.subject} onChange={e => setEditTopicData({...editTopicData, subject: e.target.value as SubjectType})} className={inputCls}>
                          <option value="bel">БЕЛ</option><option value="math">Математика</option>
                        </select>
                      </div>
                      <textarea value={editTopicData.description || ""} onChange={e => setEditTopicData({...editTopicData, description: e.target.value})} rows={2} className={`w-full ${inputCls} resize-y`} placeholder="Описание..." />
                      <div className="flex gap-2">
                        <button onClick={() => saveTopic(t.id)} className="gradient-primary text-primary-foreground font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-1"><Save className="w-3 h-3" /> Запази</button>
                        <button onClick={() => setEditingTopic(null)} className="bg-muted text-muted-foreground px-4 py-2 rounded-xl text-sm flex items-center gap-1"><X className="w-3 h-3" /> Откажи</button>
                      </div>
                    </div>
                  ) : (
                    <div key={t.id} className="bg-card rounded-xl shadow-card p-4 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-foreground">{t.name}</span>
                        {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                        <p className="text-xs text-muted-foreground">
                          {materials.filter(m => m.topic_id === t.id).length} материала · {questions.filter(q => q.topic_id === t.id).length} въпроса
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingTopic(t.id); setEditTopicData(t); }} className="text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteTopic(t.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : tab === "materials" ? (
        <div className="space-y-6">
          <form onSubmit={addMaterial} className="bg-card rounded-2xl shadow-card p-6 space-y-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2"><Plus className="w-4 h-4" /> Нов материал</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input value={matTitle} onChange={e => setMatTitle(e.target.value)} placeholder="Заглавие" className={inputCls} required />
              <select value={matSubject} onChange={e => { setMatSubject(e.target.value as SubjectType); setMatTopicId(""); }} className={inputCls}>
                <option value="bel">БЕЛ</option><option value="math">Математика</option>
              </select>
              <select value={matTopicId} onChange={e => setMatTopicId(e.target.value)} className={inputCls}>
                <option value="">-- Тема --</option>
                {topicsForSubject(matSubject).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <textarea value={matContent} onChange={e => setMatContent(e.target.value)} placeholder="Съдържание..." rows={6} className={`w-full ${inputCls} resize-y`} required />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Upload className="w-4 h-4" />
                {matFile ? matFile.name : "Прикачи файл"}
                <input type="file" className="hidden" onChange={e => setMatFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <button type="submit" disabled={saving} className="gradient-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? "Запазване..." : "Добави материал"}
            </button>
          </form>

          {materials.map(m => editingMat === m.id ? (
            <div key={m.id} className="bg-card rounded-2xl shadow-card p-5 space-y-3">
              <input value={editMatData.title || ""} onChange={e => setEditMatData({...editMatData, title: e.target.value})} className={`w-full ${inputCls}`} />
              <div className="grid grid-cols-2 gap-3">
                <select value={editMatData.subject} onChange={e => setEditMatData({...editMatData, subject: e.target.value as SubjectType, topic_id: null})} className={inputCls}>
                  <option value="bel">БЕЛ</option><option value="math">Математика</option>
                </select>
                <select value={editMatData.topic_id || ""} onChange={e => setEditMatData({...editMatData, topic_id: e.target.value || null})} className={inputCls}>
                  <option value="">-- Тема --</option>
                  {topicsForSubject(editMatData.subject || "bel").map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <textarea value={editMatData.content || ""} onChange={e => setEditMatData({...editMatData, content: e.target.value})} rows={6} className={`w-full ${inputCls} resize-y`} />
              <div className="flex gap-2">
                <button onClick={() => saveMaterial(m.id)} className="gradient-primary text-primary-foreground font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-1"><Save className="w-3 h-3" /> Запази</button>
                <button onClick={() => setEditingMat(null)} className="bg-muted text-muted-foreground px-4 py-2 rounded-xl text-sm flex items-center gap-1"><X className="w-3 h-3" /> Откажи</button>
              </div>
            </div>
          ) : (
            <div key={m.id} className="bg-card rounded-2xl shadow-card p-5 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{subjectLabel(m.subject)}</span>
                  {m.topic_id && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{topicName2(m.topic_id)}</span>}
                </div>
                <h4 className="font-display font-semibold text-foreground">{m.title}</h4>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.content}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditingMat(m.id); setEditMatData(m); }} className="text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => deleteMaterial(m.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <form onSubmit={addQuestion} className="bg-card rounded-2xl shadow-card p-6 space-y-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2"><Plus className="w-4 h-4" /> Нов въпрос</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <select value={qType} onChange={e => setQType(e.target.value as QuestionType)} className={inputCls}>
                <option value="multiple_choice">Затворен въпрос (с варианти)</option>
                <option value="open_ended">Отворен въпрос (с AI оценяване)</option>
              </select>
              <select value={qSubject} onChange={e => { setQSubject(e.target.value as SubjectType); setQTopicId(""); }} className={inputCls}>
                <option value="bel">БЕЛ</option><option value="math">Математика</option>
              </select>
              <select value={qTopicId} onChange={e => setQTopicId(e.target.value)} className={inputCls}>
                <option value="">-- Тема --</option>
                {topicsForSubject(qSubject).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input type="number" value={qMaxPoints} onChange={e => setQMaxPoints(Number(e.target.value))} min={1} max={20} className={inputCls} placeholder="Точки" />
            </div>
            <textarea value={qQuestion} onChange={e => setQQuestion(e.target.value)} placeholder="Въпрос..." rows={3} className={`w-full ${inputCls} resize-y`} required />

            {qType === "multiple_choice" ? (
              <>
                {qOptions.map((opt, i) => (
                  <input key={i} value={opt} onChange={e => { const c = [...qOptions]; c[i] = e.target.value; setQOptions(c); }}
                    placeholder={`Вариант ${String.fromCharCode(65 + i)}`} className={`w-full ${inputCls}`} required />
                ))}
                <select value={qCorrect} onChange={e => setQCorrect(Number(e.target.value))} className={inputCls}>
                  {qOptions.map((_, i) => <option key={i} value={i}>Верен отговор: {String.fromCharCode(65 + i)}</option>)}
                </select>
              </>
            ) : (
              <textarea value={qCriteria} onChange={e => setQCriteria(e.target.value)}
                placeholder="Критерии за оценяване от AI (напр.: 1. Точност на отговора (0-3 точки)... 2. Езикова грамотност (0-2 точки)...)"
                rows={5} className={`w-full ${inputCls} resize-y`} required />
            )}

            <textarea value={qExplanation} onChange={e => setQExplanation(e.target.value)} placeholder="Обяснение / примерен верен отговор (по желание)..." rows={2} className={`w-full ${inputCls} resize-y`} />
            <button type="submit" disabled={saving} className="gradient-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? "Запазване..." : "Добави въпрос"}
            </button>
          </form>

          {questions.map(q => editingQ === q.id ? (
            <div key={q.id} className="bg-card rounded-2xl shadow-card p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select value={editQData.question_type} onChange={e => setEditQData({...editQData, question_type: e.target.value as QuestionType})} className={inputCls}>
                  <option value="multiple_choice">Затворен въпрос</option><option value="open_ended">Отворен въпрос</option>
                </select>
                <select value={editQData.subject} onChange={e => setEditQData({...editQData, subject: e.target.value as SubjectType})} className={inputCls}>
                  <option value="bel">БЕЛ</option><option value="math">Математика</option>
                </select>
                <select value={editQData.topic_id || ""} onChange={e => setEditQData({...editQData, topic_id: e.target.value || null})} className={inputCls}>
                  <option value="">-- Тема --</option>
                  {topicsForSubject(editQData.subject || "bel").map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <input type="number" value={editQData.max_points || 1} onChange={e => setEditQData({...editQData, max_points: Number(e.target.value)})} min={1} className={inputCls} />
              </div>
              <textarea value={editQData.question || ""} onChange={e => setEditQData({...editQData, question: e.target.value})} rows={3} className={`w-full ${inputCls} resize-y`} />
              {editQData.question_type === "multiple_choice" ? (
                <>
                  {(editQData.options || []).map((opt, i) => (
                    <input key={i} value={opt} onChange={e => { const c = [...(editQData.options || [])]; c[i] = e.target.value; setEditQData({...editQData, options: c}); }}
                      className={`w-full ${inputCls}`} />
                  ))}
                  <select value={editQData.correct_answer} onChange={e => setEditQData({...editQData, correct_answer: Number(e.target.value)})} className={inputCls}>
                    {(editQData.options || []).map((_, i) => <option key={i} value={i}>Верен: {String.fromCharCode(65 + i)}</option>)}
                  </select>
                </>
              ) : (
                <textarea value={editQData.grading_criteria || ""} onChange={e => setEditQData({...editQData, grading_criteria: e.target.value})}
                  placeholder="Критерии за оценяване..." rows={4} className={`w-full ${inputCls} resize-y`} />
              )}
              <textarea value={editQData.explanation || ""} onChange={e => setEditQData({...editQData, explanation: e.target.value})} placeholder="Обяснение..." rows={2} className={`w-full ${inputCls} resize-y`} />
              <div className="flex gap-2">
                <button onClick={() => saveQuestion(q.id)} className="gradient-primary text-primary-foreground font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-1"><Save className="w-3 h-3" /> Запази</button>
                <button onClick={() => setEditingQ(null)} className="bg-muted text-muted-foreground px-4 py-2 rounded-xl text-sm flex items-center gap-1"><X className="w-3 h-3" /> Откажи</button>
              </div>
            </div>
          ) : (
            <div key={q.id} className="bg-card rounded-2xl shadow-card p-5 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{subjectLabel(q.subject)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${q.question_type === "open_ended" ? "bg-accent/20 text-accent" : "bg-secondary/20 text-secondary"}`}>
                    {q.question_type === "open_ended" ? "Отворен" : "Затворен"} · {q.max_points}т.
                  </span>
                  {q.topic_id && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{topicName2(q.topic_id)}</span>}
                </div>
                <h4 className="font-display font-semibold text-foreground text-sm">{q.question}</h4>
                {q.question_type === "multiple_choice" && (
                  <div className="mt-2 space-y-1">
                    {q.options.map((opt, i) => (
                      <div key={i} className={`text-xs px-3 py-1.5 rounded-lg ${i === q.correct_answer ? "bg-secondary/20 text-secondary font-medium" : "bg-muted text-muted-foreground"}`}>
                        {String.fromCharCode(65 + i)}. {opt}
                      </div>
                    ))}
                  </div>
                )}
                {q.question_type === "open_ended" && q.grading_criteria && (
                  <p className="text-xs text-muted-foreground mt-2 bg-muted rounded-lg p-2">📋 {q.grading_criteria.slice(0, 100)}...</p>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditingQ(q.id); setEditQData(q); }} className="text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => deleteQuestion(q.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
