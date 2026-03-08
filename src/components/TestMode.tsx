import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle, XCircle, Loader2, Send, Award, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type SubjectType = "bel" | "math";
type QuestionType = "multiple_choice" | "open_ended";

interface Topic {
  id: string;
  name: string;
  subject: SubjectType;
  description: string | null;
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

interface GradeResult {
  score: number;
  feedback: string;
  strengths: string;
  improvements: string;
}

type TestType = "topic" | "full" | "exam";

export default function TestMode() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [allQuestions, setAllQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Test state
  const [testType, setTestType] = useState<TestType | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectType | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [testQuestions, setTestQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { type: "mc"; value: number } | { type: "open"; value: string; grade?: GradeResult }>>({});
  const [submitted, setSubmitted] = useState(false);
  const [grading, setGrading] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [tRes, qRes] = await Promise.all([
        supabase.from("topics").select("*").order("subject").order("sort_order"),
        supabase.from("quiz_questions").select("*").order("created_at"),
      ]);
      setTopics((tRes.data || []) as Topic[]);
      setAllQuestions(
        (qRes.data || []).map((q: any) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : [],
          question_type: q.question_type || "multiple_choice",
          max_points: q.max_points || 1,
        })) as QuizQuestion[]
      );
      setLoading(false);
    };
    load();
  }, []);

  const startTopicTest = (topic: Topic) => {
    const qs = allQuestions.filter(q => q.topic_id === topic.id);
    const shuffled = [...qs].sort(() => Math.random() - 0.5).slice(0, 10);
    if (shuffled.length === 0) { toast.error("Няма въпроси за тази тема."); return; }
    setTestType("topic");
    setSelectedTopic(topic);
    setTestQuestions(shuffled);
    setCurrentIdx(0);
    setAnswers({});
    setSubmitted(false);
  };

  const startFullTest = (subject: SubjectType) => {
    const qs = allQuestions.filter(q => q.subject === subject);
    const shuffled = [...qs].sort(() => Math.random() - 0.5);
    if (shuffled.length === 0) { toast.error("Няма въпроси."); return; }
    setTestType("full");
    setSelectedSubject(subject);
    setTestQuestions(shuffled);
    setCurrentIdx(0);
    setAnswers({});
    setSubmitted(false);
  };

  const startExamTest = (subject: SubjectType) => {
    const qs = allQuestions.filter(q => q.subject === subject);
    // Exam format: first multiple choice, then open-ended
    const mc = qs.filter(q => q.question_type === "multiple_choice").sort(() => Math.random() - 0.5).slice(0, subject === "bel" ? 23 : 20);
    const oe = qs.filter(q => q.question_type === "open_ended").sort(() => Math.random() - 0.5).slice(0, subject === "bel" ? 2 : 5);
    const combined = [...mc, ...oe];
    if (combined.length === 0) { toast.error("Няма достатъчно въпроси."); return; }
    setTestType("exam");
    setSelectedSubject(subject);
    setTestQuestions(combined);
    setCurrentIdx(0);
    setAnswers({});
    setSubmitted(false);
  };

  const selectMC = (qId: string, idx: number) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qId]: { type: "mc", value: idx } }));
  };

  const setOpenAnswer = (qId: string, text: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qId]: { type: "open", value: text } }));
  };

  const submitTest = async () => {
    setSubmitted(true);

    // Grade open-ended questions
    const openQs = testQuestions.filter(q => q.question_type === "open_ended" && answers[q.id]?.type === "open" && (answers[q.id] as any).value.trim());
    for (const q of openQs) {
      setGrading(q.id);
      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grade-answer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            question: q.question,
            studentAnswer: (answers[q.id] as any).value,
            gradingCriteria: q.grading_criteria,
            maxPoints: q.max_points,
          }),
        });
        if (resp.ok) {
          const grade: GradeResult = await resp.json();
          setAnswers(prev => ({
            ...prev,
            [q.id]: { ...(prev[q.id] as any), grade },
          }));
        } else {
          toast.error("Грешка при оценяване на отворен въпрос.");
        }
      } catch {
        toast.error("Грешка при оценяване.");
      }
    }
    setGrading(null);

    // Save attempt
    const totalScore = testQuestions.reduce((sum, q) => {
      const a = answers[q.id];
      if (!a) return sum;
      if (a.type === "mc" && a.value === q.correct_answer) return sum + q.max_points;
      if (a.type === "open" && a.grade) return sum + a.grade.score;
      return sum;
    }, 0);
    const maxScore = testQuestions.reduce((sum, q) => sum + q.max_points, 0);

    await supabase.from("test_attempts").insert({
      test_type: testType,
      topic_id: selectedTopic?.id || null,
      subject: selectedSubject || selectedTopic?.subject || null,
      answers: Object.entries(answers).map(([qId, a]) => ({ question_id: qId, ...a })),
      score: totalScore,
      max_score: maxScore,
      completed_at: new Date().toISOString(),
    });
  };

  const totalScore = testQuestions.reduce((sum, q) => {
    const a = answers[q.id];
    if (!a) return sum;
    if (a.type === "mc" && a.value === q.correct_answer) return sum + q.max_points;
    if (a.type === "open" && a.grade) return sum + a.grade.score;
    return sum;
  }, 0);
  const maxScore = testQuestions.reduce((sum, q) => sum + q.max_points, 0);

  const reset = () => {
    setTestType(null); setSelectedSubject(null); setSelectedTopic(null);
    setTestQuestions([]); setCurrentIdx(0); setAnswers({}); setSubmitted(false);
  };

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  // Selection screen
  if (!testType) {
    const belTopics = topics.filter(t => t.subject === "bel");
    const mathTopics = topics.filter(t => t.subject === "math");

    return (
      <section className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-display font-bold text-foreground text-center mb-2">🎯 Режим Тест</h2>
        <p className="text-muted-foreground text-center mb-8">Избери какъв тест искаш да решиш</p>

        {/* Exam simulation */}
        <div className="mb-8">
          <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">📝 Пробна матура (НВО формат)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(["bel", "math"] as const).map(s => (
              <button key={s} onClick={() => startExamTest(s)}
                className="bg-card rounded-2xl shadow-card p-6 text-left hover:shadow-elevated transition-all group">
                <div className="text-3xl mb-2">{s === "bel" ? "🇧🇬" : "📐"}</div>
                <h4 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">{s === "bel" ? "НВО по БЕЛ" : "НВО по Математика"}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {s === "bel" ? "23 затворени + 2 отворени въпроса" : "20 затворени + 5 отворени задачи"}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2"><Clock className="w-3 h-3" /> ~{s === "bel" ? "150" : "120"} мин.</div>
              </button>
            ))}
          </div>
        </div>

        {/* Full test */}
        <div className="mb-8">
          <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">📋 Пълен тест (всички теми)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(["bel", "math"] as const).map(s => {
              const count = allQuestions.filter(q => q.subject === s).length;
              return (
                <button key={s} onClick={() => startFullTest(s)}
                  className="bg-card rounded-2xl shadow-card p-5 text-left hover:shadow-elevated transition-all">
                  <h4 className="font-display font-semibold text-foreground">{s === "bel" ? "🇧🇬 БЕЛ" : "📐 Математика"}</h4>
                  <p className="text-sm text-muted-foreground">{count} въпроса от всички теми</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Topic tests */}
        {["bel", "math"].map(s => {
          const subTopics = s === "bel" ? belTopics : mathTopics;
          if (subTopics.length === 0) return null;
          return (
            <div key={s} className="mb-8">
              <h3 className="font-display font-semibold text-lg text-foreground mb-4">{s === "bel" ? "🇧🇬 Теми по БЕЛ" : "📐 Теми по Математика"}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subTopics.map(t => {
                  const count = allQuestions.filter(q => q.topic_id === t.id).length;
                  return (
                    <button key={t.id} onClick={() => startTopicTest(t)} disabled={count === 0}
                      className="bg-card rounded-xl shadow-card p-4 text-left hover:shadow-elevated transition-all disabled:opacity-50">
                      <h4 className="font-display font-semibold text-foreground text-sm">{t.name}</h4>
                      {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{count} въпроса · до 10 на тест</p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    );
  }

  // Test in progress
  const q = testQuestions[currentIdx];
  const answered = answers[q?.id];

  return (
    <section className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={reset} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>
        <div className="text-sm font-medium text-foreground">
          {testType === "exam" ? "📝 Пробна матура" : testType === "full" ? "📋 Пълен тест" : `🎯 ${selectedTopic?.name}`}
        </div>
        <div className="text-sm text-muted-foreground">{currentIdx + 1} / {testQuestions.length}</div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2 mb-6">
        <div className="gradient-primary h-2 rounded-full transition-all" style={{ width: `${((currentIdx + 1) / testQuestions.length) * 100}%` }} />
      </div>

      {/* Results */}
      {submitted && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl shadow-card p-6 mb-6 text-center">
          <Award className="w-12 h-12 mx-auto text-accent mb-3" />
          <h3 className="text-xl font-display font-bold text-foreground">Резултат</h3>
          <p className="text-3xl font-bold gradient-text mt-2">{totalScore} / {maxScore}</p>
          <p className="text-muted-foreground text-sm mt-1">
            {Math.round((totalScore / maxScore) * 100)}% · {totalScore >= maxScore * 0.7 ? "Отлично! 🎉" : totalScore >= maxScore * 0.5 ? "Добре! 👍" : "Продължавай да учиш! 💪"}
          </p>
          {grading && <p className="text-sm text-accent mt-2 flex items-center justify-center gap-1"><Loader2 className="w-4 h-4 animate-spin" /> Оценяване на отворени въпроси...</p>}
        </motion.div>
      )}

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div key={currentIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          className="bg-card rounded-2xl shadow-card p-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Въпрос {currentIdx + 1}</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{q.max_points} т.</span>
            {q.question_type === "open_ended" && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">Отворен въпрос</span>}
          </div>
          <p className="font-medium text-foreground mb-4 whitespace-pre-wrap">{q.question}</p>

          {q.question_type === "multiple_choice" ? (
            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const isSelected = answered?.type === "mc" && answered.value === i;
                const isCorrect = i === q.correct_answer;
                let cls = "bg-muted text-muted-foreground hover:bg-muted/80";
                if (submitted && isCorrect) cls = "bg-secondary/20 text-secondary font-medium";
                else if (submitted && isSelected && !isCorrect) cls = "bg-destructive/10 text-destructive";
                else if (isSelected) cls = "bg-primary/10 text-primary";

                return (
                  <button key={i} onClick={() => selectMC(q.id, i)} disabled={submitted}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 ${cls}`}>
                    {submitted && isCorrect && <CheckCircle className="w-4 h-4" />}
                    {submitted && isSelected && !isCorrect && <XCircle className="w-4 h-4" />}
                    <span>{String.fromCharCode(65 + i)}. {opt}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={answered?.type === "open" ? answered.value : ""}
                onChange={e => setOpenAnswer(q.id, e.target.value)}
                placeholder="Напиши отговора си тук..."
                rows={8}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                disabled={submitted}
              />
              {submitted && answered?.type === "open" && (
                grading === q.id ? (
                  <div className="flex items-center gap-2 text-sm text-accent"><Loader2 className="w-4 h-4 animate-spin" /> AI оценява отговора ти...</div>
                ) : answered.grade ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="bg-primary/10 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-primary text-sm">AI Оценка</span>
                        <span className="font-bold text-primary">{answered.grade.score} / {q.max_points}</span>
                      </div>
                      <div className="prose prose-sm max-w-none text-foreground">
                        <ReactMarkdown>{answered.grade.feedback}</ReactMarkdown>
                      </div>
                    </div>
                    {answered.grade.strengths && (
                      <div className="bg-secondary/10 rounded-xl p-3">
                        <p className="text-xs font-semibold text-secondary mb-1">✅ Силни страни</p>
                        <p className="text-sm text-foreground">{answered.grade.strengths}</p>
                      </div>
                    )}
                    {answered.grade.improvements && (
                      <div className="bg-accent/10 rounded-xl p-3">
                        <p className="text-xs font-semibold text-accent mb-1">💡 За подобрение</p>
                        <p className="text-sm text-foreground">{answered.grade.improvements}</p>
                      </div>
                    )}
                  </motion.div>
                ) : null
              )}
            </div>
          )}

          {/* Explanation */}
          {submitted && q.explanation && (
            <p className="mt-4 text-sm text-muted-foreground bg-muted rounded-xl px-4 py-2">💡 {q.explanation}</p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 transition-all">
          ← Назад
        </button>

        {currentIdx < testQuestions.length - 1 ? (
          <button onClick={() => setCurrentIdx(currentIdx + 1)}
            className="gradient-primary text-primary-foreground font-semibold px-4 py-2 rounded-xl text-sm hover:opacity-90 transition-opacity">
            Напред →
          </button>
        ) : !submitted ? (
          <button onClick={submitTest}
            className="gradient-primary text-primary-foreground font-semibold px-6 py-2 rounded-xl text-sm hover:opacity-90 transition-opacity flex items-center gap-1">
            <Send className="w-4 h-4" /> Предай теста
          </button>
        ) : (
          <button onClick={reset}
            className="gradient-primary text-primary-foreground font-semibold px-4 py-2 rounded-xl text-sm hover:opacity-90 transition-opacity">
            Нов тест
          </button>
        )}
      </div>

      {/* Question dots */}
      <div className="flex flex-wrap justify-center gap-1.5 mt-6">
        {testQuestions.map((tq, i) => {
          const a = answers[tq.id];
          let dotCls = "bg-muted";
          if (submitted && a) {
            if (a.type === "mc") dotCls = a.value === tq.correct_answer ? "bg-secondary" : "bg-destructive";
            else if (a.type === "open" && a.grade) dotCls = a.grade.score >= tq.max_points * 0.5 ? "bg-secondary" : "bg-accent";
          } else if (a) dotCls = "bg-primary";
          if (i === currentIdx) dotCls += " ring-2 ring-ring ring-offset-2 ring-offset-background";
          return (
            <button key={i} onClick={() => setCurrentIdx(i)} className={`w-3 h-3 rounded-full transition-all ${dotCls}`} />
          );
        })}
      </div>
    </section>
  );
}
