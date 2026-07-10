import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "placeholder");
}
const FROM = process.env.RESEND_FROM_EMAIL ?? "hello@mnemora.me";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://mnemora.me";

export interface DailyDigestData {
  name: string;
  email: string;
  dueCount: number;
  subjects: { name: string; dueCount: number }[];
  upcomingExams: { title: string; subjectName: string; daysUntil: number }[];
  totalMinutesEst: number;
}

export async function sendDailyDigest(data: DailyDigestData) {
  const { name, email, dueCount, subjects, upcomingExams, totalMinutesEst } = data;
  const firstName = name.split(" ")[0] || "estudiante";

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  })();

  const examAlert = upcomingExams.length > 0
    ? `<div style="background:#FEF3C7;border:1px solid #D97706;border-radius:10px;padding:12px 16px;margin:16px 0;">
        <p style="margin:0;color:#92400E;font-size:14px;font-weight:700;">⚠️ Próximos exámenes</p>
        ${upcomingExams.map(e => `<p style="margin:4px 0 0;color:#78350F;font-size:13px;">• ${e.title} (${e.subjectName}) — ${e.daysUntil === 0 ? "¡hoy!" : e.daysUntil === 1 ? "mañana" : `en ${e.daysUntil} días`}</p>`).join("")}
      </div>`
    : "";

  const subjectRows = subjects
    .filter(s => s.dueCount > 0)
    .map(s => `<li style="margin:4px 0;color:#4B5563;font-size:13px;">${s.name} — <strong>${s.dueCount} flashcard${s.dueCount !== 1 ? "s" : ""}</strong></li>`)
    .join("");

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: dueCount > 0
      ? `📚 Tienes ${dueCount} concepto${dueCount !== 1 ? "s" : ""} para repasar hoy — Mnemora`
      : "✅ Sin repasos pendientes hoy — Mnemora",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F4EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:32px auto;padding:0 16px;">

    <!-- Header -->
    <div style="background:#1B3F2F;border-radius:16px 16px 0 0;padding:24px 28px;">
      <p style="margin:0;color:#A7C4B0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Mnemora</p>
      <h1 style="margin:8px 0 0;color:#FFFFFF;font-size:22px;font-weight:800;">${greeting}, ${firstName} 👋</h1>
      <p style="margin:6px 0 0;color:#A7C4B0;font-size:14px;">Tu plan de estudio para hoy</p>
    </div>

    <!-- Body -->
    <div style="background:#FFFFFF;padding:24px 28px;border-radius:0 0 16px 16px;border:1px solid rgba(0,0,0,0.06);">

      ${examAlert}

      ${dueCount > 0 ? `
      <!-- Due concepts -->
      <div style="background:#F7F4EF;border-radius:12px;padding:16px 18px;margin-bottom:16px;">
        <p style="margin:0 0 8px;color:#1A1612;font-size:15px;font-weight:800;">
          📖 ${dueCount} concepto${dueCount !== 1 ? "s" : ""} pendiente${dueCount !== 1 ? "s" : ""} de repaso
        </p>
        <p style="margin:0 0 10px;color:#6B6259;font-size:13px;">El algoritmo SM-2 de Mnemora los marcó como listos para repasar hoy.</p>
        ${subjectRows ? `<ul style="margin:0;padding-left:16px;">${subjectRows}</ul>` : ""}
        <p style="margin:10px 0 0;color:#9E9389;font-size:12px;">⏱ ~${totalMinutesEst} min estimados</p>
      </div>
      ` : `
      <div style="background:#F0FDF4;border-radius:12px;padding:16px 18px;margin-bottom:16px;border:1px solid #BBF7D0;">
        <p style="margin:0;color:#065F46;font-size:15px;font-weight:700;">🎉 ¡Todo al día!</p>
        <p style="margin:6px 0 0;color:#4B7A5E;font-size:13px;">No tienes repasos pendientes. Aprovecha para avanzar en nuevo contenido.</p>
      </div>
      `}

      <!-- CTA -->
      <div style="text-align:center;margin:20px 0;">
        <a href="${APP_URL}/dashboard"
           style="display:inline-block;padding:13px 32px;background:#1B3F2F;color:#FFFFFF;border-radius:12px;text-decoration:none;font-size:15px;font-weight:700;">
          Ver mi plan del día →
        </a>
      </div>

      <!-- Footer -->
      <hr style="border:none;border-top:1px solid #EDE9E2;margin:20px 0;">
      <p style="margin:0;color:#9E9389;font-size:12px;text-align:center;">
        Recibes esto porque activaste las notificaciones en Mnemora.<br>
        <a href="${APP_URL}/settings" style="color:#1B3F2F;text-decoration:none;">Desactivar notificaciones</a>
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}

