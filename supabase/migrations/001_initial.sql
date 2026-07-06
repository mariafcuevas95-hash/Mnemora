-- ═══════════════════════════════════════════════════
--  Mnemora — Schema inicial (PostgreSQL / Supabase)
-- ═══════════════════════════════════════════════════

-- ─── Extensions ───────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Enum types ───────────────────────────────────
create type plan_type as enum ('free', 'pro');
create type event_type as enum ('exam', 'assignment', 'project');
create type event_source as enum ('manual', 'extracted');
create type processing_status as enum ('pending', 'processing', 'done', 'failed');
create type message_role as enum ('user', 'assistant');

-- ─── Profiles ─────────────────────────────────────
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  name          text,
  university    text,
  career        text,
  plan          plan_type not null default 'free',
  trial_ends_at timestamptz default (now() + interval '7 days'),
  created_at    timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "Users own their profile"
  on profiles for all
  using ((select auth.uid()) = id);

-- ─── Subjects ─────────────────────────────────────
create table subjects (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references profiles(id) on delete cascade,
  name           text not null,
  professor      text,
  semester_label text,
  created_at     timestamptz not null default now()
);

alter table subjects enable row level security;
create policy "Users own their subjects"
  on subjects for all
  using ((select auth.uid()) = user_id);
create index idx_subjects_user_id on subjects(user_id);

-- ─── Calendar events ──────────────────────────────
create table calendar_events (
  id          uuid primary key default uuid_generate_v4(),
  subject_id  uuid not null references subjects(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  title       text not null,
  event_date  date not null,
  event_type  event_type not null default 'exam',
  source      event_source not null default 'manual',
  created_at  timestamptz not null default now()
);

alter table calendar_events enable row level security;
create policy "Users own their calendar events"
  on calendar_events for all
  using ((select auth.uid()) = user_id);
create index idx_calendar_user_id on calendar_events(user_id);
create index idx_calendar_event_date on calendar_events(event_date);

-- ─── Documents ────────────────────────────────────
create table documents (
  id                uuid primary key default uuid_generate_v4(),
  subject_id        uuid not null references subjects(id) on delete cascade,
  user_id           uuid not null references profiles(id) on delete cascade,
  name              text not null,
  file_url          text not null,
  processing_status processing_status not null default 'pending',
  summary           text,
  created_at        timestamptz not null default now()
);

alter table documents enable row level security;
create policy "Users own their documents"
  on documents for all
  using ((select auth.uid()) = user_id);
create index idx_documents_user_id on documents(user_id);
create index idx_documents_subject_id on documents(subject_id);

-- ─── Flashcards ───────────────────────────────────
create table flashcards (
  id          uuid primary key default uuid_generate_v4(),
  document_id uuid references documents(id) on delete set null,
  subject_id  uuid not null references subjects(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  front       text not null,
  back        text not null,
  created_at  timestamptz not null default now()
);

alter table flashcards enable row level security;
create policy "Users own their flashcards"
  on flashcards for all
  using ((select auth.uid()) = user_id);
create index idx_flashcards_user_id on flashcards(user_id);
create index idx_flashcards_subject_id on flashcards(subject_id);

-- ─── Conversations ────────────────────────────────
create table conversations (
  id         uuid primary key default uuid_generate_v4(),
  subject_id uuid not null references subjects(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  title      text,
  created_at timestamptz not null default now()
);

alter table conversations enable row level security;
create policy "Users own their conversations"
  on conversations for all
  using ((select auth.uid()) = user_id);
create index idx_conversations_user_id on conversations(user_id);

-- ─── Messages ─────────────────────────────────────
create table messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role            message_role not null,
  content         text not null,
  created_at      timestamptz not null default now()
);

alter table messages enable row level security;
-- RLS via JOIN a conversations (usuario dueño de la conversación)
create policy "Users own messages via conversation"
  on messages for all
  using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and c.user_id = (select auth.uid())
    )
  );
create index idx_messages_conversation_id on messages(conversation_id);

-- ─── Usage monthly ────────────────────────────────
create table usage_monthly (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references profiles(id) on delete cascade,
  year_month            char(7) not null,  -- YYYY-MM
  flashcards_count      int not null default 0,
  summaries_count       int not null default 0,
  tutor_messages_count  int not null default 0,
  syllabuses_count      int not null default 0,
  unique(user_id, year_month)
);

alter table usage_monthly enable row level security;
create policy "Users own their usage"
  on usage_monthly for all
  using ((select auth.uid()) = user_id);
create index idx_usage_user_month on usage_monthly(user_id, year_month);

-- ─── Hotmart transactions (idempotencia) ──────────
create table hotmart_transactions (
  id               uuid primary key default uuid_generate_v4(),
  transaction_code text not null,
  event            text not null,
  email            text not null,
  raw_payload      jsonb,
  created_at       timestamptz not null default now(),
  unique(transaction_code, event)
);

-- Solo service_role puede leer/escribir — no hay RLS pública
alter table hotmart_transactions enable row level security;

-- ─── Helper function: increment_usage ─────────────
create or replace function increment_usage(
  p_user_id  uuid,
  p_year_month char(7),
  p_field    text
) returns void
language plpgsql security definer as $$
begin
  insert into usage_monthly (user_id, year_month)
  values (p_user_id, p_year_month)
  on conflict (user_id, year_month) do nothing;

  execute format(
    'update usage_monthly set %I = %I + 1 where user_id = $1 and year_month = $2',
    p_field, p_field
  ) using p_user_id, p_year_month;
end;
$$;

-- ─── Trigger: crear profile al registrarse ────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── Storage bucket para documentos ───────────────
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict do nothing;

create policy "Users upload their own docs"
  on storage.objects for insert
  with check (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users read their own docs"
  on storage.objects for select
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete their own docs"
  on storage.objects for delete
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
