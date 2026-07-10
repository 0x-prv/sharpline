-- Keep the worker and frontend aligned on the project's terminal match status.
-- Historical rows may already have final-score data even if an earlier snapshot write
-- left status as live_or_upcoming; normalize those rows so past-match queries and
-- signal resolution can find them without waiting for another TxLINE snapshot.
update matches
set status = 'finished',
    finished_at = coalesce(finished_at, updated_at, kickoff_at, now()),
    updated_at = now()
where is_demo = false
  and status <> 'finished'
  and (
    finished_at is not null
    or status in ('completed', 'final')
  );
