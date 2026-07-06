-- Add payment-related columns to profiles
alter table profiles
  add column if not exists hotmart_subscription_code text unique,
  add column if not exists plan_expires_at            timestamptz;

-- Secure log of every payment event received from Hotmart (or future providers)
create table if not exists payment_events (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        references auth.users(id) on delete set null,
  provider             text        not null default 'hotmart',
  event_type           text        not null,
  transaction_id       text,
  subscription_code    text,
  amount_usd           numeric(10, 2),
  buyer_email          text,
  payload              jsonb       not null,
  processed_at         timestamptz not null default now(),
  created_at           timestamptz not null default now()
);

-- No user-level access — only service role reads/writes this table
alter table payment_events enable row level security;
create policy "admin_only" on payment_events for all using (false);

-- Index for correlation queries
create index if not exists payment_events_user_id_idx         on payment_events (user_id);
create index if not exists payment_events_subscription_idx    on payment_events (subscription_code);
create index if not exists payment_events_transaction_idx     on payment_events (transaction_id);
create index if not exists payment_events_event_type_idx      on payment_events (event_type);
