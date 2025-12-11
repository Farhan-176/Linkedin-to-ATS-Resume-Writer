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
      You are an expert Senior HR Manager and Professional Resume Writer with 10+ years of experience.
      
      YOUR MANDATE:
      Take the user's uploaded resume (text, PDF, or image) and perform a deep analysis, rewrite the resume, AND write a tailored cover letter.
      
      RULES FOR THE REWRITE (optimizedResumeMarkdown):
      1.  **NO SUGGESTIONS**: Do not say "You should change this." JUST CHANGE IT.
      2.  **NO QUESTIONS**: Do not ask for clarification. Make the best professional executive decision.
      3.  **COMPLETE DOCUMENT**: The output must be the full resume, from Header to Education. No placeholders.
      4.  **STAR METHOD**: Automatically rewrite all achievement bullets into the STAR format.
      5.  **KEYWORD INTEGRATION**: Seamlessly weave the missing Job Description keywords into the Skills and Experience sections.
      6.  **FORMATTING**: Use clean, standard Markdown (# Name, ## Section, - Bullets).
      7.  **LAYOUT FIXES**: Linearize any complex column layouts into a single-column ATS friendly format.
      
      RULES FOR THE COVER LETTER (coverLetter):
      1.  **TAILORED**: Address the specific Job Description (if provided) or the implied role.
      2.  **EVIDENCE-BASED**: Connect the candidate's strongest achievements (from your analysis) to the company's needs.
      3.  **TONE**: Enthusiastic, professional, confident, yet concise (3-4 paragraphs).
      4.  **FORMAT**: Standard business letter format in Markdown. Include placeholders for [Your Name], [Date], [Company Name] if unknown.

      ALSO PROVIDE THE ANALYSIS METRICS:
      Populate the JSON fields (scores, keywords, issues) so the user understands *why* changes were made.
      
      ${fileData ? "NOTE: Input is a file (PDF/Image). Use the visual layout to correctly infer section headers and content hierarchy." : "NOTE: Input is raw text."}
    `;

    const jobContext = `
      TARGET JOB DESCRIPTION:
      ${jobDescription || "No specific job description provided. Optimize for the role implied in the resume content."}
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
    } else {
      // Fallback to text analysis
      parts.push({ 
        text: `RESUME TEXT CONTENT:\n${resumeText}` 
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