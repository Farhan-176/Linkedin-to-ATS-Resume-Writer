import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult } from "../types";

const processEnvApiKey = process.env.API_KEY;

if (!processEnvApiKey) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: processEnvApiKey });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallScore: { type: Type.NUMBER, description: "Overall score from 0-100" },
    summary: { type: Type.STRING, description: "A professional 1-paragraph summary from a Senior HR perspective." },
    scores: {
      type: Type.OBJECT,
      properties: {
        impact: { type: Type.NUMBER, description: "Score 0-100 based on use of numbers and results" },
        brevity: { type: Type.NUMBER, description: "Score 0-100 based on conciseness" },
        style: { type: Type.NUMBER, description: "Score 0-100 based on formatting and readability" },
        keywords: { type: Type.NUMBER, description: "Score 0-100 based on keyword matching" },
      },
      required: ["impact", "brevity", "style", "keywords"]
    },
    atsKeywords: {
      type: Type.OBJECT,
      properties: {
        matched: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Keywords found in resume" },
        missing: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Keywords missing from resume but relevant to job" },
      },
      required: ["matched", "missing"]
    },
    sectionAnalysis: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Section name (e.g. Header, Summary, Experience, Education, Skills)" },
          status: { type: Type.STRING, enum: ["Good", "Needs Improvement", "Missing"] },
          feedback: { type: Type.STRING, description: "Specific advice for this section" }
        },
        required: ["name", "status", "feedback"]
      },
      description: "Analyze the structural sections of the resume."
    },
    formattingIssues: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of formatting errors (e.g., complex columns, photos, tables, headers/footers)"
    },
    grammarIssues: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of specific grammar or passive voice issues found"
    },
    duplicateContent: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of repeated phrases, duplicate bullet points, or redundant information."
    },
    starRewrites: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          improved: { type: Type.STRING, description: "Rewritten using STAR method (Situation, Task, Action, Result)" },
          reason: { type: Type.STRING, description: "Why the original was weak" }
        },
        required: ["original", "improved", "reason"]
      },
      description: "Identify 3-5 weak bullet points and rewrite them."
    },
    professionalSummaryRewrite: {
      type: Type.STRING,
      description: "An optimized version of the candidate's professional summary."
    },
    coverLetter: {
      type: Type.STRING,
      description: "A tailored, professional cover letter addressing the job description and highlighting key achievements from the resume."
    },
    hardSkills: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          skill: { type: Type.STRING },
          found: { type: Type.BOOLEAN },
          importance: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
        },
        required: ["skill", "found", "importance"]
      }
    },
    softSkills: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          skill: { type: Type.STRING },
          found: { type: Type.BOOLEAN },
          importance: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
        },
        required: ["skill", "found", "importance"]
      }
    },
    optimizedResumeMarkdown: {
      type: Type.STRING,
      description: "The COMPLETE, FINAL, POLISHED RESUME in Markdown. It must be fully rewritten to be perfect."
    }
  },
  required: [
    "overallScore", "summary", "scores", "atsKeywords", "sectionAnalysis",
    "formattingIssues", "grammarIssues", "duplicateContent", "starRewrites", 
    "professionalSummaryRewrite", "coverLetter", "hardSkills", "softSkills", "optimizedResumeMarkdown"
  ]
};

