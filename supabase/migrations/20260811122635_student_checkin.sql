-- Attendance/check-in tracking for students. Lets admins mark a student as
-- physically checked in at the venue and surfaces a real "Checked in: X/Y"
-- count on the dashboard (previously no such data existed).
-- Run this after 20260811122634_score_audit_log.sql.

alter table public.students
  add column if not exists checked_in boolean not null default false,
  add column if not exists checked_in_at timestamptz;
