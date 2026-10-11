-- Schema: Lumetra rebuild (Postgres / Supabase)
-- Conventions: uuid PKs; timestamptz in UTC; money in integer paise (+ currency);
-- market prices in numeric(12,2); FKs with explicit on-delete; indexes on FKs and
-- filter/sort columns; RLS on. The service-role compute worker writes market data.

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ---------- enums ----------
create type auth_provider  as enum ('email','phone','google');
create type sub_status      as enum ('pending','active','expired','cancelled');
create type sub_product     as enum ('genie','course','algorithm','bundle','commodity');
create type segment         as enum ('nse','mcx','both');
create type meter_signal    as enum ('buy','sell','hold');
create type pd_role         as enum ('puller','dragger');
create type opt_signal      as enum ('atm','otm','stay_out');   -- green / yellow / red
create type lead_source     as enum ('course','algorithm','callback');
create type lead_status     as enum ('new','applied','contacted');
create type txn_status      as enum ('created','paid','failed','refunded');
create type session_type    as enum ('normal','muhurat','holiday');

-- ---------- profiles (1:1 with auth.users) ----------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text,
  email         text,
  mobile        text,
  country       text default 'IN',
  auth_provider auth_provider not null default 'email',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- subscriptions ----------
create table subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  product      sub_product not null default 'genie',
  plan_years   integer not null default 1 check (plan_years between 1 and 5),
  seg          segment not null default 'nse',
  amount_paise bigint not null,                 -- 999900 = ₹9,999
  currency     text not null default 'INR',
  status       sub_status not null default 'pending',
  started_at   timestamptz,
  expires_at   timestamptz,
  razorpay_subscription_id text unique,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on subscriptions (user_id, status);
create index on subscriptions (status, expires_at);
-- ---------- active-subscription gate ----------
create or replace function has_active_subscription(uid uuid)
returns boolean language sql stable as $$
  select exists (select 1 from subscriptions s
                 where s.user_id = uid and s.status='active' and s.expires_at > now());
$$;

-- ---------- instruments (NSE/BSE/MCX universe) ----------
create table instruments (
  id        uuid primary key default gen_random_uuid(),
  symbol    text not null unique,
  name      text not null,
  exchange  text not null default 'NSE' check (exchange in ('NSE','BSE','MCX')),
  sector    text,
  beta      numeric(8,4),
  lot_size  integer,
  is_fno    boolean not null default true,
  created_at timestamptz not null default now()
);
create index on instruments (sector);
create index on instruments (exchange, is_fno);

-- ---------- trading calendar (holidays + Muhurat) ----------
create table trading_calendar (
  trade_date   date primary key,
  is_open      boolean not null default true,
  session_type session_type not null default 'normal',
  open_time    timestamptz,
  close_time   timestamptz
);

-- ---------- free-tier usage counters ----------
create table usage_counters (
  user_id uuid not null references profiles(id) on delete cascade,
  tool    text not null,              -- 'meter' | 'scanner' | 'pd' | ...
  day     date not null,
  count   integer not null default 0,
  primary key (user_id, tool, day)
);
-- ---------- live stock snapshots (feeds Meter + Scanner; worker-written) ----------
create table stock_snapshots (
  instrument_id uuid not null references instruments(id) on delete cascade,
  ts            timestamptz not null,            -- minute bucket, UTC
  ltp           numeric(12,2),
  change_pct    numeric(8,4),
  rating        numeric(6,2) not null default 0 check (rating between -100 and 100),
  signal        meter_signal not null default 'hold',
  golden_zone   boolean not null default false,
  bull_power    numeric(8,4),
  bear_power    numeric(8,4),
  reversal_confirmation boolean not null default false,
  w_point       numeric(12,2),
  high_volume   boolean not null default false,
  primary key (instrument_id, ts)
);
create index on stock_snapshots (ts, rating);

