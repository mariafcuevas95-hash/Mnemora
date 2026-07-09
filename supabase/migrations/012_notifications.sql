create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,   -- 'exam_reminder' | 'review_due' | 'achievement' | 'streak' | 'cognitive'
  title      text not null,
  body       text not null,
  cta_href   text,
  cta_label  text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists notifications_created_at_idx on notifications(user_id, created_at desc);

alter table notifications enable row level security;

create policy "Users manage own notifications"
  on notifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
