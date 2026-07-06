-- Notification preferences on profiles
alter table profiles
  add column if not exists notifications_email boolean not null default false,
  add column if not exists notifications_time  text    not null default '08:00'; -- HH:MM local time preference
