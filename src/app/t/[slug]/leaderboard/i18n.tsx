"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ml";

type TranslationKey =
  | "liveResults"
  | "festivalTagline"
  | "live"
  | "allResults"
  | "scanForResults"
  | "justPublished"
  | "previousResult"
  | "tie"
  | "resultsWillAppear"
  | "groupStandings"
  | "overallFestivalPoints"
  | "noResultsPublished"
  | "previousWinner"
  | "currentProgram"
  | "nextProgram"
  | "announcement"
  | "notScheduled"
  | "announcements"
  | "noPreviousResults"
  | "backToLive"
  | "programsPublishedSoFar"
  | "upNext"
  | "allCategories"
  | "individual"
  | "group"
  | "noResultsForFilter";

const TRANSLATIONS: Record<TranslationKey, Record<Lang, string>> = {
  liveResults: { en: "Live Results", ml: "തത്സമയ ഫലങ്ങൾ" },
  festivalTagline: {
    en: "Festival management and results tracking",
    ml: "ഫെസ്റ്റിവൽ മാനേജ്മെന്റും ഫല നിരീക്ഷണവും",
  },
  live: { en: "Live", ml: "ലൈവ്" },
  allResults: { en: "All Results", ml: "എല്ലാ ഫലങ്ങളും" },
  scanForResults: { en: "Scan for results", ml: "ഫലങ്ങൾക്കായി സ്കാൻ ചെയ്യുക" },
  justPublished: { en: "Just Published", ml: "പുതുതായി പ്രഖ്യാപിച്ചത്" },
  previousResult: { en: "Previous Result", ml: "മുൻ ഫലം" },
  tie: { en: "Tie", ml: "സമനില" },
  resultsWillAppear: {
    en: "Results will appear here once published.",
    ml: "ഫലങ്ങൾ പ്രസിദ്ധീകരിച്ചാൽ ഇവിടെ ദൃശ്യമാകും.",
  },
  groupStandings: { en: "Group Standings", ml: "ഗ്രൂപ്പ് സ്ഥാനങ്ങൾ" },
  overallFestivalPoints: { en: "Overall Festival Points", ml: "മൊത്തം ഫെസ്റ്റിവൽ പോയിന്റുകൾ" },
  noResultsPublished: {
    en: "No results published yet.",
    ml: "ഇതുവരെ ഫലങ്ങൾ പ്രസിദ്ധീകരിച്ചിട്ടില്ല.",
  },
  previousWinner: { en: "Previous Winner", ml: "മുൻ വിജയി" },
  currentProgram: { en: "Current Program", ml: "നിലവിലെ പ്രോഗ്രാം" },
  nextProgram: { en: "Next Program", ml: "അടുത്ത പ്രോഗ്രാം" },
  announcement: { en: "Announcement", ml: "അറിയിപ്പ്" },
  notScheduled: { en: "Not scheduled", ml: "സമയം നിശ്ചയിച്ചിട്ടില്ല" },
  announcements: { en: "Announcements", ml: "അറിയിപ്പുകൾ" },
  noPreviousResults: { en: "No previous results yet.", ml: "മുമ്പുള്ള ഫലങ്ങളൊന്നും ഇല്ല." },
  backToLive: { en: "Back to Live", ml: "ലൈവിലേക്ക് മടങ്ങുക" },
  programsPublishedSoFar: {
    en: "programs published so far",
    ml: "പ്രോഗ്രാമുകൾ ഇതുവരെ പ്രസിദ്ധീകരിച്ചു",
  },
  upNext: { en: "Up next", ml: "അടുത്തത്" },
  allCategories: { en: "All", ml: "എല്ലാം" },
  individual: { en: "Individual", ml: "വ്യക്തിഗതം" },
  group: { en: "Group", ml: "ഗ്രൂപ്പ്" },
  noResultsForFilter: {
    en: "No results published yet for this filter.",
    ml: "ഈ ഫിൽട്ടറിനായി ഇതുവരെ ഫലങ്ങൾ പ്രസിദ്ധീകരിച്ചിട്ടില്ല.",
  },
};

const RANK_LABEL_BILINGUAL: Record<number, Record<Lang, string>> = {
  1: { en: "1st Place", ml: "ഒന്നാം സ്ഥാനം" },
  2: { en: "2nd Place", ml: "രണ്ടാം സ്ഥാനം" },
  3: { en: "3rd Place", ml: "മൂന്നാം സ്ഥാനം" },
};

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
  rankLabel: (rank: number) => string | undefined;
  startsIn: (countdown: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "leaderboard-lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Starts "en" so server and first client render agree (no hydration
  // mismatch); resolves to the stored preference right after mount, same
  // pattern as the app's theme hook.
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "en" || stored === "ml") setLangState(stored);
      } catch {
        // localStorage unavailable (private browsing, etc.) — stay on default.
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  function setLang(next: Lang) {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable — selection just won't persist across reloads.
    }
  }

  const value: LanguageContextValue = {
    lang,
    setLang,
    t: (key) => TRANSLATIONS[key][lang],
    rankLabel: (rank) => RANK_LABEL_BILINGUAL[rank]?.[lang],
    startsIn: (countdown) => (lang === "ml" ? `${countdown} ൽ ആരംഭിക്കും` : `Starts in ${countdown}`),
  };

  return (
    <LanguageContext.Provider value={value}>
      <div lang={lang}>{children}</div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
