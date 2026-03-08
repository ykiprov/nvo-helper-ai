import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, MessageCircle, BookOpen, Settings, LogIn, Target, Dumbbell, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ChatInterface from "@/components/ChatInterface";
import MaterialsSection from "@/components/MaterialsSection";
import PracticeSection from "@/components/PracticeSection";
import AdminPanel from "@/components/AdminPanel";
import TeacherLogin from "@/components/TeacherLogin";
import TestMode from "@/components/TestMode";

type Tab = "home" | "chat" | "materials" | "practice" | "tests" | "admin";

const Index = () => {
  const { user, isTeacher, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("home");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setActiveTab("home")} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg text-foreground">НВО Помощник</span>
          </button>
          <nav className="flex gap-0.5 bg-muted rounded-xl p-1 overflow-x-auto">
            {[
              { id: "home" as Tab, label: "Начало", icon: GraduationCap },
              { id: "chat" as Tab, label: "Чат", icon: MessageCircle },
              { id: "materials" as Tab, label: "Материали", icon: BookOpen },
              { id: "practice" as Tab, label: "Упражнения", icon: Dumbbell },
              { id: "tests" as Tab, label: "Тестове", icon: Target },
              ...(isTeacher
                ? [{ id: "admin" as Tab, label: "Админ", icon: Settings }]
                : [{ id: "admin" as Tab, label: "Вход", icon: LogIn }]),
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}>
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {activeTab === "home" && (
          <HeroSection
            onStartChat={() => setActiveTab("chat")}
            onMaterials={() => setActiveTab("materials")}
            onPractice={() => setActiveTab("practice")}
            onTests={() => setActiveTab("tests")}
          />
        )}
        {activeTab === "chat" && <ChatInterface />}
        {activeTab === "materials" && <MaterialsSection />}
        {activeTab === "practice" && <PracticeSection />}
        {activeTab === "tests" && <TestMode />}
        {activeTab === "admin" && (!loading && (user && isTeacher ? <AdminPanel /> : <TeacherLogin />))}
      </main>
    </div>
  );
};

