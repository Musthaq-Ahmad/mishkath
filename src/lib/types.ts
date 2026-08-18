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

export type StudentDivision = "senior" | "junior" | "sub_junior" | "general";
export type StudentCategory = "boy" | "girl";

export type Student = {
  id: string;
  name: string;
  group_id: string;
  division: StudentDivision;
  class: string;
  category: StudentCategory;
  guardian_name: string | null;
  admission_number: string | null;
  date_of_birth: string | null;
  phone_number: string | null;
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
  category: StudentDivision;
  program_type: ProgramType;
  gender_category: GenderCategory;
  status: ProgramStatus;
  max_score: number;
  published: boolean;
  published_at: string | null;
  scheduled_start: string | null;
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
  category: StudentDivision;
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
  category: StudentDivision;
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
