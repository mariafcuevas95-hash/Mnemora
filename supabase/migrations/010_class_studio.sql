-- ─── AI Class Studio ──────────────────────────────────────────────────────────
-- Entidad central: clases grabadas, subidas o importadas desde YouTube.
-- Diseñado para escalar a cientos de miles de filas sin degradar performance.

-- ─── classes ─────────────────────────────────────────────────────────────────
create table if not exists classes (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references profiles(id) on delete cascade,
  subject_id            uuid references subjects(id) on delete set null,

  -- Metadata
  title                 text not null,
  source                text not null check (source in ('recording','audio','video','youtube')),
  youtube_url           text,
  file_url              text,           -- path en bucket 'classes' de Supabase Storage
  mime_type             text,           -- audio/mpeg | audio/wav | video/mp4 | etc.
  duration_seconds      integer,

  -- Outputs del pipeline IA
  transcript            text,
  summary               jsonb default '[]',       -- string[]
  smart_notes           text,
  open_questions        jsonb default '[]',        -- string[]
  detected_suggestions  jsonb default '[]',        -- {title,due_date,event_type,source}[]

  -- Estado asíncrono
  processing_status     text not null default 'pending'
    check (processing_status in ('pending','uploading','transcribing','analyzing','done','failed')),
  processing_stage      text,
  error_message         text,

  -- Contadores denormalizados (evitar JOINs en la lista)
  flashcards_count      integer not null default 0,
  quiz_count            integer not null default 0,
  concepts_count        integer not null default 0,
  tasks_count           integer not null default 0,
  events_count          integer not null default 0,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_classes_user_id    on classes(user_id);
create index if not exists idx_classes_subject_id on classes(subject_id);
create index if not exists idx_classes_status     on classes(processing_status);
create index if not exists idx_classes_created    on classes(user_id, created_at desc);
create index if not exists idx_classes_fts
  on classes using gin(to_tsvector('spanish', coalesce(transcript, '')));

alter table classes enable row level security;
create policy "Users own their classes"
  on classes for all
  using ((select auth.uid()) = user_id);

-- ─── class_quiz ───────────────────────────────────────────────────────────────
create table if not exists class_quiz (
  id              uuid primary key default uuid_generate_v4(),
  class_id        uuid not null references classes(id) on delete cascade,
  question        text not null,
  options         jsonb,                         -- string[] para MCQ
  correct_answer  text not null,
  explanation     text,
  question_type   text not null default 'multiple_choice'
    check (question_type in ('multiple_choice','true_false','definition')),
  created_at      timestamptz not null default now()
);

create index if not exists idx_class_quiz_class_id on class_quiz(class_id);

alter table class_quiz enable row level security;
create policy "Quiz accesible via dueño de clase"
  on class_quiz for all
  using (
    exists (
      select 1 from classes
      where id = class_id and user_id = (select auth.uid())
    )
  );

-- ─── Conectar flashcards a clases ─────────────────────────────────────────────
alter table flashcards
  add column if not exists class_id uuid references classes(id) on delete set null;

create index if not exists idx_flashcards_class_id on flashcards(class_id);

-- ─── Contador de clases en usage_monthly ──────────────────────────────────────
alter table usage_monthly
  add column if not exists classes_count integer not null default 0;

-- ─── Storage bucket 'classes' ─────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('classes', 'classes', false, 524288000)   -- 500 MB max por archivo
on conflict (id) do nothing;

-- RLS en storage: solo el dueño puede operar sus archivos
create policy "Users upload their own class files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'classes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users read their own class files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'classes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete their own class files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'classes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
