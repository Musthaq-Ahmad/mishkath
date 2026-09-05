-- Tracks whether the physical memento/trophy for a program's winners has
-- been handed over at the ceremony, separate from result publishing.
-- Run this after 20260821121826_divisions.sql.

alter table public.programs
  add column if not exists memento_given boolean not null default false,
  add column if not exists memento_given_at timestamptz;
