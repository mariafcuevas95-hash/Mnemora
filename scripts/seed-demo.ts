/**
 * Seed script: populates demo data for the test account.
 * Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-demo.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Use existing test account as the demo account
const DEMO_EMAIL = "testmnemora99@gmail.com";
const DEMO_PASSWORD = "demo1234";

async function run() {
  // ── 1. Find demo user ──────────────────────────────────────
  const { data: usersData } = await admin.auth.admin.listUsers();
  const user = usersData.users.find((u) => u.email === DEMO_EMAIL);
  if (!user) { console.error("Demo user not found:", DEMO_EMAIL); process.exit(1); }
  const userId = user.id;

  // Reset password so anyone can log in
  await admin.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD });
  console.log("Demo user:", userId, DEMO_EMAIL);

  // ── 2. Update profile ──────────────────────────────────────
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await admin.from("profiles").update({
    name: "María Demo",
    university: "Universidad de los Andes",
    career: "Psicología",
    plan: "pro",
    trial_ends_at: trialEndsAt,
  }).eq("id", userId);

  // ── 3. Wipe and re-create subjects ────────────────────────
  await admin.from("subjects").delete().eq("user_id", userId);

  const { data: subjects } = await admin.from("subjects").insert([
    { user_id: userId, name: "Neurociencia Cognitiva", professor: "Dr. Ramírez", semester_label: "2026-I" },
    { user_id: userId, name: "Estadística para Ciencias", professor: "Prof. Torres", semester_label: "2026-I" },
    { user_id: userId, name: "Psicología Social", professor: "Dra. López", semester_label: "2026-I" },
  ]).select();

  if (!subjects) { console.error("Subjects insert failed"); process.exit(1); }
  const [neuro, stats, social] = subjects;

  // ── 4. Calendar events ─────────────────────────────────────
  const d = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

  await admin.from("calendar_events").insert([
    { user_id: userId, subject_id: neuro.id, title: "Parcial 2 — Neurociencia", event_date: d(8), event_type: "exam", source: "manual" },
    { user_id: userId, subject_id: stats.id, title: "Entrega laboratorio ANOVA", event_date: d(3), event_type: "assignment", source: "manual" },
    { user_id: userId, subject_id: social.id, title: "Final Psicología Social", event_date: d(21), event_type: "exam", source: "manual" },
    { user_id: userId, subject_id: neuro.id, title: "Proyecto integrador", event_date: d(15), event_type: "project", source: "manual" },
  ]);

  // ── 5. Concepts + flashcards ──────────────────────────────
  async function seedSubject(
    subjectId: string,
    concepts: { name: string; order: number }[],
    cards: { front: string; back: string }[]
  ) {
    const { data: created } = await admin.from("subject_concepts").insert(
      concepts.map((c) => ({ subject_id: subjectId, name: c.name, learning_order: c.order }))
    ).select();
    if (!created) return;

    if (cards.length) {
      await admin.from("flashcards").insert(
        cards.map((c) => ({ user_id: userId, subject_id: subjectId, front: c.front, back: c.back }))
      );
    }
    return created;
  }

  const neuroConcepts = await seedSubject(neuro.id, [
    { name: "Potencial de acción", order: 1 },
    { name: "Sinapsis química", order: 2 },
    { name: "Neuroplasticidad", order: 3 },
    { name: "LTP (Long-Term Potentiation)", order: 4 },
    { name: "Corteza prefrontal", order: 5 },
    { name: "Hipocampo", order: 6 },
  ], [
    { front: "¿Qué fases tiene un potencial de acción?", back: "Despolarización → repolarización → hiperpolarización → período refractario." },
    { front: "¿Cuál es el umbral típico de disparo de una neurona?", back: "Aproximadamente −55 mV (el potencial de reposo es −70 mV)." },
    { front: "¿Qué ocurre en la sinapsis química?", back: "El PA llega al terminal presináptico → exocitosis de vesículas → neurotransmisores cruzan la hendidura → se unen a receptores postsinápticos." },
    { front: "Diferencia entre sinapsis excitatoria e inhibitoria", back: "Excitatoria (ej. glutamato): despolariza. Inhibitoria (ej. GABA): hiperpolariza la membrana." },
    { front: "¿Qué es la neuroplasticidad dependiente de actividad?", back: "Cambios estructurales y funcionales en conexiones sinápticas inducidos por la experiencia o el aprendizaje." },
    { front: "¿Qué regla resume el LTP?", back: '"Neuronas que disparan juntas, se conectan juntas" (Hebb, 1949).' },
    { front: "¿Qué receptores son clave en el LTP?", back: "Receptores NMDA actúan como detectores de coincidencia; su activación permite entrada de Ca²⁺." },
    { front: "Tres funciones principales de la corteza prefrontal", back: "Planificación, inhibición de respuestas impulsivas, memoria de trabajo." },
    { front: "¿Qué tipo de memoria procesa principalmente el hipocampo?", back: "Memoria declarativa episódica y semántica." },
    { front: "¿Qué le pasó a H.M. tras la extirpación del hipocampo?", back: "Amnesia anterógrada severa: no podía formar nuevos recuerdos episódicos, pero mantenía memoria procedural." },
  ]);

  await seedSubject(stats.id, [
    { name: "ANOVA de una vía", order: 1 },
    { name: "Valor p", order: 2 },
    { name: "Distribución normal", order: 3 },
    { name: "Error Tipo I y II", order: 4 },
  ], [
    { front: "¿Cuándo usas ANOVA en lugar de t de Student?", back: "Cuando comparas 3 o más grupos; t de Student solo sirve para 2 grupos." },
    { front: "Supuestos del ANOVA de una vía", back: "Normalidad de residuos, homogeneidad de varianzas (Levene), independencia de observaciones." },
    { front: "Si p < 0.05, ¿qué concluyes?", back: "Rechazas H₀. El efecto es estadísticamente significativo al nivel α = 0.05." },
    { front: "¿Un valor p pequeño implica efecto grande?", back: "No. Siempre reporta tamaño de efecto (d de Cohen, η²)." },
    { front: "¿Qué porcentaje de datos cae dentro de ±1σ?", back: "~68%. Dentro de ±2σ: ~95%. Dentro de ±3σ: ~99.7% (regla empírica)." },
    { front: "Define Error Tipo I (α)", back: "Rechazar H₀ cuando es verdadera (falso positivo)." },
    { front: "Define Error Tipo II (β)", back: "No rechazar H₀ cuando es falsa (falso negativo). Poder estadístico = 1−β." },
  ]);

  await seedSubject(social.id, [
    { name: "Disonancia cognitiva", order: 1 },
    { name: "Conformidad social", order: 2 },
    { name: "Sesgo de confirmación", order: 3 },
    { name: "Deseabilidad social", order: 4 },
  ], [
    { front: "¿Cómo se reduce la disonancia cognitiva?", back: "Cambiando una creencia, añadiendo consonancias o restando importancia al conflicto." },
    { front: "Experimento clásico de Festinger sobre disonancia", back: "Pagados $1 o $20 para mentir: los de $1 reportaron más gusto por la tarea (mayor disonancia → mayor cambio de actitud)." },
    { front: "¿Qué mostró el experimento de Asch?", back: "~75% de personas conformaron al menos una vez con la respuesta incorrecta del grupo." },
    { front: "¿Por qué el sesgo de confirmación es peligroso en investigación?", back: "Lleva a buscar y recordar solo datos que apoyan la hipótesis." },
    { front: "¿Qué mide la escala de deseabilidad social (Marlowe-Crowne)?", back: "La tendencia del participante a responder de manera socialmente aceptable." },
  ]);

  // ── 6. Student knowledge ──────────────────────────────────
  if (neuroConcepts && neuroConcepts.length >= 6) {
    const ago = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
    const fwd = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
    const levels: Array<"mastered" | "practiced" | "learning" | "unknown"> =
      ["mastered", "practiced", "practiced", "learning", "learning", "unknown"];

    const knowledgeRows = neuroConcepts.map((c, i) => ({
      user_id: userId,
      concept_id: c.id,
      mastery_level: levels[i],
      confidence: [0.92, 0.74, 0.68, 0.42, 0.35, 0.1][i],
      practice_count: [12, 8, 6, 3, 2, 0][i],
      last_practiced: i < 5 ? ago([2, 1, 3, 5, 7][i]) : null,
      next_review: fwd([5, 1, 2, 0, 0, 0][i]),
    }));
    await admin.from("student_knowledge").upsert(knowledgeRows, { onConflict: "user_id,concept_id" });
  }

  // ── 7. Usage ───────────────────────────────────────────────
  const ym = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  await admin.from("usage_monthly").upsert({
    user_id: userId,
    year_month: ym,
    tutor_messages: 14,
    flashcards_generated: 22,
    documents_processed: 3,
  }, { onConflict: "user_id,year_month" });

  // ── 8. Gamification ────────────────────────────────────────
  await admin.from("user_progress").upsert({
    user_id: userId,
    xp_total: 480,
    streak_days: 5,
    last_activity_date: new Date().toISOString().slice(0, 10),
  }, { onConflict: "user_id" });

  console.log("\n✅ Demo profile ready!");
  console.log("   Email:    " + DEMO_EMAIL);
  console.log("   Password: " + DEMO_PASSWORD);
}

run().catch((err) => { console.error(err); process.exit(1); });
