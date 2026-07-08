alter table matches add column if not exists home_score int;
alter table matches add column if not exists away_score int;
create index if not exists matches_finished_demo_idx on matches(is_demo, finished_at desc) where finished_at is not null;