export async function sendWelcomeEmail(to: string, name: string) {
  const firstName = name.split(" ")[0] || "estudiante";
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Te damos la bienvenida a Mnemora 🎓",
    html: emailShell(`
      <h1 style="margin:0 0 12px;color:#1A1612;font-size:22px;font-weight:800;">Hola, ${firstName} 👋</h1>
      <p style="margin:0 0 16px;color:#6B6259;font-size:15px;line-height:1.6;">
        Tu cuenta está lista. Sube tu primer apunte o graba tu clase y Mnemora se encarga del resto.
      </p>
      ${btn(`${APP_URL}/onboarding`, "Empezar →")}
      <p style="text-align:center;margin:0;color:#9E9389;font-size:13px;">
        ¿Tienes preguntas? <a href="mailto:hello@mnemora.me" style="color:#1B3F2F;">hello@mnemora.me</a>
      </p>
    `),
  });
}

export async function sendPlanActivatedEmail(to: string, name: string, plan: "pro" | "premium") {
  const firstName = name.split(" ")[0] || "estudiante";
  const planLabel = plan === "premium" ? "Premium" : "Pro";
  const features = plan === "premium"
    ? "AI Class Studio, tutor ilimitado, modo examen intensivo, predicción de nota y más."
    : "Materias ilimitadas, flashcards, mapas mentales, tutor con memoria y más.";
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Tu Plan ${planLabel} está activo — Mnemora`,
    html: emailShell(`
      <h1 style="margin:0 0 12px;color:#1A1612;font-size:22px;font-weight:800;">¡Bienvenido al Plan ${planLabel}, ${firstName}! 🎉</h1>
      <p style="margin:0 0 16px;color:#6B6259;font-size:15px;line-height:1.6;">
        Ya tienes acceso completo a Mnemora ${planLabel}. ${features}
      </p>
      ${btn(`${APP_URL}/dashboard`, "Ir a mi dashboard →")}
      <p style="text-align:center;margin:0;color:#9E9389;font-size:13px;">Garantía 30 días · cancela cuando quieras</p>
    `),
  });
}

/** @deprecated — kept for backwards compat; use sendPlanActivatedEmail */
export async function sendProActivatedEmail(to: string, name: string) {
  return sendPlanActivatedEmail(to, name, "pro");
}

const emailShell = (content: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F4EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:520px;margin:32px auto;padding:0 16px;">
  <div style="background:#1B3F2F;border-radius:16px 16px 0 0;padding:20px 28px;">
    <p style="margin:0;color:#A7C4B0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Mnemora</p>
  </div>
  <div style="background:#FFFFFF;padding:28px;border-radius:0 0 16px 16px;border:1px solid rgba(0,0,0,0.06);">
    ${content}
    <hr style="border:none;border-top:1px solid #EDE9E2;margin:24px 0 16px;">
    <p style="margin:0;color:#9E9389;font-size:12px;text-align:center;">
      Garantía 30 días · cancela cuando quieras<br>
      <a href="mailto:hello@mnemora.me" style="color:#1B3F2F;text-decoration:none;">hello@mnemora.me</a>
    </p>
  </div>
</div>
</body></html>`;

const btn = (url: string, label: string) =>
  `<div style="text-align:center;margin:24px 0;"><a href="${url}" style="display:inline-block;padding:13px 32px;background:#1B3F2F;color:#FFFFFF;border-radius:12px;text-decoration:none;font-size:15px;font-weight:700;">${label}</a></div>`;


export async function sendPlanCancelledEmail(to: string, name: string) {
  const firstName = name.split(" ")[0] || "estudiante";
  await getResend().emails.send({
    from: FROM, to,
    subject: "Tu suscripción fue cancelada — Mnemora",
    html: emailShell(`
      <h1 style="margin:0 0 12px;color:#1A1612;font-size:22px;font-weight:800;">Cancelación confirmada</h1>
      <p style="margin:0 0 16px;color:#6B6259;font-size:15px;line-height:1.6;">Hola ${firstName}, tu suscripción fue cancelada. Sigues con el plan gratuito — tus materias y datos están guardados.</p>
      <div style="background:#F7F4EF;border-radius:12px;padding:16px 18px;margin-bottom:16px;">
        <p style="margin:0 0 8px;color:#1A1612;font-size:14px;font-weight:700;">Puedes volver cuando quieras</p>
        <p style="margin:0;color:#6B6259;font-size:13px;line-height:1.6;">Tu historial, flashcards y progreso te esperan. Reactivar el plan toma menos de 1 minuto.</p>
      </div>
      ${btn(`${APP_URL}/upgrade`, "Ver planes")}
      <p style="text-align:center;margin:0;color:#9E9389;font-size:13px;">¿Tuviste algún problema? <a href="mailto:hello@mnemora.me" style="color:#1B3F2F;">hello@mnemora.me</a></p>
    `),
  });
}

export async function sendPaymentFailedEmail(to: string, name: string) {
  const firstName = name.split(" ")[0] || "estudiante";
  await getResend().emails.send({
    from: FROM, to,
    subject: "Problema con tu pago — Mnemora",
    html: emailShell(`
      <h1 style="margin:0 0 12px;color:#1A1612;font-size:22px;font-weight:800;">No pudimos procesar tu pago</h1>
      <p style="margin:0 0 16px;color:#6B6259;font-size:15px;line-height:1.6;">Hola ${firstName}, hubo un problema al renovar tu suscripción Pro. Mientras se resuelve, tu acceso Pro sigue activo.</p>
      <div style="background:#FEE2E2;border:1px solid #FCA5A5;border-radius:12px;padding:16px 18px;margin-bottom:16px;">
        <p style="margin:0;color:#991B1B;font-size:14px;font-weight:700;">¿Qué hacer?</p>
        <ol style="margin:8px 0 0;padding-left:18px;color:#7F1D1D;font-size:13px;line-height:1.8;">
          <li>Verifica que tu tarjeta no esté vencida</li>
          <li>Confirma que tienes fondos disponibles</li>
          <li>Intenta con otro método de pago en Hotmart</li>
        </ol>
      </div>
      ${btn("https://app.hotmart.com/", "Actualizar método de pago en Hotmart →")}
      <p style="text-align:center;margin:0;color:#9E9389;font-size:13px;">¿Necesitas ayuda? <a href="mailto:hello@mnemora.me" style="color:#1B3F2F;">hello@mnemora.me</a></p>
    `),
  });
}

export async function sendReferralRewardEmail(to: string, name: string, milestone: number, daysGranted: number) {
  const firstName = name.split(" ")[0] || "estudiante";
  const daysLabel = daysGranted >= 365 ? "12 meses" : daysGranted >= 180 ? "6 meses" : daysGranted >= 60 ? "2 meses" : daysGranted >= 30 ? "1 mes" : "1 semana";
  await getResend().emails.send({
    from: FROM, to,
    subject: `🎁 ¡Ganaste ${daysLabel} gratis en Mnemora!`,
    html: emailShell(`
      <h1 style="margin:0 0 12px;color:#1A1612;font-size:22px;font-weight:800;">¡Recompensa desbloqueada, ${firstName}! 🎉</h1>
      <p style="margin:0 0 16px;color:#6B6259;font-size:15px;line-height:1.6;">
        Llegaste a <strong>${milestone} referido${milestone !== 1 ? "s" : ""}</strong> que activaron un plan. Como recompensa, sumamos <strong>${daysLabel} gratis</strong> a tu cuenta.
      </p>
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:16px 18px;margin-bottom:16px;text-align:center;">
        <p style="margin:0;color:#065F46;font-size:28px;font-weight:900;">+${daysLabel}</p>
        <p style="margin:4px 0 0;color:#4B7A5E;font-size:13px;">agregados automáticamente a tu plan</p>
      </div>
      ${btn(`${APP_URL}/referidos`, "Ver mi programa de referidos →")}
    `),
  });
}
