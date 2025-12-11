import React, { useState, useRef } from 'react';
import { Briefcase, FileText, Upload, Check, AlertTriangle, Search, Download, RefreshCw, Zap, Layout, Loader2, XCircle, CheckCircle, Lightbulb, Sparkles, Copy, Repeat, Trash2, FileCheck, Mail, FileJson, Menu } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { marked } from 'marked';
import { analyzeResumeWithGemini } from './services/geminiService';
import { extractTextFromFile, fileToBase64 } from './utils/fileHelpers';
import { AnalysisResult, INITIAL_ANALYSIS, LoadingState } from './types';
import { ScoreGauge, FeatureCard, AccordionItem, SkillTag, ResumeModal } from './components/DashboardComponents';

const SAMPLE_JOB_DESC = "We are looking for a Senior Software Engineer with React and Node.js experience...";

interface UploadedFileState {
  name: string;
  type: string;
  base64: string | null;
}

export default function App() {
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [isParsing, setIsParsing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Input States
  const [resumeText, setResumeText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<UploadedFileState | null>(null);
  const [jobDesc, setJobDesc] = useState("");
  
  const [result, setResult] = useState<AnalysisResult>(INITIAL_ANALYSIS);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'upload' | 'dashboard'>('upload');
  const [dashboardView, setDashboardView] = useState<'analysis' | 'resume' | 'cover-letter'>('analysis');
  const [expandedSection, setExpandedSection] = useState<string | null>('summary');
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsParsing(true);
      try {
        const fileType = file.type;
        const isPdf = fileType === 'application/pdf';
        const isImage = fileType.startsWith('image/');
        
        let base64Data: string | null = null;
        let extractedText = "";

        if (!isImage) {
          try {
            extractedText = await extractTextFromFile(file);
          } catch (err) {
            console.warn("Text extraction failed, relying on file data if possible");
          }
        } else {
            extractedText = "[Image File Uploaded]";
        }

        if (isPdf || isImage) {
          base64Data = await fileToBase64(file);
        }

        setUploadedFile({
          name: file.name,
          type: fileType,
          base64: base64Data
        });

        setResumeText(extractedText);

      } catch (err) {
        alert("Error processing file: " + (err as Error).message);
      } finally {
        setIsParsing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setResumeText("");
  };

  const handleAnalysis = async () => {
    if (!resumeText.trim() && !uploadedFile) return;
    
    setLoadingState(LoadingState.ANALYZING);
    try {
      const fileData = (uploadedFile?.base64 && (uploadedFile.type === 'application/pdf' || uploadedFile.type.startsWith('image/')))
        ? { mimeType: uploadedFile.type, data: uploadedFile.base64 } 
        : undefined;

      const data = await analyzeResumeWithGemini(resumeText, jobDesc, fileData);
      
      setResult(data);
      setLoadingState(LoadingState.COMPLETE);
      setActiveTab('dashboard');
      setDashboardView('analysis');
    } catch (error) {
      setLoadingState(LoadingState.ERROR);
    }
  };

  const exportReportJson = () => {
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(result, null, 2)], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "Resume_Analysis_Report.json";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  const exportReportTxt = () => {
    const { 
      overallScore, summary, scores, atsKeywords, sectionAnalysis, 
      formattingIssues, grammarIssues, duplicateContent, 
      professionalSummaryRewrite, coverLetter
    } = result;

    const line = (char: string = '-') => char.repeat(60);

    let text = `TALENTSCOUT AI - RESUME ANALYSIS REPORT\n`;
    text += `${line('=')}\n`;
    text += `Date: ${new Date().toLocaleDateString()}\n`;
    text += `Overall Score: ${overallScore}/100\n\n`;

    text += `EXECUTIVE SUMMARY\n${line()}\n${summary}\n\n`;

    text += `SCORE BREAKDOWN\n${line()}\n`;
    text += `Impact:   ${scores.impact}/100\n`;
    text += `Brevity:  ${scores.brevity}/100\n`;
    text += `Style:    ${scores.style}/100\n`;
    text += `Keywords: ${scores.keywords}/100\n\n`;

    text += `ATS KEYWORDS\n${line()}\n`;
    text += `Matched: ${atsKeywords.matched.join(', ') || "None"}\n`;
    text += `Missing: ${atsKeywords.missing.join(', ') || "None"}\n\n`;

    text += `AI OPTIMIZED SUMMARY\n${line()}\n${professionalSummaryRewrite}\n\n`;
    
    if (coverLetter) {
        text += `GENERATED COVER LETTER\n${line()}\n${coverLetter}\n`;
    }

    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "Resume_Analysis_Report.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  const downloadCoverLetterAsPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 25;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = 30;

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    const lines = result.coverLetter.split('\n');

    lines.forEach(line => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 30;
      }

      const trimmed = line.trim();
      if (trimmed === '') {
        yPos += 6;
      } else {
        const splitText = doc.splitTextToSize(trimmed, contentWidth);
        doc.text(splitText, margin, yPos);
        yPos += (splitText.length * 5) + 2;
      }
    });

    doc.save("Cover_Letter.pdf");
  };

  const downloadResumeAsPdf = async () => {
    if (!result.optimizedResumeMarkdown) return;
    setIsGeneratingPdf(true);

    const pdf = new jsPDF('p', 'pt', 'a4');
    const margin = 40;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);

    const htmlContent = await marked.parse(result.optimizedResumeMarkdown);

    const container = document.createElement('div');
    container.style.width = `${contentWidth}pt`;
    container.style.position = 'absolute';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.backgroundColor = '#ffffff';
    container.style.padding = '0'; 

    const style = document.createElement('style');
    style.textContent = `
      .pdf-content { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.4; color: #000; padding: 0; }
      .pdf-content h1 { font-family: Helvetica, Arial, sans-serif; font-size: 20pt; font-weight: 700; text-align: center; text-transform: uppercase; margin-bottom: 12pt; border-bottom: 2pt solid #000; padding-bottom: 6pt; margin-top: 0; }
      .pdf-content h2 { font-family: Helvetica, Arial, sans-serif; font-size: 12pt; font-weight: 700; color: #000; text-transform: uppercase; margin-top: 14pt; margin-bottom: 6pt; border-bottom: 1pt solid #ccc; padding-bottom: 2pt; }
      .pdf-content h3 { font-size: 11pt; font-weight: 700; margin-top: 8pt; margin-bottom: 2pt; }
      .pdf-content p { margin-bottom: 6pt; text-align: justify; }
      .pdf-content ul { margin-top: 2pt; margin-bottom: 8pt; padding-left: 18pt; list-style-type: disc; }
      .pdf-content li { margin-bottom: 2pt; padding-left: 2pt; }
      .pdf-content strong { font-weight: bold; }
    `;
    container.appendChild(style);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'pdf-content';
    contentDiv.innerHTML = htmlContent as string;
    container.appendChild(contentDiv);

    document.body.appendChild(container);

    try {
      // @ts-ignore
      if (!window.html2canvas) window.html2canvas = html2canvas;

      await pdf.html(container, {
        callback: (doc) => {
          doc.save('Optimized_Resume.pdf');
          if (document.body.contains(container)) {
            document.body.removeChild(container);
          }
          setIsGeneratingPdf(false);
        },
        x: margin,
        y: margin,
        width: contentWidth,
        windowWidth: 800,
        autoPaging: 'text',
        margin: [margin, margin, margin, margin]
      });
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Could not generate PDF. Please try again or copy the text.");
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      setIsGeneratingPdf(false);
    }
  };

  // --- Screens ---

  const renderLanding = () => (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-16">
      <div className="text-center mb-8 md:mb-16">
        <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-2xl mb-4 md:mb-6 shadow-sm">
          <Zap className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-3 md:mb-6 leading-tight">
          Pass the ATS. <span className="text-blue-600 block sm:inline">Get the Interview.</span>
        </h1>
        <p className="text-sm md:text-xl text-slate-600 max-w-2xl mx-auto px-2">
          Senior HR AI analyzes your resume against job descriptions and <span className="font-bold text-slate-800">rewrites it instantly</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 bg-white p-5 md:p-8 rounded-2xl shadow-xl border border-slate-200">
        {/* Left: Inputs */}
        <div className="space-y-4 md:space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 md:mb-3">
              1. Upload Resume (PDF, DOCX, Image)
            </label>
            
            {/* Upload Area */}
            <div 
              className={`border-2 border-dashed rounded-xl p-6 md:p-8 text-center transition-all relative overflow-hidden group
                ${isParsing ? 'bg-slate-50 border-blue-300' : 
                  uploadedFile ? 'bg-blue-50 border-blue-200' : 'border-slate-300 hover:bg-slate-50 cursor-pointer hover:border-blue-400'
                }`}
              onClick={() => !isParsing && !uploadedFile && fileInputRef.current?.click()}
            >
              {isParsing ? (
                <div className="flex flex-col items-center justify-center py-4">
                  <Loader2 className="w-8 h-8 md:w-10 md:h-10 text-blue-500 animate-spin mb-3" />
                  <p className="text-sm font-medium text-slate-600">Processing file...</p>
                </div>
              ) : uploadedFile ? (
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <FileCheck className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm md:text-base break-all max-w-full px-4">{uploadedFile.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 uppercase font-medium">{uploadedFile.type.split('/')[1] || 'FILE'}</p>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); clearFile(); }}
                    className="mt-5 flex items-center text-xs md:text-sm text-red-600 hover:text-red-700 font-medium bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove File
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                     <Upload className="w-5 h-5 md:w-6 md:h-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <p className="text-sm text-slate-700 font-semibold mb-1">Click to upload Resume</p>
                  <p className="text-xs text-slate-400">PDF, DOCX, Images supported</p>
                </>
              )}
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".txt,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/jpg" 
                className="hidden" 
                onChange={handleFileUpload}
              />
            </div>

            {/* Manual Text Fallback */}
            {!uploadedFile && (
              <div className="relative mt-4 md:mt-6">
                 <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Or Paste Text</span>
                </div>
                <textarea 
                  className="w-full mt-3 md:mt-4 h-32 md:h-40 p-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs md:text-sm font-mono transition-shadow"
                  placeholder="Paste resume content here if you don't have a file..."
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  disabled={isParsing}
                ></textarea>
              </div>
            )}
          </div>
        </div>

        {/* Right: Job Description */}
        <div className="space-y-4 md:space-y-6 flex flex-col h-full">
          <div className="flex-grow">
            <label className="block text-sm font-semibold text-slate-700 mb-2 md:mb-3">
              2. Job Description (Optional)
            </label>
            <div className="h-[180px] sm:h-[250px] md:h-full min-h-[150px] relative">
              <textarea 
                className="w-full h-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs md:text-sm resize-none transition-shadow"
                placeholder="Paste the job description here for ATS keyword matching..."
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
              ></textarea>
            </div>
          </div>
          
          <button 
            onClick={handleAnalysis}
            disabled={(!resumeText && !uploadedFile) || loadingState === LoadingState.ANALYZING || isParsing}
            className={`w-full py-4 md:py-5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center space-x-2 text-sm md:text-base
              ${(!resumeText && !uploadedFile) ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/25 active:scale-[0.98]'}
            `}
          >
            {loadingState === LoadingState.ANALYZING ? (
               <>
                 <RefreshCw className="w-5 h-5 animate-spin" />
                 <span>Analyzing...</span>
               </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                <span>Rewrite My Resume</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
      {/* Dashboard Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 md:mb-10 gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Analysis Report</h2>
          <p className="text-sm md:text-base text-slate-500 mt-1">Reviewing: <span className="font-semibold text-slate-700">{uploadedFile?.name || "Text Upload"}</span></p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={exportReportJson}
              className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
            >
              <FileJson className="w-4 h-4 mr-2" />
              JSON
            </button>
            <button 
              onClick={exportReportTxt}
              className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              TXT
            </button>
          </div>

          <button 
            onClick={() => { setActiveTab('upload'); setResumeText(''); setUploadedFile(null); setJobDesc(''); }} 
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition-all"
          >
            Start New Analysis
          </button>
        </div>
      </div>

      {/* Tabs - Scrollable on mobile */}
      <div className="bg-slate-200/50 p-1.5 rounded-xl mb-6 md:mb-8 flex overflow-x-auto no-scrollbar snap-x">
        <button
          onClick={() => setDashboardView('analysis')}
          className={`snap-start flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap mr-2 ${
            dashboardView === 'analysis' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Analysis Report
        </button>
        <button
          onClick={() => setDashboardView('resume')}
          className={`snap-start flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap mr-2 flex items-center ${
            dashboardView === 'resume' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Rewritten Resume
        </button>
        <button
          onClick={() => setDashboardView('cover-letter')}
          className={`snap-start flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex items-center ${
            dashboardView === 'cover-letter' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Mail className="w-4 h-4 mr-2" />
          Cover Letter
        </button>
      </div>

      {dashboardView === 'resume' ? (
        // --- RESUME VIEW ---
        <div className="animate-fadeIn pb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h3 className="text-xl font-bold text-slate-800">Final Optimized Resume</h3>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button 
                onClick={() => navigator.clipboard.writeText(result.optimizedResumeMarkdown)}
                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors"
              >
                <Copy className="w-4 h-4 mr-2" /> Copy
              </button>
              <button 
                onClick={downloadResumeAsPdf}
                disabled={isGeneratingPdf}
                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors shadow-sm disabled:opacity-70 disabled:cursor-wait"
              >
                {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                {isGeneratingPdf ? "..." : "PDF"}
              </button>
            </div>
          </div>
          {/* Responsive preview container with horizontal scroll for complex content */}
          <div className="bg-white border border-slate-200 p-4 sm:p-8 md:p-12 rounded-xl shadow-sm min-h-[600px] text-slate-800 resume-preview overflow-x-auto">
             {result.optimizedResumeMarkdown ? (
               <div 
                 className="prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-center prose-h1:text-2xl prose-h2:text-blue-600 prose-h2:uppercase prose-h2:border-b prose-h2:pb-2 prose-li:marker:text-slate-400 min-w-[300px] sm:min-w-full"
                 dangerouslySetInnerHTML={{ __html: marked.parse(result.optimizedResumeMarkdown) as string }} 
               />
             ) : (
               <div className="flex items-center justify-center h-full text-slate-400">
                 Generating optimized resume...
               </div>
             )}
          </div>
        </div>
      ) : dashboardView === 'cover-letter' ? (
        // --- COVER LETTER VIEW ---
        <div className="animate-fadeIn pb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h3 className="text-xl font-bold text-slate-800">Tailored Cover Letter</h3>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button 
                onClick={() => navigator.clipboard.writeText(result.coverLetter)}
                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors"
              >
                <Copy className="w-4 h-4 mr-2" /> Copy
              </button>
              <button 
                onClick={downloadCoverLetterAsPdf}
                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" /> PDF
              </button>
            </div>
          </div>
          <div className="bg-white border border-slate-200 p-6 sm:p-12 rounded-xl shadow-sm min-h-[500px] font-serif text-base leading-relaxed text-slate-900 whitespace-pre-wrap max-w-3xl mx-auto">
            {result.coverLetter || "Generating tailored cover letter..."}
          </div>
        </div>
      ) : (
        // --- ANALYSIS VIEW ---
        <div className="animate-fadeIn pb-12">
          {/* Top Level Scores - Stacks on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className="md:col-span-1 h-full">
               <ScoreGauge score={result.overallScore} label="Overall Match" />
            </div>
            <div className="md:col-span-1 lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4 h-full">
              <FeatureCard 
                icon={<Zap />} color="bg-blue-500 text-blue-600"
                title="Impact Score" 
                value={result.scores.impact} 
                description="Quantifiable achievements" 
              />
              <FeatureCard 
                icon={<FileText />} color="bg-indigo-500 text-indigo-600"
                title="ATS Keywords" 
                value={result.scores.keywords} 
                description="Match with Job Description" 
              />
              <FeatureCard 
                icon={<Layout />} color="bg-emerald-500 text-emerald-600"
                title="Formatting" 
                value={result.scores.style} 
                description="Readability & Structure" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Left Column: Detailed Breakdown */}
            <div className="lg:col-span-2 space-y-4">
              
              <AccordionItem
                title="Structure & Weak Section Detector"
                isOpen={expandedSection === 'sections'}
                onClick={() => setExpandedSection(expandedSection === 'sections' ? null : 'sections')}
              >
                <div className="space-y-4">
                  {result.sectionAnalysis.map((section, idx) => (
                    <div key={idx} className="flex items-start space-x-3 sm:space-x-4 p-3 rounded-lg border border-slate-100 bg-white">
                      <div className={`mt-1 p-1 rounded-full shrink-0 ${
                        section.status === 'Good' ? 'bg-green-100 text-green-600' : 
                        section.status === 'Missing' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {section.status === 'Good' ? <CheckCircle className="w-5 h-5" /> : 
                        section.status === 'Missing' ? <XCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-semibold text-slate-800 text-sm">{section.name}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                            section.status === 'Good' ? 'bg-green-50 text-green-700' : 
                            section.status === 'Missing' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {section.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{section.feedback}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionItem>

              <AccordionItem 
                title="AI Powered Summary Generator" 
                isOpen={expandedSection === 'summary'} 
                onClick={() => setExpandedSection(expandedSection === 'summary' ? null : 'summary')}
              >
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg border-l-4 border-slate-300 italic text-slate-700 text-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1 not-italic">Original Summary</p>
                    "{result.summary}"
                  </div>
                  <div className="bg-white border border-blue-100 p-4 rounded-lg shadow-sm">
                    <h4 className="font-semibold text-slate-900 mb-2 flex items-center text-sm">
                      <Sparkles className="w-4 h-4 text-blue-500 mr-2" /> AI Optimized Version
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed mb-3">
                      {result.professionalSummaryRewrite}
                    </p>
                    <button 
                      onClick={() => navigator.clipboard.writeText(result.professionalSummaryRewrite)}
                      className="text-xs flex items-center text-blue-600 font-medium hover:text-blue-700 p-1 -ml-1"
                    >
                      <Copy className="w-3 h-3 mr-1" /> Copy Summary
                    </button>
                  </div>
                </div>
              </AccordionItem>

              <AccordionItem 
                title="STAR Method Rewriter" 
                isOpen={expandedSection === 'star'} 
                onClick={() => setExpandedSection(expandedSection === 'star' ? null : 'star')}
                score={result.scores.impact}
              >
                <div className="space-y-6">
                  <p className="text-sm text-slate-500">
                    We identified the weakest bullet points and rewrote them using the 
                    <strong className="text-slate-700"> Situation, Task, Action, Result (STAR)</strong> methodology.
                  </p>
                  {result.starRewrites.map((item, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                      <div className="mb-3">
                        <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Weak Original</span>
                        <p className="text-sm text-slate-500 line-through mt-1 bg-red-50/50 p-2 rounded">{item.original}</p>
                        <p className="text-xs text-slate-400 mt-1 italic">Problem: {item.reason}</p>
                      </div>
                      <div className="mt-2 pt-3 border-t border-slate-100">
                        <span className="text-xs font-bold text-green-600 uppercase tracking-wide">HR Optimized (STAR)</span>
                        <p className="text-sm text-slate-800 font-medium mt-1 bg-green-50/50 p-2 rounded">{item.improved}</p>
                      </div>
                    </div>
                  ))}
                  {result.starRewrites.length === 0 && <p className="text-sm text-slate-500">Excellent job! Your bullet points are strong and action-oriented.</p>}
                </div>
              </AccordionItem>

              <AccordionItem 
                title="ATS Keyword Analysis" 
                isOpen={expandedSection === 'keywords'} 
                onClick={() => setExpandedSection(expandedSection === 'keywords' ? null : 'keywords')}
                score={result.scores.keywords}
              >
                <div className="mb-6">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Critical Missing Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.atsKeywords.missing.length > 0 ? (
                        result.atsKeywords.missing.map((k, i) => (
                          <span key={i} className="px-3 py-1 bg-red-50 text-red-700 text-xs sm:text-sm font-medium rounded-md border border-red-100 flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> {k}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-green-600 flex items-center"><Check className="w-4 h-4 mr-2" /> All critical keywords found!</span>
                      )}
                    </div>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Matched Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.atsKeywords.matched.map((k, i) => (
                        <span key={i} className="px-3 py-1 bg-green-50 text-green-700 text-xs sm:text-sm font-medium rounded-md border border-green-100 flex items-center">
                        <Check className="w-3 h-3 mr-1" /> {k}
                      </span>
                      ))}
                    </div>
                </div>
              </AccordionItem>

              <AccordionItem
                title="Missing Skill Suggestions"
                isOpen={expandedSection === 'skills'}
                onClick={() => setExpandedSection(expandedSection === 'skills' ? null : 'skills')}
              >
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                    <p className="text-sm text-slate-700">
                      <strong className="font-semibold">Why this matters:</strong> ATS algorithms scan for these specific keywords.
                    </p>
                  </div>
                  
                  {/* Hard Skills */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide flex items-center">
                      <Zap className="w-4 h-4 mr-2 text-blue-500" /> Critical Tech & Hard Skills
                    </h4>
                    <div className="flex flex-wrap">
                      {result.hardSkills.filter(s => !s.found).length > 0 ? (
                        result.hardSkills.filter(s => !s.found).map((s, i) => (
                          <SkillTag key={`hard-${i}`} name={s.skill} found={false} importance={s.importance} />
                        ))
                      ) : (
                        <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-100 w-full">
                          <CheckCircle className="w-4 h-4 mr-2" /> All critical hard skills found!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Soft Skills */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide flex items-center">
                      <Lightbulb className="w-4 h-4 mr-2 text-amber-500" /> Recommended Soft Skills
                    </h4>
                    <div className="flex flex-wrap">
                      {result.softSkills.filter(s => !s.found).length > 0 ? (
                        result.softSkills.filter(s => !s.found).map((s, i) => (
                          <SkillTag key={`soft-${i}`} name={s.skill} found={false} importance={s.importance} />
                        ))
                      ) : (
                        <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-100 w-full">
                          <CheckCircle className="w-4 h-4 mr-2" /> Strong soft skill profile detected!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </AccordionItem>

              <AccordionItem 
                title="Formatting & Content Check" 
                isOpen={expandedSection === 'grammar'} 
                onClick={() => setExpandedSection(expandedSection === 'grammar' ? null : 'grammar')}
                score={Math.round((result.scores.style + result.scores.brevity)/2)}
              >
                <div className="space-y-6">
                  {/* Formatting Issues */}
                  <div className="bg-white border border-amber-100 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-800 mb-3 flex items-center text-sm">
                      <Layout className="w-4 h-4 mr-2 text-amber-500" /> ATS Formatting Checks
                    </h4>
                    <ul className="space-y-2">
                      {result.formattingIssues.length > 0 ? result.formattingIssues.map((issue, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start">
                          <AlertTriangle className="w-4 h-4 text-amber-500 mr-2 mt-0.5 shrink-0" />
                          {issue}
                        </li>
                      )) : <li className="text-sm text-green-600 flex items-center"><CheckCircle className="w-4 h-4 mr-2"/>Clean formatting detected.</li>}
                    </ul>
                  </div>

                  {/* Duplicate Content */}
                  {result.duplicateContent.length > 0 && (
                    <div className="bg-white border border-red-100 rounded-lg p-4">
                      <h4 className="font-semibold text-slate-800 mb-3 flex items-center text-sm">
                        <Repeat className="w-4 h-4 mr-2 text-red-500" /> Redundancy & Duplicate Content
                      </h4>
                      <p className="text-xs text-slate-500 mb-2">Repeated phrases or bullet points waste space.</p>
                      <ul className="space-y-2">
                        {result.duplicateContent.map((dup, i) => (
                          <li key={i} className="text-sm text-slate-600 flex items-start bg-red-50 p-2 rounded">
                            <XCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 shrink-0" />
                            "{dup}"
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Grammar */}
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2 text-sm">Grammar & Tone</h4>
                    <ul className="space-y-2">
                      {result.grammarIssues.length > 0 ? result.grammarIssues.map((issue, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start">
                          <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5 shrink-0" />
                          {issue}
                        </li>
                      )) : <li className="text-sm text-green-600 flex items-center"><CheckCircle className="w-4 h-4 mr-2"/>Professional tone detected.</li>}
                    </ul>
                  </div>
                </div>
              </AccordionItem>

            </div>

            {/* Right Column: Skills & Actions */}
            <div className="space-y-6 lg:space-y-8">
              
              {/* Skills Suggestions Section */}
              <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-red-200">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center text-red-700">
                  <Lightbulb className="w-5 h-5 mr-2" /> Suggested Skills
                </h3>
                
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Technical / Hard Skills</h4>
                  <div className="flex flex-wrap">
                    {result.hardSkills.filter(s => !s.found).length > 0 ? (
                      result.hardSkills.filter(s => !s.found).slice(0, 5).map((s, i) => (
                        <SkillTag key={`hard-${i}`} name={s.skill} found={false} importance={s.importance} />
                      ))
                    ) : <span className="text-xs text-slate-400 italic">No specific hard skill suggestions.</span>}
                    {result.hardSkills.filter(s => !s.found).length > 5 && (
                      <span className="text-xs text-slate-400 mt-2 block">See "Missing Skills" section for more...</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Soft / Interpersonal Skills</h4>
                  <div className="flex flex-wrap">
                    {result.softSkills.filter(s => !s.found).length > 0 ? (
                      result.softSkills.filter(s => !s.found).slice(0, 5).map((s, i) => (
                        <SkillTag key={`soft-${i}`} name={s.skill} found={false} importance={s.importance} />
                      ))
                    ) : <span className="text-xs text-slate-400 italic">No specific soft skill suggestions.</span>}
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center text-emerald-700">
                  <CheckCircle className="w-5 h-5 mr-2" /> Matched Skills
                </h3>
                <div className="flex flex-wrap">
                  {result.hardSkills.filter(s => s.found).map((s, i) => (
                    <SkillTag key={i} name={s.skill} found={true} importance={s.importance} />
                  ))}
                  {result.softSkills.filter(s => s.found).map((s, i) => (
                    <SkillTag key={i} name={s.skill} found={true} importance={s.importance} />
                  ))}
                  {result.hardSkills.filter(s => s.found).length === 0 && result.softSkills.filter(s => s.found).length === 0 && (
                    <p className="text-sm text-slate-500 italic">No specific skills matched yet.</p>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-xl shadow-lg">
                <h3 className="font-bold text-lg mb-2">Ready to apply?</h3>
                <p className="text-slate-300 text-sm mb-4">
                  Use the suggestions to update your document. Ensure your overall score is at least 85 before submitting.
                </p>
                <button onClick={() => window.print()} className="w-full py-3 bg-white text-slate-900 rounded-lg font-semibold text-sm hover:bg-slate-100 transition-colors">
                  Print Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ResumeModal 
        isOpen={showResumeModal} 
        onClose={() => setShowResumeModal(false)} 
        markdown={result.optimizedResumeMarkdown} 
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
               <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg md:text-xl tracking-tight">TalentScout<span className="text-blue-600">AI</span></span>
          </div>
          <div className="text-xs md:text-sm text-slate-500 font-medium hidden sm:block">
             Senior HR Simulator v1.0
          </div>
          <div className="sm:hidden text-[10px] font-bold text-slate-400 border border-slate-200 rounded px-2 py-0.5">
             v1.0
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {loadingState === LoadingState.ERROR && (
           <div className="max-w-4xl mx-auto mt-6 px-4">
             <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center shadow-sm">
               <AlertTriangle className="w-5 h-5 mr-3 shrink-0" />
               Analysis failed. Please try again with different text or file.
             </div>
           </div>
        )}
        
        {activeTab === 'upload' ? renderLanding() : renderDashboard()}
      </main>
    </div>
  );
}