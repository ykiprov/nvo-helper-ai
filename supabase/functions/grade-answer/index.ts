import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, studentAnswer, gradingCriteria, maxPoints } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Ти си учител-оценител за НВО (Национално Външно Оценяване) за 7-ми клас в България.
Оценявай отговорите на учениците строго, но справедливо, като се базираш на зададените критерии.
Отговаряй САМО на български език.`;

    const userPrompt = `Оцени следния отговор на ученик:

ВЪПРОС: ${question}

ОТГОВОР НА УЧЕНИКА: ${studentAnswer}

КРИТЕРИИ ЗА ОЦЕНЯВАНЕ (максимум ${maxPoints} точки):
${gradingCriteria}

Използвай следния инструмент, за да върнеш оценката.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_grade",
            description: "Submit the grading result for a student answer",
            parameters: {
              type: "object",
              properties: {
                score: { type: "number", description: "Score awarded (0 to maxPoints)" },
                feedback: { type: "string", description: "Detailed feedback in Bulgarian explaining the score" },
                strengths: { type: "string", description: "What the student did well (in Bulgarian)" },
                improvements: { type: "string", description: "What could be improved (in Bulgarian)" },
              },
              required: ["score", "feedback", "strengths", "improvements"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_grade" } },
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
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No tool call response from AI");
  } catch (e) {
    console.error("grade error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Грешка при оценяване" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