export const analyzeResumeWithGemini = async (
  resumeText: string, 
  jobDescription: string, 
  fileData?: { mimeType: string, data: string }
): Promise<AnalysisResult> => {
  try {
    const model = "gemini-2.5-flash"; 
    
    const systemPrompt = `
      You are an expert ATS Resume Writer and Career Strategist with 15+ years of experience converting LinkedIn profiles into job-winning resumes.
      
      YOUR TASK:
      The user has provided their LinkedIn profile (PDF, image, or text) and a target job description. Your job is to:
      1. Extract all relevant information from the LinkedIn profile
      2. Create a completely new, ATS-optimized resume tailored to the job description
      3. Analyze the match quality and provide improvement suggestions
      
      CRITICAL RULES FOR RESUME GENERATION (optimizedResumeMarkdown):
      1.  **BRAND NEW DOCUMENT**: Write a fresh, professional resume from scratch based on LinkedIn data
      2.  **TARGET JOB ALIGNMENT**: Transform the profile to match the TARGET JOB, not their current title. If they're a "Social Media Manager" but want to be a "Web Developer", rewrite EVERYTHING to position them as a Web Developer.
      3.  **PROFESSIONAL SUMMARY REWRITE**: Create a new professional summary that positions the candidate for the TARGET ROLE, not their current role. Use job description keywords.
      4.  **ATS OPTIMIZATION**: Use simple, clean formatting with standard section headers
      5.  **KEYWORD RICH**: Naturally incorporate keywords from the job description throughout
      6.  **QUANTIFY EVERYTHING**: Add metrics and numbers to all achievements (estimate if needed based on role/industry norms)
      7.  **STAR METHOD**: Write all experience bullets using Situation-Task-Action-Result format
      8.  **REFRAME EXPERIENCE**: Rewrite past job responsibilities to highlight transferable skills relevant to the target job
      9.  **STANDARD SECTIONS**: Include: Header (Name, Contact), Professional Summary, Work Experience, Education, Skills, Certifications (if any)
      10. **NO PLACEHOLDERS**: Complete, ready-to-use resume - make intelligent decisions when info is missing
      11. **SINGLE COLUMN**: No tables, columns, headers/footers, or graphics - pure ATS-friendly text
      12. **ACTIVE VOICE**: All bullets start with strong action verbs in past tense (except current role)
      13. **TAILORED**: Emphasize experiences and skills most relevant to the target job - de-emphasize or remove irrelevant content
      
      LINKEDIN DATA EXTRACTION:
      - Parse the LinkedIn profile to extract: current & past positions, education, skills, certifications, accomplishments
      - Infer missing details intelligently based on typical roles in that industry
      - **CRITICAL**: DO NOT copy job titles directly. Reframe all experience to align with the TARGET JOB from the job description
      - Transform the professional summary to position the candidate for the TARGET ROLE, not their current LinkedIn title
      - Highlight transferable skills and downplay irrelevant experience
      
      COVER LETTER GENERATION (coverLetter):
      1.  **JOB-SPECIFIC**: Reference specific requirements from the job description
      2.  **ACHIEVEMENT-FOCUSED**: Highlight 2-3 key accomplishments from their LinkedIn that match the role
      3.  **PROFESSIONAL TONE**: Confident, enthusiastic, concise (3-4 paragraphs)
      4.  **PROPER FORMAT**: Business letter format with placeholders: [Your Name], [Date], [Company Name], [Hiring Manager]
      
      ANALYSIS METRICS:
      Provide honest scoring and feedback on how well the LinkedIn profile matches the job requirements.
      Identify gaps in skills/experience and suggest improvements.
      
      ${fileData ? "NOTE: LinkedIn profile is provided as a file (PDF/Image). Carefully extract all text and structured data." : "NOTE: LinkedIn profile is provided as text."}
    `;

    const jobContext = `
      TARGET JOB DESCRIPTION:
      ${jobDescription || "No job description provided. Create a general professional resume optimized for ATS systems based on the candidate's experience level and industry."}
      
      ⚠️ IMPORTANT: The resume MUST be tailored to THIS job description. Position the candidate as the IDEAL candidate for THIS specific role, regardless of their current job title. Extract the target job title from this description and use it to reframe their entire professional profile.
    `;

    // Construct request parts
    const parts: any[] = [{ text: systemPrompt + "\n\n" + jobContext }];

    if (fileData) {
      // If we have file data (PDF/Image), use it for multimodal analysis
      parts.push({ 
        inlineData: { 
          mimeType: fileData.mimeType, 
          data: fileData.data 
        } 
      });
      parts.push({
        text: `This is the candidate's LinkedIn profile. Extract all information and create a professional ATS resume.`
      });
    } else {
      // Fallback to text analysis
      parts.push({ 
        text: `LINKEDIN PROFILE DATA:\n${resumeText}\n\nPlease extract all relevant information and generate a professional ATS-optimized resume.` 
      });
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: 'user', parts: parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0, // Set to 0 for maximum determinism
        seed: 42, // Fixed seed to ensure consistent results across multiple runs
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Analysis Failed:", error);
    throw error;
  }
};