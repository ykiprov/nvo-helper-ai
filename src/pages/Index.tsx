import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, MessageCircle, BookOpen, Settings, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import ChatInterface from "@/components/ChatInterface";
import MaterialsSection from "@/components/MaterialsSection";
import AdminPanel from "@/components/AdminPanel";
import TeacherLogin from "@/components/TeacherLogin";

type Tab = "home" | "chat" | "materials" | "admin";

const Index = () => {
  const { user, isTeacher, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("home");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setActiveTab("home")} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg text-foreground">НВО Помощник</span>
          </button>
          <nav className="flex gap-1 bg-muted rounded-xl p-1">
            {[
              { id: "home" as Tab, label: "Начало", icon: GraduationCap },
              { id: "chat" as Tab, label: "Чат", icon: MessageCircle },
              { id: "materials" as Tab, label: "Материали", icon: BookOpen },
              ...(isTeacher
                ? [{ id: "admin" as Tab, label: "Админ", icon: Settings }]
                : [{ id: "admin" as Tab, label: "Вход", icon: LogIn }]),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        {activeTab === "home" && <HeroSection onStartChat={() => setActiveTab("chat")} onMaterials={() => setActiveTab("materials")} />}
        {activeTab === "chat" && <ChatInterface />}
        {activeTab === "materials" && <MaterialsSection />}
        {activeTab === "admin" && (
          !loading && (user && isTeacher ? <AdminPanel /> : <TeacherLogin />)
        )}
      </main>
    </div>
  );
};

function HeroSection({ onStartChat, onMaterials }: { onStartChat: () => void; onMaterials: () => void }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-20 h-20 rounded-2xl gradient-hero mx-auto flex items-center justify-center mb-6">
          <GraduationCap className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-extrabold mb-4">
          <span className="gradient-text">НВО Помощник</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
          Твоят AI асистент за подготовка за Национално Външно Оценяване в 7-ми клас 🚀
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onStartChat}
            className="gradient-primary text-primary-foreground font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            💬 Започни чат
          </button>
          <button
            onClick={onMaterials}
            className="bg-card border border-border text-foreground font-semibold px-8 py-3 rounded-xl hover:bg-muted transition-colors text-sm"
          >
            📚 Виж материали
          </button>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { emoji: "📝", title: "БЕЛ", desc: "Граматика, правопис и литература" },
            { emoji: "📐", title: "Математика", desc: "Алгебра, геометрия, задачи" },
            { emoji: "🤖", title: "AI помощ", desc: "24/7 достъпен асистент" },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="bg-card rounded-2xl p-5 shadow-card"
            >
              <div className="text-3xl mb-2">{item.emoji}</div>
              <h3 className="font-display font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default Index;
