alter table market_signals add column if not exists competition text not null default 'FIFA World Cup 2026';
alter table market_signals add column if not exists current_match_state text not null default '0-0';
alter table market_signals add column if not exists pending_resolution boolean not null default true;
alter table market_signals add column if not exists outcome text check (outcome in ('won','lost','push'));
alter table market_signals add column if not exists final_score text;
alter table market_signals add column if not exists final_odds numeric;
alter table market_signals add column if not exists roi_units numeric;
alter table market_signals add column if not exists resolved_at timestamptz;
alter table market_signals add column if not exists historical_similar_count int not null default 0;
alter table market_signals add column if not exists historical_success_rate numeric;
alter table market_signals add column if not exists historical_average_roi numeric;

alter table signal_resolutions add column if not exists final_score text;
alter table signal_resolutions add column if not exists final_odds numeric;
create unique index if not exists signal_resolutions_signal_id_idx on signal_resolutions(signal_id);
create index if not exists market_signals_pending_fixture_idx on market_signals(fixture_id, pending_resolution);
create index if not exists market_signals_strategy_idx on market_signals(action, reason_code, market, selection);
