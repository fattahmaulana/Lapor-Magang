export interface ReportDraft {
  activity_desc: string; // Uraian Aktivitas (min 100 char, target 120-400)
  learning_desc: string; // Pelajaran yang Diperoleh (min 100 char, target 120-400)
  obstacle_desc: string; // Kendala yang Dialami (min 100 char, target 120-400)
}

export type GenerateReportResponse =
  | {
      status: 'success';
      data: ReportDraft;
      tokens_used?: number;
      similarity_score?: number;
    }
  | {
      status: 'needs_more_info';
      question: string;
      reason: string;
    }
  | {
      status: 'error';
      message: string;
    };

export interface DailyLogItem {
  id: string;
  date: string;
  activity_desc: string;
  learning_desc: string;
  obstacle_desc: string;
  is_reported_to_maganghub: boolean;
  reported_at?: string;
  created_at: string;
}

export interface WeeklyRecap {
  week_label: string;
  period: string;
  total_days: number;
  summary: string;
  key_achievements: string[];
  key_learnings: string[];
  obstacles_and_solutions: string[];
  next_week_plan: string[];
}

export interface PresentationSlide {
  id: number;
  title: string;
  subtitle?: string;
  tag: string;
  bullets: string[];
  speaker_notes?: string;
}

export interface PresentationDeck {
  title: string;
  subtitle: string;
  author: string;
  period: string;
  institution: string;
  slides: PresentationSlide[];
}
