import { BookOpen, Calculator, PenTool, Brain } from "lucide-react";
import { motion } from "framer-motion";

const subjects = [
  {
    title: "Български език",
    icon: PenTool,
    topics: ["Граматика", "Правопис", "Пунктуация", "Езиков анализ"],
    color: "from-primary to-primary/80",
  },
  {
    title: "Литература",
    icon: BookOpen,
    topics: ["Христо Ботев", "Иван Вазов", "Алеко Константинов", "Елин Пелин"],
    color: "from-secondary to-secondary/80",
  },
  {
    title: "Математика",
    icon: Calculator,
    topics: ["Алгебра", "Геометрия", "Уравнения", "Неравенства"],
    color: "from-accent to-accent/80",
  },
  {
    title: "Подготовка",
    icon: Brain,
    topics: ["Пробни тестове", "Времеви стратегии", "Чести грешки", "Съвети"],
    color: "from-primary to-secondary",
  },
];

export default function MaterialsSection() {
  return (
    <section className="max-w-5xl mx-auto px-4 py-12">
      <h2 className="text-2xl font-display font-bold text-foreground text-center mb-2">
        Учебни материали
      </h2>
      <p className="text-muted-foreground text-center mb-8">
        Избери предмет и започни подготовката
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {subjects.map((subject, i) => (
          <motion.div
            key={subject.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-shadow cursor-pointer group"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${subject.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <subject.icon className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="font-display font-semibold text-lg text-foreground mb-3">
              {subject.title}
            </h3>
            <div className="flex flex-wrap gap-2">
              {subject.topics.map((topic) => (
                <span
                  key={topic}
                  className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full"
                >
                  {topic}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