-- ---------- index pullers & draggers ----------
create table index_flow (
  idx           text not null,     -- nifty50 | banknifty | sensex | finnifty | midcap
  instrument_id uuid not null references instruments(id) on delete cascade,
  ts            timestamptz not null,
  contribution_points numeric(10,2) not null default 0,
  role          pd_role not null,
  primary key (idx, instrument_id, ts)
);
create index on index_flow (idx, ts);

-- ---------- sector snapshots ----------
create table sector_snapshots (
  sector     text not null,
  ts         timestamptz not null,
  value      numeric(14,2),
  change_pct numeric(8,4),
  strength   numeric(8,4),
  leading    boolean not null default false,
  primary key (sector, ts)
);
-- ---------- option sentiment (per underlying/strike/expiry; worker-written) ----------
create table option_sentiment (
  underlying  text not null,
  strike      numeric(12,2) not null,
  expiry      date not null,
  ts          timestamptz not null,
  signal      opt_signal not null,        -- atm(green) | otm(yellow) | stay_out(red)
  delta numeric(8,4), gamma numeric(10,6), theta numeric(10,4), vega numeric(10,4),
  pcr         numeric(8,4),
  high_activity boolean not null default false,
  primary key (underlying, strike, expiry, ts)
);
create index on option_sentiment (underlying, ts);

-- ---------- portfolio holdings (user-owned) ----------
create table holdings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  instrument_id uuid not null references instruments(id) on delete cascade,
  qty           integer not null default 0,
  avg_price     numeric(12,2),
  added_at      timestamptz not null default now()
);
create index on holdings (user_id);

-- ---------- leads (course / algorithm / callback funnels) ----------
create table leads (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  country    text,
  mobile     text,
  source     lead_source not null,
  status     lead_status not null default 'new',
  created_at timestamptz not null default now()
);
create index on leads (source, status);

-- ---------- callback requests ----------
create table callback_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete set null,
  lead_id    uuid references leads(id) on delete set null,
  slot_date  date,
  slot_time  text,
  status     text not null default 'requested',
  created_at timestamptz not null default now()
);
-- ---------- transactions / billing ----------
create table transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  amount_paise bigint not null,
  currency    text not null default 'INR',
  product     sub_product,
  status      txn_status not null default 'created',
  invoice_no  text unique,
  razorpay_payment_id text,
  created_at  timestamptz not null default now()
);
create index on transactions (user_id, created_at);

-- ---------- course (LMS) ----------
create table courses (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  slug       text not null unique,
  created_at timestamptz not null default now()
);
create table course_chapters (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses(id) on delete cascade,
  title       text not null,
  video_asset text,
  sort_order  integer not null default 0
);
create index on course_chapters (course_id, sort_order);
create table enrollments (
  user_id      uuid not null references profiles(id) on delete cascade,
  course_id    uuid not null references courses(id) on delete cascade,
  access       text not null default 'free' check (access in ('free','paid')),
  progress_pct integer not null default 0 check (progress_pct between 0 and 100),
  updated_at   timestamptz not null default now(),
  primary key (user_id, course_id)
);
-- ---------- algo licences (TradingView indicators) ----------
create table algo_licences (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  algo       text not null check (algo in ('algo1','algo2')),
  tradingview_username text,
  status     text not null default 'requested' check (status in ('requested','active','expired')),
  booked_at  timestamptz not null default now()
);
create index on algo_licences (user_id);

