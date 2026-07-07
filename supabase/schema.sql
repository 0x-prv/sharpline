create table if not exists matches (
  id text primary key,
  home_team text not null,
  away_team text not null,
  status text not null default 'scheduled',
  kickoff_at timestamptz,
  finished_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists odds_snapshots (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null references matches(id),
  match text not null,
  market text not null,
  selection text not null,
  price numeric not null,
  home_score int default 0,
  away_score int default 0,
  is_demo boolean not null default false,
  received_at timestamptz not null default now()
);

create table if not exists market_signals (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null references matches(id),
  match text not null,
  market text not null,
  selection text not null,
  previous_odds numeric not null,
  current_odds numeric not null,
  movement_pct numeric not null,
  direction text not null,
  severity text not null,
  confidence int not null,
  reason_code text not null,
  action text not null check (action in ('WATCH','ALERT','FOLLOW','FADE')),
  explanation text not null,
  ai_provider text not null check (ai_provider in ('groq','fallback')),
  is_demo boolean not null default false,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists signal_resolutions (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references market_signals(id),
  outcome text not null check (outcome in ('won','lost','push')),
  roi_units numeric not null default 0,
  resolved_at timestamptz not null default now()
);

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('live','demo')),
  status text not null check (status in ('started','finished','failed')),
  message text not null,
  metrics jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists odds_snapshots_fixture_time_idx on odds_snapshots(fixture_id, received_at desc);
create index if not exists market_signals_time_idx on market_signals(occurred_at desc);
create index if not exists market_signals_demo_idx on market_signals(is_demo);

create table if not exists agent_state (
  id text primary key,
  mode text not null default 'live' check (mode in ('live','demo')),
  txline_status text not null default 'waiting' check (txline_status in ('connected','reconnecting','offline','waiting')),
  worker_status text not null default 'stopped' check (worker_status in ('running','stopped','error')),
  current_state text not null default 'monitoring' check (current_state in ('monitoring','waiting_for_kickoff','processing_live_match')),
  fixtures_loaded int,
  events_processed int,
  odds_updates_processed int,
  signals_generated int,
  reconnect_count int,
  last_heartbeat_at timestamptz,
  last_txline_event_at timestamptz,
  active_fixture_id text,
  notes text,
  updated_at timestamptz not null default now()
);

create index if not exists agent_state_mode_idx on agent_state(mode);
create index if not exists matches_demo_kickoff_idx on matches(is_demo, kickoff_at desc);
create index if not exists odds_snapshots_demo_time_idx on odds_snapshots(is_demo, received_at desc);

insert into agent_state (id, mode, txline_status, worker_status, current_state, notes)
values ('live', 'live', 'waiting', 'stopped', 'monitoring', 'Live worker has not reported yet.')
on conflict (id) do nothing;
