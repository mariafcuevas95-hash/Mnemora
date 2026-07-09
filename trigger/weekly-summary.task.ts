import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import WebSocket from "ws";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
    }
  );
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const t = new Date(dateStr); t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / 86_400_000);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es", { day: "numeric", month: "long" });
}

export const weeklySummaryTask = schedules.task({
  id: "weekly-summary",
  // Cada lunes a las 8 AM UTC (5 AM Colombia / 9 AM España)
  cron: "0 8 * * 1",
  maxDuration: 120,
  run: async () => {
    const admin = getAdmin();
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "hola@mnemora.me";

    // Obtener todos los usuarios activos con email (paginado)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allUsers: any[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: batch, error: batchErr } = await admin.auth.admin.listUsers({ page, perPage });
      if (batchErr) { logger.error("Error listing users", { error: batchErr.message }); return; }
      allUsers.push(...batch.users);
      if (batch.users.length < perPage) break;
      page++;
    }
    const users = { users: allUsers };

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const todayStr = now.toISOString().slice(0, 10);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let sent = 0;
    let skipped = 0;

    for (const user of users.users) {
      if (!user.email) { skipped++; continue; }

      try {
        // Progreso: racha y XP esta semana
        const [progressRes, xpRes, knowledgeRes, examsRes, subjectsRes] = await Promise.all([
          admin.from("user_progress").select("streak_days, xp_total").eq("user_id", user.id).maybeSingle(),
          admin.from("xp_events").select("xp_earned").eq("user_id", user.id).gte("created_at", weekAgo),
          admin.from("student_knowledge")
            .select("confidence, mastery_level, next_review, subject_concepts!inner(name, subject_id)")
            .eq("user_id", user.id),
          admin.from("calendar_events")
            .select("id, title, event_date, subject_id, subjects!inner(name)")
            .eq("user_id", user.id)
            .eq("event_type", "exam")
            .gte("event_date", todayStr)
            .lte("event_date", in30Days)
            .order("event_date"),
          admin.from("subjects").select("id, name").eq("user_id", user.id).order("name"),
        ]);

        const progress = progressRes.data;
        const xpThisWeek = (xpRes.data ?? []).reduce((s, e) => s + (e.xp_earned ?? 0), 0);
        const knowledge = knowledgeRes.data ?? [];
        const exams = examsRes.data ?? [];
        const subjects = subjectsRes.data ?? [];

        // Omitir usuarios sin materias (no hay nada que resumir)
        if (subjects.length === 0) { skipped++; continue; }

        // Flashcards pendientes de repaso
        const pending = knowledge.filter(k =>
          k.next_review !== null && k.next_review <= todayStr && k.mastery_level !== "mastered"
        );

        // Conceptos con baja confianza
        const weak = knowledge
          .filter(k => k.confidence < 0.4 && k.mastery_level !== "mastered")
          .slice(0, 5);

        const streak = progress?.streak_days ?? 0;
        const upcomingExamsMapped = exams.slice(0, 3).map(e => ({
          title: e.title as string,
          subjectName: ((e.subjects as unknown as { name: string } | null)?.name) ?? "",
          date: e.event_date as string,
          daysUntil: daysUntil(e.event_date as string),
        }));

        // Generar HTML del email
        const html = buildEmailHtml({
          userName: user.user_metadata?.full_name ?? (user.email ?? "").split("@")[0],
          streak,
          xpThisWeek,
          pendingCount: pending.length,
          weakConcepts: weak.map(k => ((k.subject_concepts as unknown as { name: string } | null)?.name) ?? ""),
          upcomingExams: upcomingExamsMapped,
          subjectCount: subjects.length,
        });

        await resend.emails.send({
          from: `Mnemora <${fromEmail}>`,
          to: user.email,
          subject: buildSubject({ streak, xpThisWeek, pendingCount: pending.length, upcomingExams: upcomingExamsMapped }),
          html,
        });

        sent++;
        logger.info("Email sent", { userId: user.id });
      } catch (err) {
        logger.warn("Failed to send email for user", { userId: user.id, error: String(err) });
        skipped++;
      }
    }

    logger.info("Weekly summary complete", { sent, skipped });
    return { sent, skipped };
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSubject({ streak, xpThisWeek, pendingCount, upcomingExams }: {
  streak: number;
  xpThisWeek: number;
  pendingCount: number;
  upcomingExams: { daysUntil: number }[];
}): string {
  const urgent = upcomingExams.some(e => e.daysUntil <= 7);
  if (urgent) return "⚠️ Tienes un examen próximo — tu resumen semanal";
  if (pendingCount >= 10) return `📚 Tienes ${pendingCount} flashcards por repasar`;
  if (streak >= 7) return `🔥 ${streak} días de racha — sigue así`;
  if (xpThisWeek > 0) return `✨ Ganaste ${xpThisWeek} XP esta semana — tu resumen`;
  return "📖 Tu resumen semanal de Mnemora";
}

interface EmailData {
  userName: string;
  streak: number;
  xpThisWeek: number;
  pendingCount: number;
  weakConcepts: string[];
  upcomingExams: { title: string; subjectName: string; date: string; daysUntil: number }[];
  subjectCount: number;
}

function buildEmailHtml(data: EmailData): string {
  const { userName, streak, xpThisWeek, pendingCount, weakConcepts, upcomingExams } = data;

  const examsHtml = upcomingExams.length > 0
    ? `
    <div style="margin:24px 0;">
      <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9E9389;margin-bottom:10px;">Próximos exámenes</p>
      ${upcomingExams.map(e => `
        <div style="padding:12px 16px;background:${e.daysUntil <= 7 ? "#FFFBEB" : "#F7F4EF"};border-left:3px solid ${e.daysUntil <= 7 ? "#D97706" : "#C4BAAE"};border-radius:8px;margin-bottom:8px;">
          <p style="font-size:14px;font-weight:700;color:#1A1612;margin:0 0 2px;">${e.title}</p>
          <p style="font-size:12px;color:#6B6259;margin:0;">${e.subjectName} · ${formatDate(e.date)} <span style="font-weight:700;color:${e.daysUntil <= 7 ? "#D97706" : "#6B6259"};">(${e.daysUntil === 0 ? "¡Hoy!" : e.daysUntil === 1 ? "mañana" : `en ${e.daysUntil} días`})</span></p>
        </div>
      `).join("")}
    </div>`
    : "";

  const weakHtml = weakConcepts.length > 0
    ? `
    <div style="margin:24px 0;">
      <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9E9389;margin-bottom:10px;">Conceptos que necesitan repaso</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${weakConcepts.map(c => `<span style="font-size:12px;padding:4px 10px;background:#FEF3C7;color:#92400E;border-radius:6px;font-weight:600;">${c}</span>`).join("")}
      </div>
    </div>`
    : "";

  const pendingHtml = pendingCount > 0
    ? `<a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://mnemora.me"}/flashcards" style="display:inline-block;padding:12px 24px;background:#1B3F2F;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;margin-top:8px;">Repasar ${pendingCount} flashcard${pendingCount !== 1 ? "s" : ""} pendiente${pendingCount !== 1 ? "s" : ""}</a>`
    : `<a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://mnemora.me"}/dashboard" style="display:inline-block;padding:12px 24px;background:#1B3F2F;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;margin-top:8px;">Ir al dashboard</a>`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F4EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:22px;font-weight:900;color:#1B3F2F;letter-spacing:-0.02em;">mnemora</span>
    </div>

    <!-- Card principal -->
    <div style="background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">

      <p style="font-size:20px;font-weight:800;color:#1A1612;margin:0 0 6px;">Hola, ${userName} 👋</p>
      <p style="font-size:14px;color:#6B6259;margin:0 0 28px;">Tu resumen de la semana</p>

      <!-- Estadísticas -->
      <div style="display:flex;gap:12px;margin-bottom:28px;">
        <div style="flex:1;text-align:center;padding:16px 12px;background:#F7F4EF;border-radius:12px;">
          <p style="font-size:28px;font-weight:900;color:#1B3F2F;margin:0;line-height:1;">${streak}</p>
          <p style="font-size:11px;color:#9E9389;margin:4px 0 0;font-weight:600;">días de racha</p>
        </div>
        <div style="flex:1;text-align:center;padding:16px 12px;background:#F7F4EF;border-radius:12px;">
          <p style="font-size:28px;font-weight:900;color:#1B3F2F;margin:0;line-height:1;">+${xpThisWeek}</p>
          <p style="font-size:11px;color:#9E9389;margin:4px 0 0;font-weight:600;">XP esta semana</p>
        </div>
        <div style="flex:1;text-align:center;padding:16px 12px;background:${pendingCount > 0 ? "#FEF3C7" : "#F7F4EF"};border-radius:12px;">
          <p style="font-size:28px;font-weight:900;color:${pendingCount > 0 ? "#D97706" : "#1B3F2F"};margin:0;line-height:1;">${pendingCount}</p>
          <p style="font-size:11px;color:#9E9389;margin:4px 0 0;font-weight:600;">pendientes de repaso</p>
        </div>
      </div>

      ${examsHtml}
      ${weakHtml}

      <!-- CTA -->
      <div style="text-align:center;margin-top:28px;">
        ${pendingHtml}
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0 8px;">
      <p style="font-size:11px;color:#C4BAAE;margin:0;">
        Mnemora · <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://mnemora.me"}/settings" style="color:#C4BAAE;">Gestionar notificaciones</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
