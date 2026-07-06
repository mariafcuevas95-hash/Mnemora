import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getIntelligenceContext } from "@/lib/intelligence";
import { z } from "zod";

const anthropic = new Anthropic();

const BodySchema = z.object({
  examTitle:   z.string().min(1),
  examDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  subjectId:   z.string().min(1),
  subjectName: z.string(),
});

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export type ExamPlanSession = {
  daysFromNow: number;
  date: string;
  title: string;
  focusAreas: string[];
  durationMin: number;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return new Response("Bad Request", { status: 400 });
  const { examTitle, examDate, subjectId, subjectName } = parsed.data;

  const days = daysUntil(examDate);
  if (days <= 0) return NextResponse.json({ sessions: [] });

  const ctx = await getIntelligenceContext(user.id, subjectId);

  const weakStr = ctx.weakConcepts.length > 0
    ? `Áreas débiles del estudiante: ${ctx.weakConcepts.slice(0, 6).join(", ")}.`
    : "";
  const masteredStr = ctx.masteredConcepts.length > 0
    ? `Ya dominados: ${ctx.masteredConcepts.slice(0, 4).join(", ")}.`
    : "";

  const targetSessions = Math.min(Math.max(Math.round(days * 0.6), 3), 12);

  const prompt = `Generá un plan de estudio para el examen "${examTitle}" de ${subjectName}, que es en ${days} día${days !== 1 ? "s" : ""} (fecha: ${examDate}).
${weakStr}
${masteredStr}

Generá exactamente ${targetSessions} sesiones de estudio. Devolvé ÚNICAMENTE un JSON válido con este formato exacto, sin texto antes ni después:
{"sessions":[{"daysFromNow":1,"title":"Repasar [tema]","focusAreas":["tema 1","tema 2"],"durationMin":45}]}

Reglas:
- daysFromNow: entero ≥ 1, distribuido gradualmente hasta ${days - 1} días (no incluir el día del examen)
- title: acción concreta de máximo 5 palabras
- focusAreas: 1-3 temas específicos, priorizá áreas débiles al principio
- durationMin: entre 30 y 90
- Las últimas 2 sesiones deben ser repaso general / simulacro`;

  try {
    const resp = await anthropic.messages.create({
      model: process.env.AI_MODEL_PROCESSOR ?? "claude-haiku-4-5-20251001",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    });

    const text = resp.content[0].type === "text" ? resp.content[0].text.trim() : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const data = JSON.parse(jsonMatch[0]) as { sessions: { daysFromNow: number; title: string; focusAreas: string[]; durationMin: number }[] };

    const sessions: ExamPlanSession[] = data.sessions.map(s => {
      const d = new Date();
      d.setDate(d.getDate() + s.daysFromNow);
      return { ...s, date: d.toISOString().slice(0, 10) };
    });

    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ error: "Plan generation failed" }, { status: 500 });
  }
}
