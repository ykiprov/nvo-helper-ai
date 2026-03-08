import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Calculator, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";

type SubjectType = "bel" | "math";

interface Topic {
  id: string;
  name: string;
  subject: SubjectType;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  subject: SubjectType;
  question_type: string;
  max_points: number;
  topic_id: string | null;
  explanation: string | null;
}

export default function PracticeSection() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [filterSubject, setFilterSubject] = useState<"all" | SubjectType>("all");
  const [filterTopic, setFilterTopic] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [topRes, qRes] = await Promise.all([
        supabase.from("topics").select("*").order("subject").order("sort_order"),
        supabase.from("quiz_questions").select("*").order("created_at", { ascending: false }),
      ]);
      setTopics((topRes.data || []) as Topic[]);
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
    load();
  }, []);

  const filteredTopics = filterSubject === "all" ? topics : topics.filter(t => t.subject === filterSubject);
  const filteredQuestions = questions.filter(q => {
    if (filterSubject !== "all" && q.subject !== filterSubject) return false;
    if (filterTopic && q.topic_id !== filterTopic) return false;
    if (q.question_type !== "multiple_choice") return false;
    return true;
  });

  const selectAnswer = (qId: string, idx: number) => {
    setSelectedAnswers(prev => ({ ...prev, [qId]: prev[qId] === idx ? null : idx }));
  };

  const topicName = (id: string | null) => topics.find(t => t.id === id)?.name;

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <section className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-display font-bold text-foreground text-center mb-2">💪 Упражнения</h2>
      <p className="text-muted-foreground text-center mb-6">Упражнявай се с отделни въпроси — виждаш веднага дали отговорът ти е верен</p>

      {/* Subject filter */}
      <div className="flex justify-center gap-2 mb-4">
        {([["all", "Всички"], ["bel", "🇧🇬 БЕЛ"], ["math", "📐 Математика"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => { setFilterSubject(key); setFilterTopic(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filterSubject === key ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Topic filter */}
      {filteredTopics.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 mb-8">
          <button onClick={() => setFilterTopic(null)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${!filterTopic ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            Всички теми
          </button>
          {filteredTopics.map(t => (
            <button key={t.id} onClick={() => setFilterTopic(t.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filterTopic === t.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {t.name}
            </button>
          ))}
        </div>
      )}

      {filteredQuestions.length === 0 && (
        <p className="text-center text-muted-foreground py-12">Няма налични въпроси за упражнение с тези филтри.</p>
      )}

      {/* Quiz questions */}
      <div className="space-y-4">
        {filteredQuestions.map((q, qi) => {
          const selected = selectedAnswers[q.id];
          const answered = selected !== undefined && selected !== null;
          const isCorrect = selected === q.correct_answer;
          return (
            <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: qi * 0.03 }}
              className="bg-card rounded-2xl shadow-card p-5">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <p className="font-medium text-foreground">{qi + 1}. {q.question}</p>
              </div>
              {q.topic_id && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full mb-2 inline-block">{topicName(q.topic_id)}</span>}
              <div className="space-y-2">
                {q.options.map((opt, i) => (
                  <button key={i} onClick={() => selectAnswer(q.id, i)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 ${
                      answered && i === q.correct_answer ? "bg-secondary/20 text-secondary font-medium"
                      : answered && i === selected && !isCorrect ? "bg-destructive/10 text-destructive"
                      : selected === i ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}>
                    {answered && i === q.correct_answer && <CheckCircle className="w-4 h-4" />}
                    {answered && i === selected && !isCorrect && <XCircle className="w-4 h-4" />}
                    <span>{String.fromCharCode(65 + i)}. {opt}</span>
                  </button>
                ))}
              </div>
              {answered && q.explanation && (
                <p className="mt-3 text-sm text-muted-foreground bg-muted rounded-xl px-4 py-2">💡 {q.explanation}</p>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
