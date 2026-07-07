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
