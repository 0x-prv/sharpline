alter table signal_resolutions add column if not exists anchor_tx_signature text;
alter table signal_resolutions add column if not exists anchored_at timestamptz;
