import type { StudentDivision } from "@/lib/types";

// Localized labels for the public, TV-facing leaderboard only. The admin
// dashboard stays in English — this is a separate map on purpose, not a
// swap of the shared STUDENT_DIVISION_LABELS.
export const ML_DIVISION_LABELS: Record<StudentDivision, string> = {
  senior: "സീനിയർ",
  junior: "ജൂനിയർ",
  sub_junior: "സബ് ജൂനിയർ",
  general: "ജനറൽ",
};

export const ML_RANK_LABEL: Record<number, string> = {
  1: "ഒന്നാം സ്ഥാനം",
  2: "രണ്ടാം സ്ഥാനം",
  3: "മൂന്നാം സ്ഥാനം",
};

export const ML_MEDAL_LABEL: Record<number, string> = {
  1: "ഗോൾഡ് മെഡൽ",
  2: "സിൽവർ മെഡൽ",
  3: "ബ്രോൺസ് മെഡൽ",
};