function HeroSection({ onStartChat, onMaterials, onPractice, onTests }: {
  onStartChat: () => void; onMaterials: () => void; onPractice: () => void; onTests: () => void;
}) {
  const [showTeacherGuide, setShowTeacherGuide] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-2xl gradient-hero mx-auto flex items-center justify-center mb-6">
            <GraduationCap className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold mb-4">
            <span className="gradient-text">НВО Помощник</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-3 max-w-lg mx-auto">
            Твоят AI асистент за подготовка за Национално Външно Оценяване в 7-ми клас по БЕЛ и Математика 🚀
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Учи с материали, упражнявай се с въпроси, реши пробни матури и получи AI обратна връзка — всичко безплатно и на едно място.
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
          <button onClick={onStartChat} className="gradient-primary text-primary-foreground font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm">💬 Попитай AI асистента</button>
          <button onClick={onTests} className="bg-card border border-border text-foreground font-semibold px-8 py-3 rounded-xl hover:bg-muted transition-colors text-sm">📝 Реши пробна матура</button>
          <button onClick={onPractice} className="bg-card border border-border text-foreground font-semibold px-8 py-3 rounded-xl hover:bg-muted transition-colors text-sm">💪 Упражнявай се</button>
        </div>

        {/* Section descriptions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-6 shadow-card">
            <div className="text-2xl mb-2">💬</div>
            <h3 className="font-display font-bold text-foreground mb-2">AI Чат асистент</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Задай въпрос по всяка тема от учебния материал и получи подробен отговор веднага. AI асистентът ти обяснява, дава примери и помага да разбереш трудни концепции.
            </p>
            <p className="text-xs text-primary font-medium">👉 Кога да го ползваш: Когато не разбираш нещо или искаш допълнително обяснение.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl p-6 shadow-card">
            <div className="text-2xl mb-2">📚</div>
            <h3 className="font-display font-bold text-foreground mb-2">Учебни материали</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Прегледай структурирани материали по теми — от граматика и правопис до литературен анализ, от алгебра до геометрия. Подготвени от учители, организирани удобно.
            </p>
            <p className="text-xs text-primary font-medium">👉 Кога да го ползваш: Когато искаш да преговориш или научиш нова тема.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-card rounded-2xl p-6 shadow-card">
            <div className="text-2xl mb-2">💪</div>
            <h3 className="font-display font-bold text-foreground mb-2">Упражнения</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Реши отделни тестови въпроси и виж веднага дали отговорът ти е правилен. Филтрирай по предмет и тема. Отлично за бърза проверка на знанията.
            </p>
            <p className="text-xs text-primary font-medium">👉 Кога да го ползваш: За ежедневна тренировка и проверка на наученото.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-card rounded-2xl p-6 shadow-card">
            <div className="text-2xl mb-2">📝</div>
            <h3 className="font-display font-bold text-foreground mb-2">Тестове и пробни матури</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Реши тематичен тест, пълен тест или пробна НВО матура в реалистичен формат. По БЕЛ — два модула: тест (65 т.) и преразказ (35 т.). AI оценява отворените въпроси.
            </p>
            <p className="text-xs text-primary font-medium">👉 Кога да го ползваш: Когато искаш да симулираш реалния изпит и да видиш резултата си.</p>
          </motion.div>
        </div>

        {/* Student tutorial */}
        <div className="bg-card rounded-2xl shadow-card p-6 mb-8">
          <h3 className="font-display font-bold text-foreground mb-4 text-lg">🎓 Как да започнеш подготовката?</h3>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <span className="bg-primary/10 text-primary font-bold rounded-full w-7 h-7 flex items-center justify-center text-sm shrink-0">1</span>
              <p className="text-sm text-muted-foreground"><strong className="text-foreground">Прочети материалите</strong> — отиди в секция „Материали" и избери тема. Прочети съдържанието внимателно.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="bg-primary/10 text-primary font-bold rounded-full w-7 h-7 flex items-center justify-center text-sm shrink-0">2</span>
              <p className="text-sm text-muted-foreground"><strong className="text-foreground">Упражнявай се</strong> — отиди в „Упражнения" и реши въпроси по темата. Виждаш веднага дали отговорът ти е правилен.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="bg-primary/10 text-primary font-bold rounded-full w-7 h-7 flex items-center justify-center text-sm shrink-0">3</span>
              <p className="text-sm text-muted-foreground"><strong className="text-foreground">Питай AI асистента</strong> — ако не разбираш нещо, отвори чата и задай въпрос. Ще получиш подробно обяснение.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="bg-primary/10 text-primary font-bold rounded-full w-7 h-7 flex items-center justify-center text-sm shrink-0">4</span>
              <p className="text-sm text-muted-foreground"><strong className="text-foreground">Реши пробна матура</strong> — когато се чувстваш готов, отиди в „Тестове" и избери „Пробна матура". Ще получиш реалистичен тест с оценка.</p>
            </div>
          </div>
        </div>

        {/* Teacher guide */}
        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          <button onClick={() => setShowTeacherGuide(!showTeacherGuide)}
            className="w-full flex items-center justify-between p-6 text-left">
            <h3 className="font-display font-bold text-foreground text-lg">🧑‍🏫 За учители — как да администрирате сайта</h3>
            {showTeacherGuide ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>
          <AnimatePresence>
            {showTeacherGuide && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="px-6 pb-6">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>За да управлявате съдържанието, натиснете бутон <strong className="text-foreground">„Вход"</strong> в навигацията и влезте с учителски акаунт.</p>
                  <p><strong className="text-foreground">В администраторския панел можете да:</strong></p>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li><strong className="text-foreground">Управлявате теми</strong> — създавайте, редактирайте и изтривайте теми по БЕЛ и Математика. Темите служат за групиране на материали и въпроси.</li>
                    <li><strong className="text-foreground">Добавяте материали</strong> — пишете учебно съдържание по всяка тема. Може и да прикачите файлове.</li>
                    <li><strong className="text-foreground">Създавате тестови въпроси</strong> — два типа: затворени (с 4 варианта) и отворени (с AI оценяване). За отворените въпроси добавете критерии за оценка — AI ще ги ползва при проверката.</li>
                  </ul>
                  <p className="bg-muted rounded-xl px-4 py-3 mt-3">
                    💡 <strong className="text-foreground">Съвет:</strong> Започнете с добавяне на теми, после добавете материали и въпроси към тях. Така учениците ще виждат структурирано съдържание.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

export default Index;
