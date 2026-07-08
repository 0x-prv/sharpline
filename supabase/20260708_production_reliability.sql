create extension if not exists pgcrypto;
alter table market_signals add column if not exists idempotency_key text;
alter table market_signals add column if not exists unresolved_reason text;
alter table signal_resolutions add column if not exists unresolved_reason text;

update market_signals
set idempotency_key = encode(sha256(concat_ws('|', fixture_id, market, selection, reason_code, action, date_trunc('minute', occurred_at)::text)::bytea), 'hex')
where idempotency_key is null;

create unique index if not exists market_signals_idempotency_key_idx on market_signals(idempotency_key) where idempotency_key is not null;
create unique index if not exists signal_resolutions_signal_id_unique_idx on signal_resolutions(signal_id);
create index if not exists market_signals_pending_completed_idx on market_signals(fixture_id, pending_resolution, is_demo) where pending_resolution = true;
create index if not exists matches_finished_live_idx on matches(id, finished_at) where is_demo = false and finished_at is not null;
create index if not exists odds_snapshots_fixture_market_received_idx on odds_snapshots(fixture_id, market, received_at);
