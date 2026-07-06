-- ─── Referral system ──────────────────────────────────────────────────────────

-- Add referral columns to profiles
alter table profiles
  add column if not exists referral_code      text unique,
  add column if not exists referrals_count    int not null default 0,
  add column if not exists free_months_earned int not null default 0,
  add column if not exists free_months_used   int not null default 0,
  add column if not exists ambassador_badge   boolean not null default false;

-- ─── referrals ───────────────────────────────────────────────────────────────
create table if not exists referrals (
  id               uuid        primary key default gen_random_uuid(),
  referrer_id      uuid        not null references profiles(id) on delete cascade,
  referred_user_id uuid        not null references profiles(id) on delete cascade,
  status           text        not null default 'registered'
                               check (status in ('registered', 'converted', 'rewarded')),
  created_at       timestamptz not null default now(),
  converted_at     timestamptz,
  unique (referred_user_id)   -- one referral per person
);

alter table referrals enable row level security;
create policy "Users see their own referrals as referrer"
  on referrals for select
  using ((select auth.uid()) = referrer_id);

create index idx_referrals_referrer  on referrals(referrer_id);
create index idx_referrals_referred  on referrals(referred_user_id);
create index idx_referrals_status    on referrals(status);

-- ─── referral_rewards ────────────────────────────────────────────────────────
create table if not exists referral_rewards (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references profiles(id) on delete cascade,
  milestone     int         not null,   -- 1, 3, 5, 10, 25
  days_granted  int         not null,
  plan_at_grant text        not null,   -- plan the user had when reward was granted
  granted_at    timestamptz not null default now(),
  unique (user_id, milestone)           -- each milestone granted once
);

alter table referral_rewards enable row level security;
create policy "Users see their own rewards"
  on referral_rewards for select
  using ((select auth.uid()) = user_id);

create index idx_referral_rewards_user on referral_rewards(user_id);

-- ─── Referral code generator ─────────────────────────────────────────────────
-- Generates a unique 8-char uppercase code, retries up to 10 times on collision
create or replace function generate_referral_code()
returns text language plpgsql as $$
declare
  candidate text;
  attempts  int := 0;
begin
  loop
    candidate := upper(substring(md5(gen_random_uuid()::text), 1, 8));
    if not exists (select 1 from profiles where referral_code = candidate) then
      return candidate;
    end if;
    attempts := attempts + 1;
    exit when attempts >= 10;
  end loop;
  -- Fallback: add timestamp suffix
  return upper(substring(md5(now()::text || gen_random_uuid()::text), 1, 8));
end;
$$;

-- ─── Auto-generate referral_code for new profiles ───────────────────────────
create or replace function set_referral_code()
returns trigger language plpgsql as $$
begin
  if new.referral_code is null then
    new.referral_code := generate_referral_code();
  end if;
  return new;
end;
$$;

create trigger trg_set_referral_code
  before insert on profiles
  for each row execute function set_referral_code();

-- Backfill existing profiles that don't have a code yet
update profiles set referral_code = generate_referral_code()
where referral_code is null;
