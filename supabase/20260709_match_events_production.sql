create table if not exists match_events (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null references matches(id),
  event_type text not null,
  minute int,
  team text,
  is_demo boolean not null default false,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists match_events_fixture_time_idx on match_events(fixture_id, occurred_at);
create index if not exists match_events_demo_time_idx on match_events(is_demo, occurred_at desc);
