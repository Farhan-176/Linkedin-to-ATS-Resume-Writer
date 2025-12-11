import React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { ChevronRight, CheckCircle, PlusCircle, Copy, Download, X } from 'lucide-react';

// --- Score Gauge ---
interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: number; // Kept for backwards compatibility but handled responsively
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, label }) => {
  const data = [{ name: 'score', value: score, fill: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444' }];
  
  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-slate-100 h-full w-full">
      <div className="relative w-full aspect-square max-h-[160px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="70%" outerRadius="100%" barSize={10} data={data} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background dataKey="value" cornerRadius={30 / 2} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl sm:text-4xl font-bold text-slate-800">{score}</span>
          <span className="text-xs text-slate-500 uppercase tracking-wide">/ 100</span>
        </div>
      </div>
      <h3 className="mt-2 sm:mt-4 text-sm font-semibold text-slate-600 text-center">{label}</h3>
    </div>
  );
};

// --- Feature Card ---
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  description: string;
  color: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, value, description, color }) => (
  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-100 shadow-sm flex items-start space-x-3 sm:space-x-4 h-full transition-shadow hover:shadow-md">
    <div className={`p-2 sm:p-3 rounded-lg ${color} bg-opacity-10 text-white shrink-0`}>
      {React.cloneElement(icon as React.ReactElement<any>, { className: `w-5 h-5 sm:w-6 sm:h-6 text-current` })}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">{title}</p>
      <h4 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">{value}</h4>
      <p className="text-xs text-slate-400 mt-1 leading-tight line-clamp-2">{description}</p>
    </div>
  </div>
);

// --- Accordion Item ---
interface AccordionItemProps {
  title: string;
  isOpen: boolean;
  onClick: () => void;
  children: React.ReactNode;
  score?: number;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({ title, isOpen, onClick, children, score }) => (
  <div className="border border-slate-200 rounded-lg mb-4 overflow-hidden bg-white shadow-sm">
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 sm:p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left active:bg-slate-200"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-wrap pr-2">
        <span className="font-semibold text-slate-800 text-sm sm:text-base">{title}</span>
        {score !== undefined && (
          <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full w-fit ${score > 70 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            Score: {score}
          </span>
        )}
      </div>
      <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
    </button>
    {isOpen && (
      <div className="p-3 sm:p-5 border-t border-slate-200 animate-fadeIn">
        {children}
      </div>
    )}
  </div>
);

// --- Skill Tag ---
export const SkillTag: React.FC<{ name: string; found: boolean; importance: string }> = ({ name, found, importance }) => (
  <div className={`
    inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium border mr-2 mb-2 transition-all max-w-full
    ${found 
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}
  `}>
    {found ? <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5 shrink-0" /> : <PlusCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5 shrink-0" />}
    <span className="truncate">{name}</span>
    <span className="ml-2 opacity-60 text-[10px] uppercase shrink-0">({importance})</span>
  </div>
);

// --- Resume Modal ---
interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdown: string;
}

export const ResumeModal: React.FC<ResumeModalProps> = ({ isOpen, onClose, markdown }) => {
  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    alert('Resume copied to clipboard!');
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([markdown], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = "Optimized_Resume.md";
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 md:p-4">
      {/* Modal Container: Full screen on mobile (rounded-top only), bounded on desktop */}
      <div className="bg-white w-full h-[95vh] md:h-[85vh] md:max-w-5xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideUp md:animate-fadeInScale rounded-t-2xl">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center">
              ATS-Optimized Resume
            </h2>
            <p className="text-xs text-slate-500 hidden sm:block">Rewritten for maximum impact.</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content Area */}
        <div className="flex-grow p-0 md:p-6 overflow-y-auto bg-slate-50">
          <div className="bg-white border-y md:border border-slate-200 p-4 sm:p-8 md:p-10 md:rounded-xl shadow-sm min-h-full font-mono text-xs sm:text-sm leading-relaxed text-slate-800 whitespace-pre-wrap max-w-4xl mx-auto">
            {markdown || "Generating optimized resume..."}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row justify-end gap-3 shrink-0 pb-6 md:pb-5">
          <button 
            onClick={handleCopy}
            className="flex items-center justify-center px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold transition-colors w-full sm:w-auto text-sm sm:text-base"
          >
            <Copy className="w-5 h-5 mr-2" /> Copy Text
          </button>
          <button 
            onClick={handleDownload}
            className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold transition-colors shadow-lg shadow-blue-500/20 w-full sm:w-auto text-sm sm:text-base"
          >
            <Download className="w-5 h-5 mr-2" /> Download MD
          </button>
        </div>
      </div>
    </div>
  );
}