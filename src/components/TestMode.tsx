import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle, XCircle, Loader2, Send, Award, Clock, BookOpen } from "lucide-react";
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
type ExamModule = 1 | 2;

interface NvoExam {
  id: string;
  title: string;
  subject: SubjectType;
}

interface NvoExamModule {
  id: string;
  exam_id: string;
  module_number: number;
  time_minutes: number;
  max_points: number;
}

interface NvoModuleQuestion {
  module_id: string;
  question_id: string;
  sort_order: number;
}

export default function TestMode() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [allQuestions, setAllQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Configured exams from DB
  const [nvoExams, setNvoExams] = useState<NvoExam[]>([]);
  const [nvoModules, setNvoModules] = useState<NvoExamModule[]>([]);
  const [nvoModuleQuestions, setNvoModuleQuestions] = useState<NvoModuleQuestion[]>([]);

  // Test state
  const [testType, setTestType] = useState<TestType | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectType | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [testQuestions, setTestQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { type: "mc"; value: number } | { type: "open"; value: string; grade?: GradeResult }>>({});
  const [submitted, setSubmitted] = useState(false);
  const [grading, setGrading] = useState<string | null>(null);

  // NVO exam module state
  const [examModule, setExamModule] = useState<ExamModule>(1);
  const [module1Questions, setModule1Questions] = useState<QuizQuestion[]>([]);
  const [module2Questions, setModule2Questions] = useState<QuizQuestion[]>([]);
  const [module1Submitted, setModule1Submitted] = useState(false);
  const [module1Time, setModule1Time] = useState(60);
  const [module2Time, setModule2Time] = useState(90);

  // Timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [tRes, qRes, exRes, modRes, mqRes] = await Promise.all([
          supabase.from("topics").select("*").order("subject").order("sort_order"),
          supabase.from("quiz_questions").select("*").order("created_at"),
          supabase.from("nvo_exams").select("*").order("created_at", { ascending: false }),
          supabase.from("nvo_exam_modules").select("*"),
          supabase.from("nvo_module_questions").select("*").order("sort_order"),
        ]);
        if (tRes.error) console.error("Topics fetch error:", tRes.error);
        if (qRes.error) console.error("Questions fetch error:", qRes.error);
        setTopics((tRes.data || []) as Topic[]);
        setAllQuestions(
          (qRes.data || []).map((q: any) => ({
            ...q,
            options: Array.isArray(q.options) ? q.options : [],
            question_type: q.question_type || "multiple_choice",
            max_points: q.max_points || 1,
          })) as QuizQuestion[]
        );
        setNvoExams((exRes.data || []) as NvoExam[]);
        setNvoModules((modRes.data || []) as NvoExamModule[]);
        setNvoModuleQuestions((mqRes.data || []) as NvoModuleQuestion[]);
      } catch (err) {
        console.error("Failed to load test data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Timer effect
  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !submitted && !(testType === "exam" && examModule === 1 && module1Submitted)) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev !== null && prev <= 1) {
            clearInterval(timerRef.current!);
            toast.warning("Времето изтече!");
            return 0;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [timeLeft, submitted, module1Submitted, examModule]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

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
    setTimeLeft(null);
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
    setTimeLeft(null);
  };

  const startExamTest = (examId: string) => {
    const exam = nvoExams.find(e => e.id === examId);
    if (!exam) return;

    const examMods = nvoModules.filter(m => m.exam_id === examId).sort((a, b) => a.module_number - b.module_number);
    if (examMods.length === 0) { toast.error("Това НВО няма конфигурирани модули."); return; }

    const mod1 = examMods.find(m => m.module_number === 1);
    const mod2 = examMods.find(m => m.module_number === 2);

    const getModuleQuestions = (modId: string) => {
      const mqIds = nvoModuleQuestions
        .filter(mq => mq.module_id === modId)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(mq => mq.question_id);
      return mqIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean) as QuizQuestion[];
    };

    const mod1Qs = mod1 ? getModuleQuestions(mod1.id) : [];
    const mod2Qs = mod2 ? getModuleQuestions(mod2.id) : [];

    if (mod1Qs.length === 0 && mod2Qs.length === 0) {
      toast.error("Няма добавени въпроси в това НВО.");
      return;
    }

    setModule1Questions(mod1Qs);
    setModule2Questions(mod2Qs);
    setModule1Time(mod1?.time_minutes || 60);
    setModule2Time(mod2?.time_minutes || 90);
    setExamModule(1);
    setModule1Submitted(false);
    setTestQuestions(mod1Qs.length > 0 ? mod1Qs : mod2Qs);
    setTestType("exam");
    setSelectedSubject(exam.subject);
    setCurrentIdx(0);
    setAnswers({});
    setSubmitted(false);
    setTimeLeft((mod1?.time_minutes || 60) * 60);
  };

  const goToModule2 = () => {
    if (module2Questions.length === 0) {
      toast.info("Няма въпроси за Модул 2. Тестът е завършен.");
      setSubmitted(true);
      return;
    }
    setModule1Submitted(true);
    setExamModule(2);
    setTestQuestions(module2Questions);
    setCurrentIdx(0);
    setTimeLeft(module2Time * 60);
  };

  const selectMC = (qId: string, idx: number) => {
    if (submitted || (testType === "exam" && selectedSubject === "bel" && examModule === 1 && module1Submitted)) return;
    setAnswers(prev => ({ ...prev, [qId]: { type: "mc", value: idx } }));
  };

  const setOpenAnswer = (qId: string, text: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qId]: { type: "open", value: text } }));
  };

  const submitTest = async () => {
    // For exam module 1 → go to module 2
    if (testType === "exam" && examModule === 1 && !module1Submitted && module2Questions.length > 0) {
      goToModule2();
      return;
    }

    setSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);

    // Determine all questions for grading
    const allTestQuestions = testType === "exam"
      ? [...module1Questions, ...module2Questions]
      : testQuestions;

    // Grade open-ended questions
    const openQs = allTestQuestions.filter(q => q.question_type === "open_ended" && answers[q.id]?.type === "open" && (answers[q.id] as any).value.trim());
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

    // For exam, show all questions from both modules
    if (testType === "exam") {
      setTestQuestions([...module1Questions, ...module2Questions]);
      setCurrentIdx(0);
    }

    // Save attempt
    const totalScore = allTestQuestions.reduce((sum, q) => {
      const a = answers[q.id];
      if (!a) return sum;
      if (a.type === "mc" && a.value === q.correct_answer) return sum + q.max_points;
      if (a.type === "open" && a.grade) return sum + a.grade.score;
      return sum;
    }, 0);
    const maxScore = allTestQuestions.reduce((sum, q) => sum + q.max_points, 0);

    await supabase.from("test_attempts").insert([{
      test_type: testType,
      topic_id: selectedTopic?.id || null,
      subject: selectedSubject || selectedTopic?.subject || null,
      answers: Object.entries(answers).map(([qId, a]) => ({ question_id: qId, ...a })) as any,
      score: totalScore,
      max_score: maxScore,
      completed_at: new Date().toISOString(),
    }]);
  };

  const allTestQuestionsForScore = testType === "exam" && submitted
    ? [...module1Questions, ...module2Questions]
    : testQuestions;

  const totalScore = allTestQuestionsForScore.reduce((sum, q) => {
    const a = answers[q.id];
    if (!a) return sum;
    if (a.type === "mc" && a.value === q.correct_answer) return sum + q.max_points;
    if (a.type === "open" && a.grade) return sum + a.grade.score;
    return sum;
  }, 0);
  const maxScore = allTestQuestionsForScore.reduce((sum, q) => sum + q.max_points, 0);

  const reset = () => {
    setTestType(null); setSelectedSubject(null); setSelectedTopic(null);
    setTestQuestions([]); setCurrentIdx(0); setAnswers({}); setSubmitted(false);
    setExamModule(1); setModule1Questions([]); setModule2Questions([]); setModule1Submitted(false);
    setTimeLeft(null);
    if (timerRef.current) clearInterval(timerRef.current);
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

        {/* Configured NVO exams */}
        <div className="mb-8">
          <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">📝 Пробни матури (НВО формат)</h3>
          {nvoExams.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-card rounded-2xl shadow-card p-6">Все още няма конфигурирани пробни НВО-та. Учителите могат да ги създадат от админ панела.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {nvoExams.map(exam => {
                const examMods = nvoModules.filter(m => m.exam_id === exam.id).sort((a, b) => a.module_number - b.module_number);
                const totalQuestions = examMods.reduce((sum, m) =>
                  sum + nvoModuleQuestions.filter(mq => mq.module_id === m.id).length, 0);
                const totalPoints = examMods.reduce((sum, m) => sum + m.max_points, 0);

                return (
                  <button key={exam.id} onClick={() => startExamTest(exam.id)} disabled={totalQuestions === 0}
                    className="bg-card rounded-2xl shadow-card p-6 text-left hover:shadow-elevated transition-all group disabled:opacity-50">
                    <div className="text-3xl mb-2">{exam.subject === "bel" ? "🇧🇬" : "📐"}</div>
                    <h4 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">{exam.title}</h4>
                    {examMods.map(m => {
                      const qCount = nvoModuleQuestions.filter(mq => mq.module_id === m.id).length;
                      return (
                        <p key={m.id} className="text-sm text-muted-foreground mt-1">
                          Модул {m.module_number}: {qCount} въпроса — {m.max_points} точки
                        </p>
                      );
                    })}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      {examMods.map(m => (
                        <span key={m.id} className="flex items-center gap-1"><Clock className="w-3 h-3" /> М{m.module_number}: {m.time_minutes} мин.</span>
                      ))}
                      <span>Общо: {totalPoints} т.</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
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
  const isExam = testType === "exam";

  return (
    <section className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={reset} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>
        <div className="text-sm font-medium text-foreground">
          {isExam ? `📝 Пробна матура ${selectedSubject === "bel" ? "БЕЛ" : "Математика"} — Модул ${submitted ? "1+2" : examModule}` :
           testType === "full" ? "📋 Пълен тест" :
           `🎯 ${selectedTopic?.name}`}
        </div>
        <div className="text-sm text-muted-foreground">{currentIdx + 1} / {testQuestions.length}</div>
      </div>

      {/* Timer + Module info */}
      <div className="flex items-center justify-between mb-4">
        {isExam && !submitted && (
          <div className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
            Модул {examModule} · {examModule === 1 ? `${module1Time} мин.` : `${module2Time} мин.`}
          </div>
        )}
        {timeLeft !== null && !submitted && (
          <div className={`text-sm font-mono font-bold px-3 py-1 rounded-full ${timeLeft < 300 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
            <Clock className="w-3 h-3 inline mr-1" />{formatTime(timeLeft)}
          </div>
        )}
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
          {isExam && (
            <div className="flex justify-center gap-6 mt-3 text-sm">
              <div>
                <span className="text-muted-foreground">Модул 1: </span>
                <span className="font-bold text-foreground">
                  {module1Questions.reduce((s, mq) => {
                    const a = answers[mq.id];
                    if (!a) return s;
                    if (a.type === "mc" && a.value === mq.correct_answer) return s + mq.max_points;
                    if (a.type === "open" && a.grade) return s + a.grade.score;
                    return s;
                  }, 0)} / {module1Questions.reduce((s, mq) => s + mq.max_points, 0)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Модул 2: </span>
                <span className="font-bold text-foreground">
                  {module2Questions.reduce((s, mq) => {
                    const a = answers[mq.id];
                    if (!a) return s;
                    if (a.type === "open" && a.grade) return s + a.grade.score;
                    return s;
                  }, 0)} / {module2Questions.reduce((s, mq) => s + mq.max_points, 0)}
                </span>
              </div>
            </div>
          )}
          {grading && <p className="text-sm text-accent mt-2 flex items-center justify-center gap-1"><Loader2 className="w-4 h-4 animate-spin" /> Оценяване на отворени въпроси...</p>}
        </motion.div>
      )}

      {/* Module 2 intro */}
      {isExam && examModule === 2 && !submitted && currentIdx === 0 && (
        <div className="bg-accent/10 rounded-2xl p-5 mb-4">
          <h4 className="font-display font-bold text-foreground mb-2 flex items-center gap-2"><BookOpen className="w-5 h-5 text-accent" /> Модул 2</h4>
          <p className="text-sm text-muted-foreground">
            Прочетете текста и изпълнете дидактическата задача. Напишете подробен преразказ, като следвате указанията. Имате 90 минути.
          </p>
        </div>
      )}

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div key={currentIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          className="bg-card rounded-2xl shadow-card p-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Въпрос {currentIdx + 1}</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{q.max_points} т.</span>
            {q.question_type === "open_ended" && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">Отворен въпрос</span>}
            {isBelExam && submitted && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {module1Questions.includes(q) ? "Модул 1" : "Модул 2"}
              </span>
            )}
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
                placeholder={q.max_points > 5 ? "Напишете преразказа / съчинението тук..." : "Напиши отговора си тук..."}
                rows={q.max_points > 5 ? 20 : 8}
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
            <Send className="w-4 h-4" />
            {isBelExam && examModule === 1 ? "Към Модул 2 →" : "Предай теста"}
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
