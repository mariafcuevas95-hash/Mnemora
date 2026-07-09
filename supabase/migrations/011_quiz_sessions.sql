-- Historial de sesiones de quiz
create table if not exists quiz_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  subject_id  uuid not null references subjects(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  correct     integer not null,
  total       integer not null,
  pct         integer not null,
  created_at  timestamptz not null default now()
);

create index if not exists quiz_sessions_user_id_idx on quiz_sessions(user_id);
create index if not exists quiz_sessions_subject_id_idx on quiz_sessions(subject_id);

alter table quiz_sessions enable row level security;

create policy "Users manage own quiz sessions"
  on quiz_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
