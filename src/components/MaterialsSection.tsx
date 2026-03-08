import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type SubjectType = "bel" | "math";

interface Topic {
  id: string;
  name: string;
  subject: SubjectType;
}

interface Material {
  id: string;
  title: string;
  content: string;
  subject: SubjectType;
  topic_id: string | null;
}

export default function MaterialsSection() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filterSubject, setFilterSubject] = useState<"all" | SubjectType>("all");
  const [filterTopic, setFilterTopic] = useState<string | null>(null);
  const [expandedMat, setExpandedMat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [topRes, matRes] = await Promise.all([
          supabase.from("topics").select("*").order("subject").order("sort_order"),
          supabase.from("materials").select("*").order("created_at", { ascending: false }),
        ]);
        if (topRes.error) console.error("Topics fetch error:", topRes.error);
        if (matRes.error) console.error("Materials fetch error:", matRes.error);
        setTopics((topRes.data || []) as Topic[]);
        setMaterials((matRes.data || []) as Material[]);
      } catch (err) {
        console.error("Failed to load materials data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredTopics = filterSubject === "all" ? topics : topics.filter(t => t.subject === filterSubject);
  const filteredMaterials = materials.filter(m => {
    if (filterSubject !== "all" && m.subject !== filterSubject) return false;
    if (filterTopic && m.topic_id !== filterTopic) return false;
    return true;
  });

  const topicName = (id: string | null) => topics.find(t => t.id === id)?.name;

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <section className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-display font-bold text-foreground text-center mb-2">📚 Учебни материали</h2>
      <p className="text-muted-foreground text-center mb-6">Четене и преговор по теми — подготви се преди да решаваш тестове</p>

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

      {filteredMaterials.length === 0 && (
        <p className="text-center text-muted-foreground py-12">Все още няма добавени материали за тази тема.</p>
      )}

      {/* Materials */}
      {filteredMaterials.length > 0 && (
        <div className="space-y-3">
          {filteredMaterials.map(m => (
            <motion.div key={m.id} layout className="bg-card rounded-2xl shadow-card overflow-hidden">
              <button onClick={() => setExpandedMat(expandedMat === m.id ? null : m.id)} className="w-full flex items-center justify-between p-5 text-left">
                <div className="flex items-center gap-3">
                  {m.subject === "bel" ? <BookOpen className="w-5 h-5 text-primary" /> : <Calculator className="w-5 h-5 text-accent" />}
                  <div>
                    <span className="font-display font-semibold text-foreground">{m.title}</span>
                    {m.topic_id && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{topicName(m.topic_id)}</span>}
                  </div>
                </div>
                {expandedMat === m.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              <AnimatePresence>
                {expandedMat === m.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-5 pb-5">
                    <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">{m.content}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
