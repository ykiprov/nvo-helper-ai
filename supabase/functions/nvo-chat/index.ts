import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch materials and questions from DB to use as context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const [matRes, qRes] = await Promise.all([
      sb.from("materials").select("title, content, subject").limit(50),
      sb.from("quiz_questions").select("question, options, correct_answer, explanation, subject").limit(100),
    ]);

    let materialsContext = "";
    if (matRes.data && matRes.data.length > 0) {
      materialsContext += "\n\n=== УЧЕБНИ МАТЕРИАЛИ ===\n";
      for (const m of matRes.data) {
        const subj = m.subject === "bel" ? "БЕЛ" : "Математика";
        materialsContext += `\n--- ${subj}: ${m.title} ---\n${m.content}\n`;
      }
    }
    if (qRes.data && qRes.data.length > 0) {
      materialsContext += "\n\n=== ТЕСТОВИ ВЪПРОСИ ===\n";
      for (const q of qRes.data) {
        const subj = q.subject === "bel" ? "БЕЛ" : "Математика";
        const opts = Array.isArray(q.options) ? q.options : [];
        materialsContext += `\n[${subj}] Въпрос: ${q.question}\n`;
        opts.forEach((o: string, i: number) => {
          materialsContext += `  ${String.fromCharCode(65 + i)}. ${o}${i === q.correct_answer ? " ✓" : ""}\n`;
        });
        if (q.explanation) materialsContext += `  Обяснение: ${q.explanation}\n`;
      }
    }

    const systemPrompt = `Ти си помощник за подготовка за НВО (Национално Външно Оценяване) за 7-ми клас в България.
Помагаш на учениците по всички предмети, включени в НВО: Български език и литература, Математика.
Обяснявай ясно и достъпно, като се съобразяваш с нивото на 7-мокласник.
Давай примери и стъпка по стъпка обяснения когато е нужно.
Бъди насърчаващ и позитивен. Отговаряй на български език.
Когато ученикът зададе задача, помогни му да разбере как се решава, а не просто да дадеш отговора.
Можеш да помагаш с: граматика, правопис, литературни анализи, математически задачи, геометрия, алгебра и други теми от учебната програма за 7-ми клас.

ВАЖНО: Използвай следните учебни материали и тестови въпроси като контекст при отговорите си. Ако ученик зададе въпрос свързан с тези материали, позовавай се на тях:
${materialsContext || "\n(Все още няма добавени материали.)"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Твърде много заявки. Моля, опитай отново след малко." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Нужно е допълване на кредити." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Грешка при връзката с AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Неизвестна грешка" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
