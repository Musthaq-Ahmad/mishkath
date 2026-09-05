-- Deleting a program cascades to delete its scores/group_scores, which
-- fires log_score_change() to record the deletion in score_audit_log —
-- but score_audit_log.program_id had its own "on delete cascade" FK back
-- to programs. The trigger's INSERT into score_audit_log references
-- program_id while the parent programs row is being deleted in the SAME
-- statement, and by the time that INSERT runs the parent row is already
-- gone, so the FK check fails: "Key (program_id)=(...) is not present in
-- table programs". The whole DELETE then rolls back — meaning any
-- program that has ever had a score entered (published or not) could
-- never actually be deleted; deleteProgram just surfaced a generic
-- "Could not delete program." error.
--
-- Reproduced directly against the database:
--   delete from programs where id = '<a program with scores>';
--   -> insert or update on table "score_audit_log" violates foreign key
--      constraint "score_audit_log_program_id_fkey"
--
-- Fix: an audit log is a historical record and shouldn't require its
-- subject to still exist. Drop the FK so old entries survive program
-- deletion instead of racing it.
-- Run this after 20260826111126_group_participant_members.sql.

alter table public.score_audit_log
  drop constraint if exists score_audit_log_program_id_fkey;
