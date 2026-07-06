-- ═══════════════════════════════════════════════════
--  Mnemora — Capa de Inteligencia
--  Ejecutar después de 001_initial.sql
-- ═══════════════════════════════════════════════════

-- ─── Extensions ───────────────────────────────────
create extension if not exists "vector";

-- ─── Mastery levels ───────────────────────────────
create type mastery_level as enum ('unknown', 'learning', 'practiced', 'mastered');

-- ─── subject_concepts ─────────────────────────────
-- Mapa de conocimiento de cada materia (extraído del syllabus).
-- Cada concepto tiene un padre opcional para representar jerarquía.
create table subject_concepts (
  id             uuid primary key default uuid_generate_v4(),
  subject_id     uuid not null references subjects(id) on delete cascade,
  name           text not null,
  parent_id      uuid references subject_concepts(id) on delete set null,
  learning_order int,   -- orden sugerido de estudio
  created_at     timestamptz not null default now(),
  unique(subject_id, name)
);

alter table subject_concepts enable row level security;
-- Los conceptos son visibles para el dueño de la materia
create policy "Users see concepts of their subjects"
  on subject_concepts for all
  using (
    exists (
      select 1 from subjects s
      where s.id = subject_id
        and s.user_id = (select auth.uid())
    )
  );
create index idx_concepts_subject_id on subject_concepts(subject_id);

-- ─── student_knowledge ────────────────────────────
-- Modelo cognitivo del estudiante: qué sabe y qué no.
-- Se actualiza después de cada sesión de tutor.
create table student_knowledge (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  concept_id      uuid not null references subject_concepts(id) on delete cascade,
  confidence      float not null default 0 check (confidence >= 0 and confidence <= 1),
  last_practiced  timestamptz,
  -- Próxima revisión según algoritmo de spaced repetition (SM-2)
  next_review     timestamptz,
  practice_count  int not null default 0,
  -- Patrones de error recurrentes: ["error de signo", "olvida constante C"]
  error_patterns  jsonb not null default '[]',
  mastery_level   mastery_level not null default 'unknown',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(user_id, concept_id)
);

alter table student_knowledge enable row level security;
create policy "Users own their knowledge"
  on student_knowledge for all
  using ((select auth.uid()) = user_id);
create index idx_knowledge_user_id on student_knowledge(user_id);
create index idx_knowledge_next_review on student_knowledge(next_review) where next_review is not null;

-- ─── learning_sessions ────────────────────────────
-- Registro de cada sesión de tutor para el learning engine.
-- Un job asíncrono (Trigger.dev) la analiza y actualiza student_knowledge.
create table learning_sessions (
  id               uuid primary key default uuid_generate_v4(),
  conversation_id  uuid references conversations(id) on delete set null,
  user_id          uuid not null references profiles(id) on delete cascade,
  subject_id       uuid not null references subjects(id) on delete cascade,
  -- Conceptos cubiertos en la sesión (array de concept_ids con resultado)
  -- Ej: [{"concept_id": "...", "understood": true, "errors": ["error de signo"]}]
  concepts_covered jsonb not null default '[]',
  -- Resumen pedagógico generado por el learning engine
  insights         text,
  analyzed_at      timestamptz,   -- null = pendiente de análisis
  created_at       timestamptz not null default now()
);

alter table learning_sessions enable row level security;
create policy "Users own their learning sessions"
  on learning_sessions for all
  using ((select auth.uid()) = user_id);
create index idx_sessions_user_id on learning_sessions(user_id);
create index idx_sessions_pending on learning_sessions(analyzed_at) where analyzed_at is null;

-- ─── cognitive_profile ────────────────────────────
-- Meta-perfil de aprendizaje por usuario+materia.
-- Se construye con suficientes sesiones (>5).
create table cognitive_profile (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references profiles(id) on delete cascade,
  subject_id           uuid not null references subjects(id) on delete cascade,
  -- 0=aprende lento / 1=aprende rápido
  learning_speed       float not null default 0.5 check (learning_speed >= 0 and learning_speed <= 1),
  -- 0=olvida rápido / 1=retiene bien
  retention_strength   float not null default 0.5 check (retention_strength >= 0 and retention_strength <= 1),
  -- Estilo de aprendizaje predominante
  preferred_style      text not null default 'balanced' check (preferred_style in ('visual','conceptual','practical','balanced')),
  -- Patrones de error recurrentes a nivel de materia
  error_patterns       jsonb not null default '[]',
  -- Distribución de horarios de estudio: {"22": 120, "23": 45} (hora: minutos)
  study_hours          jsonb not null default '{}',
  -- Nota proyectada 0-10 basada en cobertura y confianza del temario
  performance_estimate float check (performance_estimate >= 0 and performance_estimate <= 10),
  updated_at           timestamptz not null default now(),
  unique(user_id, subject_id)
);

alter table cognitive_profile enable row level security;
create policy "Users own their cognitive profile"
  on cognitive_profile for all
  using ((select auth.uid()) = user_id);
create index idx_profile_user_id on cognitive_profile(user_id);

-- ─── Helper: actualizar updated_at automáticamente ─
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger student_knowledge_updated_at
  before update on student_knowledge
  for each row execute function set_updated_at();

create trigger cognitive_profile_updated_at
  before update on cognitive_profile
  for each row execute function set_updated_at();

-- ─── Helper: SM-2 spaced repetition ───────────────
-- Recalcula next_review e_factor al evaluar una práctica.
-- quality: 0-5 (0=olvido total, 5=respuesta perfecta)
create or replace function sm2_update(
  p_user_id    uuid,
  p_concept_id uuid,
  p_quality    int  -- 0..5
) returns void
language plpgsql security definer as $$
declare
  v_rec     student_knowledge%rowtype;
  v_ef      float := 2.5;
  v_interval int := 1;
begin
  select * into v_rec
  from student_knowledge
  where user_id = p_user_id and concept_id = p_concept_id;

  if not found then
    insert into student_knowledge (user_id, concept_id, practice_count, last_practiced, next_review, confidence)
    values (p_user_id, p_concept_id, 1, now(), now() + interval '1 day',
            greatest(0, least(1, p_quality::float / 5)));
    return;
  end if;

  -- SM-2 e-factor update (min 1.3)
  v_ef := greatest(1.3, coalesce(
    (v_rec.confidence * 5 - 1) * 0.1 + 2.5,
    2.5
  ) + 0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));

  -- Interval in days
  v_interval := case
    when v_rec.practice_count = 0 then 1
    when v_rec.practice_count = 1 then 6
    else round(coalesce(
      extract(epoch from (v_rec.next_review - v_rec.last_practiced)) / 86400,
      6
    ) * v_ef)::int
  end;

  if p_quality < 3 then v_interval := 1; end if;

  update student_knowledge set
    confidence      = greatest(0, least(1, p_quality::float / 5)),
    last_practiced  = now(),
    next_review     = now() + (v_interval || ' days')::interval,
    practice_count  = practice_count + 1,
    mastery_level   = case
      when p_quality >= 4 and practice_count >= 5 then 'mastered'
      when p_quality >= 3 and practice_count >= 2 then 'practiced'
      when p_quality >= 1 then 'learning'
      else 'unknown'
    end::mastery_level
  where user_id = p_user_id and concept_id = p_concept_id;
end;
$$;
