-- ─── user_progress ────────────────────────────────────────────────────────────
create table if not exists user_progress (
  user_id            uuid primary key references profiles(id) on delete cascade,
  xp_total           int not null default 0,
  streak_days        int not null default 0,
  last_activity_date date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table user_progress enable row level security;
create policy "Users own their progress"
  on user_progress for all
  using ((select auth.uid()) = user_id);

-- ─── xp_events ────────────────────────────────────────────────────────────────
create table if not exists xp_events (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  event_type  text not null,  -- 'quiz_complete' | 'flashcard_session' | 'exam_mode' | 'upload' | 'transcription' | 'photo_analysis' | 'daily_planner'
  xp_earned   int not null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

alter table xp_events enable row level security;
create policy "Users own their xp events"
  on xp_events for all
  using ((select auth.uid()) = user_id);

create index idx_xp_events_user_date on xp_events(user_id, created_at desc);

-- ─── user_achievements ────────────────────────────────────────────────────────
create table if not exists user_achievements (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references profiles(id) on delete cascade,
  achievement_id text not null,
  earned_at      timestamptz not null default now(),
  unique(user_id, achievement_id)
);

alter table user_achievements enable row level security;
create policy "Users own their achievements"
  on user_achievements for all
  using ((select auth.uid()) = user_id);

create index idx_achievements_user on user_achievements(user_id, earned_at desc);
