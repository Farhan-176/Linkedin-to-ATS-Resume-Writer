export const LoadingState = {
    IDLE: 'IDLE',
    ANALYZING: 'ANALYZING',
    COMPLETE: 'COMPLETE',
    ERROR: 'ERROR'
};

export const INITIAL_ANALYSIS = {
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
