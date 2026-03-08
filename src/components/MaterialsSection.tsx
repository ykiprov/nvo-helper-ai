import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Calculator, ChevronDown, ChevronUp, CheckCircle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type SubjectType = "bel" | "math";

interface Material {
  id: string;
  title: string;
  content: string;
  subject: SubjectType;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  subject: SubjectType;
  explanation: string | null;
}

export default function MaterialsSection() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [filter, setFilter] = useState<"all" | SubjectType>("all");
  const [expandedMat, setExpandedMat] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
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
    load();
  }, []);

  const filteredMaterials = filter === "all" ? materials : materials.filter((m) => m.subject === filter);
  const filteredQuestions = filter === "all" ? questions : questions.filter((q) => q.subject === filter);

  const selectAnswer = (qId: string, idx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [qId]: prev[qId] === idx ? null : idx }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <section className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-display font-bold text-foreground text-center mb-2">Учебни материали</h2>
      <p className="text-muted-foreground text-center mb-6">Материали и тестове за подготовка</p>

      {/* Filter */}
      <div className="flex justify-center gap-2 mb-8">
        {([["all", "Всички"], ["bel", "🇧🇬 БЕЛ"], ["math", "📐 Математика"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === key ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filteredMaterials.length === 0 && filteredQuestions.length === 0 && (
        <p className="text-center text-muted-foreground py-12">Все още няма добавени материали.</p>
      )}

      {/* Materials */}
      {filteredMaterials.length > 0 && (
        <div className="mb-8">
          <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" /> Материали за четене
          </h3>
          <div className="space-y-3">
            {filteredMaterials.map((m) => (
              <motion.div key={m.id} layout className="bg-card rounded-2xl shadow-card overflow-hidden">
                <button
                  onClick={() => setExpandedMat(expandedMat === m.id ? null : m.id)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <div className="flex items-center gap-3">
                    {m.subject === "bel" ? (
                      <BookOpen className="w-5 h-5 text-primary" />
                    ) : (
                      <Calculator className="w-5 h-5 text-accent" />
                    )}
                    <span className="font-display font-semibold text-foreground">{m.title}</span>
                  </div>
                  {expandedMat === m.id ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                <AnimatePresence>
                  {expandedMat === m.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-5 pb-5"
                    >
                      <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                        {m.content}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz */}
      {filteredQuestions.length > 0 && (
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
            ❓ Тестови въпроси
          </h3>
          <div className="space-y-4">
            {filteredQuestions.map((q, qi) => {
              const selected = selectedAnswers[q.id];
              const answered = selected !== undefined && selected !== null;
              const isCorrect = selected === q.correct_answer;

              return (
                <div key={q.id} className="bg-card rounded-2xl shadow-card p-5">
                  <p className="font-medium text-foreground mb-3">
                    {qi + 1}. {q.question}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => selectAnswer(q.id, i)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 ${
                          answered && i === q.correct_answer
                            ? "bg-secondary/20 text-secondary font-medium"
                            : answered && i === selected && !isCorrect
                            ? "bg-destructive/10 text-destructive"
                            : selected === i
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {answered && i === q.correct_answer && <CheckCircle className="w-4 h-4" />}
                        {answered && i === selected && !isCorrect && <XCircle className="w-4 h-4" />}
                        <span>{String.fromCharCode(65 + i)}. {opt}</span>
                      </button>
                    ))}
                  </div>
                  {answered && q.explanation && (
                    <p className="mt-3 text-sm text-muted-foreground bg-muted rounded-xl px-4 py-2">
                      💡 {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
