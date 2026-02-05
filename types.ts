export enum LoadingState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface RewrittenItem {
  original: string;
  improved: string;
  reason: string;
}

export interface SkillMatch {
  skill: string;
  found: boolean;
  importance: 'High' | 'Medium' | 'Low';
}

export interface SectionAnalysis {
  name: string;
  status: 'Good' | 'Needs Improvement' | 'Missing';
  feedback: string;
}

export interface AnalysisResult {
  overallScore: number;
  summary: string; // The "Senior HR" tone summary
  scores: {
    impact: number;
    brevity: number;
    style: number;
    keywords: number;
  };
  atsKeywords: {
    matched: string[];
    missing: string[];
  };
  sectionAnalysis: SectionAnalysis[];
  formattingIssues: string[];
  grammarIssues: string[];
  duplicateContent: string[]; // New field for redundancy finder
  starRewrites: RewrittenItem[];
  professionalSummaryRewrite: string;
  coverLetter: string; // New field for the generated cover letter
  hardSkills: SkillMatch[];
  softSkills: SkillMatch[];
  optimizedResumeMarkdown: string;
}

// Default initial state for the result to avoid null checks everywhere
export const INITIAL_ANALYSIS: AnalysisResult = {
  overallScore: 0,
  summary: "",
  scores: { impact: 0, brevity: 0, style: 0, keywords: 0 },
  atsKeywords: { matched: [], missing: [] },
  sectionAnalysis: [],
  formattingIssues: [],
  grammarIssues: [],
  duplicateContent: [],
  starRewrites: [],
  professionalSummaryRewrite: "",
  coverLetter: "",
  hardSkills: [],
  softSkills: [],
  optimizedResumeMarkdown: ""
};