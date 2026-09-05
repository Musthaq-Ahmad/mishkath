// Multi-tenancy (see MULTI_TENANCY.md). `Role` below is the legacy global
// role on `profiles`; it stays until Phase 4 drops that column in favour of
// TenantRole, which is scoped to one tenant and lives on `tenant_members`.
export type TenantRole = "owner" | "admin" | "scorer" | "viewer";
export type TenantStatus = "active" | "suspended" | "trial";
export type TenantLocale = "en" | "ml";

export type TenantBranding = {
  accent?: string;
  /** Festival logo shown on light surfaces and in print. */
  logo_url?: string;
  /** Optional variant for dark surfaces; falls back to logo_url. */
  logo_url_dark?: string;
};

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  name_ml: string | null;
  status: TenantStatus;
  locale: TenantLocale;
  public_leaderboard_enabled: boolean;
  branding: TenantBranding;
  created_at: string;
};

export type TenantMember = {
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  created_at: string;
};

export type TenantInvite = {
  id: string;
  tenant_id: string;
  email: string;
  role: Exclude<TenantRole, "owner">;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

export type Role = "admin" | "judge";

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  created_at: string;
};

// Admin-editable — see the `divisions` table. Every "division" field below
// is a division id (uuid), not a fixed set of known strings anymore.
export type Division = {
  id: string;
  name: string;
  name_ml: string | null;
  sort_order: number;
  base_chest_number: number;
  is_active: boolean;
  created_at: string;
};

export type StudentCategory = "boy" | "girl";

export type Student = {
  id: string;
  name: string;
  group_id: string;
  division: string;
  class: string;
  category: StudentCategory;
  is_active: boolean;
  chest_number: string | null;
  photo_url: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
};

export type ProgramType = "individual" | "group";
export type GenderCategory = "boy" | "girl" | "mixed";
export type ProgramStatus = "draft" | "scheduled" | "running" | "completed";

export type Program = {
  id: string;
  name: string;
  category: string;
  program_type: ProgramType;
  gender_category: GenderCategory;
  status: ProgramStatus;
  max_score: number;
  published: boolean;
  published_at: string | null;
  memento_given: boolean;
  memento_given_at: string | null;
  scheduled_start: string | null;
  created_at: string;
};

export type ProgramJudge = {
  id: string;
  program_id: string;
  name: string;
  created_at: string;
};

export type ProgramParticipant = {
  id: string;
  program_id: string;
  student_id: string;
  code: string | null;
  created_at: string;
};

export type ProgramGroupParticipant = {
  id: string;
  program_id: string;
  group_id: string;
  code: string | null;
  created_at: string;
};

export type ProgramGroupParticipantMember = {
  id: string;
  program_id: string;
  group_id: string;
  participant_id: string;
  student_id: string;
  created_at: string;
};

export type ScoreRow = {
  id: string;
  program_id: string;
  student_id: string;
  total: number;
  created_at: string;
  updated_at: string;
};

export type ScoreAuditLogRow = {
  id: string;
  program_id: string;
  participant_kind: "student" | "group";
  participant_id: string;
  total: number | null;
  action: "insert" | "update" | "delete";
  changed_by: string | null;
  changed_at: string;
};

export type GroupScoreRow = {
  id: string;
  program_id: string;
  group_id: string;
  participant_id: string;
  total: number;
  created_at: string;
  updated_at: string;
};

export type ProgramResult = {
  program_id: string;
  student_id: string;
  student_name: string;
  group_id: string;
  avg_total: number;
  rank: number;
  photo_url: string | null;
  student_category: StudentCategory;
};

export type GroupProgramResult = {
  program_id: string;
  group_id: string;
  participant_id: string;
  group_name: string;
  avg_total: number;
  rank: number;
};

export type GroupLeaderboardRow = {
  group_id: string;
  group_name: string;
  points: number;
};

export type EventPlacementRow = {
  program_id: string;
  program_name: string;
  category: string;
  program_type: ProgramType;
  published_at: string | null;
  rank: number;
  place_id: string;
  place_name: string;
  place_photo_url: string | null;
  place_group_id: string;
  place_category: StudentCategory | null;
};

export type ProgramPlacements = {
  program_id: string;
  program_name: string;
  category: string;
  program_type: ProgramType;
  published_at: string | null;
  places: {
    id: string;
    rank: number;
    name: string;
    photoUrl: string | null;
    groupId: string;
    category: StudentCategory | null;
  }[];
};
