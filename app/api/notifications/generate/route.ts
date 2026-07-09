import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// POST /api/notifications/generate
// Genera notificaciones para el usuario según su estado actual.
// Idempotente: usa dedup por tipo + día para evitar duplicados.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = getAdmin();
  const today = new Date().toISOString().slice(0, 10);

  // Qué notificaciones ya se crearon hoy
  const { data: existing } = await admin
    .from("notifications")
    .select("type")
    .eq("user_id", user.id)
    .gte("created_at", `${today}T00:00:00Z`);

  const todayTypes = new Set((existing ?? []).map(n => n.type));

  type NewNotif = {
    user_id: string;
    type: string;
    title: string;
    body: string;
    cta_href: string | null;
    cta_label: string | null;
  };

  const toInsert: NewNotif[] = [];

  // ── 1. Flashcards vencidas ──
  if (!todayTypes.has("review_due")) {
    const { data: dueCards } = await admin
      .from("student_knowledge")
      .select("concept_id, subject_concepts!inner(subject_id, subjects!inner(name))")
      .eq("user_id", user.id)
      .lte("next_review", new Date().toISOString())
      .limit(100);

    const dueCount = dueCards?.length ?? 0;
    if (dueCount >= 3) {
      // Group by subject
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bySubject = new Map<string, string>();
      for (const row of (dueCards ?? []) as any[]) {
        const sname = row.subject_concepts?.subjects?.name;
        if (sname) bySubject.set(sname, sname);
      }
      const subjectList = [...bySubject.keys()].slice(0, 2).join(" y ");
      toInsert.push({
        user_id: user.id,
        type: "review_due",
        title: `${dueCount} flashcard${dueCount !== 1 ? "s" : ""} pendiente${dueCount !== 1 ? "s" : ""}`,
        body: `Tienes tarjetas de ${subjectList} que necesitan repaso hoy para mantener tu retención.`,
        cta_href: "/flashcards",
        cta_label: "Repasar ahora",
      });
    }
  }

  // ── 2. Exámenes próximos ──
  const { data: exams } = await admin
    .from("calendar_events")
    .select("id, title, event_date, subject_id, subjects!inner(name)")
    .eq("user_id", user.id)
    .eq("event_type", "exam")
    .gte("event_date", today)
    .order("event_date")
    .limit(5);

  for (const exam of (exams ?? []) as any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const days = Math.round((new Date(exam.event_date).getTime() - Date.now()) / 86_400_000);
    const notifType = `exam_reminder_${exam.id}`;
    if (todayTypes.has(notifType)) continue;

    if (days <= 7 && days >= 0) {
      const urgency = days <= 1 ? "¡Urgente! " : days <= 3 ? "" : "";
      toInsert.push({
        user_id: user.id,
        type: notifType,
        title: `${urgency}${exam.title}`,
        body: days === 0
          ? "El examen es hoy. Repasa los conceptos clave antes de entrar."
          : days === 1
          ? "El examen es mañana. Usa el Modo Examen para el repaso final."
          : `Faltan ${days} días. Activa el plan de ataque para llegar preparado.`,
        cta_href: `/examen/${exam.subject_id}`,
        cta_label: "Modo Examen",
      });
    }
  }

  // ── 3. Racha de estudio ──
  if (!todayTypes.has("streak")) {
    const { data: xpRows } = await admin
      .from("xp_events")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (xpRows && xpRows.length > 0) {
      // Contar días consecutivos de actividad
      const days = new Set(xpRows.map(r => r.created_at.slice(0, 10)));
      let streak = 0;
      const d = new Date();
      while (days.has(d.toISOString().slice(0, 10))) {
        streak++;
        d.setDate(d.getDate() - 1);
      }

      if (streak >= 3 && streak % 3 === 0) {
        toInsert.push({
          user_id: user.id,
          type: "streak",
          title: `🔥 ${streak} días seguidos`,
          body: `Llevas ${streak} días de estudio consecutivo. ¡Sigue así para consolidar tu aprendizaje!`,
          cta_href: "/progreso",
          cta_label: "Ver mi progreso",
        });
      }
    }
  }

  // ── 4. Alerta de conceptos con baja retención ──
  if (!todayTypes.has("low_retention")) {
    const { data: weakConcepts } = await admin
      .from("student_knowledge")
      .select("confidence, subject_concepts!inner(name, subjects!inner(name))")
      .eq("user_id", user.id)
      .lt("confidence", 0.25)
      .eq("mastery_level", "learning")
      .limit(10);

    const weakCount = weakConcepts?.length ?? 0;
    if (weakCount >= 5) {
      toInsert.push({
        user_id: user.id,
        type: "low_retention",
        title: `${weakCount} conceptos con baja retención`,
        body: "Hay conceptos que estás olvidando rápidamente. El tutor puede ayudarte a reforzarlos.",
        cta_href: "/tutor",
        cta_label: "Hablar con el tutor",
      });
    }
  }

  if (toInsert.length > 0) {
    await admin.from("notifications").insert(toInsert);
  }

  return NextResponse.json({ generated: toInsert.length });
}