-- ---------- affiliate / referrals ----------
create table affiliates (
  user_id         uuid primary key references profiles(id) on delete cascade,
  referral_code   text not null unique,
  commission_rate numeric(5,2) not null default 0,
  earnings_paise  bigint not null default 0
);
create table referrals (
  id                uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid not null references affiliates(user_id) on delete cascade,
  referred_user_id  uuid references profiles(id) on delete set null,
  status            text not null default 'pending',
  reward_paise      bigint not null default 0,
  created_at        timestamptz not null default now()
);
create index on referrals (affiliate_user_id);
-- ---------- operator rules (automated execution — regulated) ----------
create table operator_rules (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  name       text not null,
  conditions jsonb not null default '{}',
  action     text not null,
  broker     text,
  status     text not null default 'paused' check (status in ('active','paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on operator_rules (user_id, status);

-- ---------- per-user settings ----------
create table trading_preferences (
  user_id       uuid primary key references profiles(id) on delete cascade,
  segments      text[] not null default '{nse}',
  default_index text,
  theme         text not null default 'dark'
);
create table telegram_links (
  user_id          uuid primary key references profiles(id) on delete cascade,
  telegram_chat_id text unique,
  linked_at        timestamptz not null default now()
);
-- ---------- row-level security ----------
alter table profiles            enable row level security;
alter table subscriptions       enable row level security;
alter table usage_counters      enable row level security;
alter table holdings            enable row level security;
alter table callback_requests   enable row level security;
alter table transactions        enable row level security;
alter table enrollments         enable row level security;
alter table algo_licences       enable row level security;
alter table affiliates          enable row level security;
alter table referrals           enable row level security;
alter table operator_rules      enable row level security;
alter table trading_preferences enable row level security;
alter table telegram_links      enable row level security;
alter table leads               enable row level security;
alter table instruments         enable row level security;
alter table stock_snapshots     enable row level security;
alter table index_flow          enable row level security;
alter table sector_snapshots    enable row level security;
alter table option_sentiment    enable row level security;
alter table trading_calendar    enable row level security;
alter table courses             enable row level security;
alter table course_chapters     enable row level security;

-- owner-only (worker/webhooks use the service role, which bypasses RLS)
create policy own_profile  on profiles            for all    using (id = auth.uid())      with check (id = auth.uid());
create policy own_subs     on subscriptions       for select using (user_id = auth.uid());
create policy own_usage    on usage_counters      for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_holdings on holdings            for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_txns     on transactions        for select using (user_id = auth.uid());
create policy own_enroll   on enrollments         for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_algo     on algo_licences       for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_aff      on affiliates          for select using (user_id = auth.uid());
create policy own_ops      on operator_rules      for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_prefs    on trading_preferences for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_tg       on telegram_links      for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
-- ---------- public funnels: anyone may submit a lead or callback ----------
create policy insert_leads    on leads             for insert with check (true);
create policy insert_callback on callback_requests for insert with check (true);
create policy own_callback    on callback_requests for select using (user_id = auth.uid());

-- ---------- free tools: any signed-in user reads (API meters via usage_counters) ----------
create policy read_instruments     on instruments      for select using (auth.uid() is not null);
create policy read_calendar        on trading_calendar for select using (auth.uid() is not null);
create policy free_reads_snapshots on stock_snapshots  for select using (auth.uid() is not null);
create policy free_reads_indexflow on index_flow       for select using (auth.uid() is not null);

-- ---------- Pro data: active Genie subscription only ----------
create policy pro_reads_sectors on sector_snapshots for select using (has_active_subscription(auth.uid()));
create policy pro_reads_options on option_sentiment for select using (has_active_subscription(auth.uid()));

-- ---------- courses readable to signed-in; video gated by enrollment in the API ----------
create policy read_courses  on courses         for select using (auth.uid() is not null);
create policy read_chapters on course_chapters for select using (auth.uid() is not null);
create policy own_referrals on referrals       for select using (affiliate_user_id = auth.uid());

-- ---------- webhook idempotency (service-role only; no anon policy) ----------
create table if not exists webhook_events (
  id         text primary key,
  provider   text not null,
  created_at timestamptz not null default now()
);
alter table webhook_events enable row level security;

-- ---------- auto-create a profile row when a user signs up ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name, email, mobile, auth_provider)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email,
    new.raw_user_meta_data->>'mobile',
    (case when coalesce(new.raw_app_meta_data->>'provider','email') = 'google'
          then 'google' else 'email' end)::public.auth_provider
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
