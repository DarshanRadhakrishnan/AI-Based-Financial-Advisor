import { useRef, useState } from 'react';
import { Upload, CheckCircle, FileText, AlertCircle } from 'lucide-react';
import { UserData, fakeProfiles } from './data';
import toast from 'react-hot-toast';

const FileUploadBox = ({ title, description, uploadedFile, onFile }: { title: string, description: string, uploadedFile: File | null, onFile: (f: File) => void }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  if (uploadedFile) {
    return (
      <div className="glass flex flex-col items-center justify-center rounded-xl p-6 text-center border border-green-500/30 h-full relative overflow-hidden bg-green-500/5">
        <div className="absolute top-3 right-3 text-green-400">
          <CheckCircle className="w-5 h-5" />
        </div>
        <FileText className="w-8 h-8 text-green-400 mx-auto mb-3" />
        <h4 className="font-semibold text-white text-sm mb-1">{title}</h4>
        <p className="text-xs text-slate-300 truncate w-full px-4">{uploadedFile.name}</p>
        <button 
          onClick={() => fileRef.current?.click()}
          className="mt-4 text-[10px] text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          Replace file
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />
      </div>
    );
  }

  return (
    <div
      className={`upload-zone rounded-xl p-6 text-center cursor-pointer h-full flex flex-col justify-center ${dragOver ? 'drag-over' : ''}`}
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); }}
    >
      <Upload className="w-8 h-8 text-slate-500 mx-auto mb-3" />
      <h4 className="font-semibold text-white text-sm mb-1">{title}</h4>
      <p className="text-xs text-slate-400 mb-4">{description}</p>
      <p className="text-[10px] text-slate-500 mt-auto pt-3 border-t border-white/5">Supports .pdf, .doc, .docx</p>
      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />
    </div>
  );
};

export default function DocumentsSection({ setData, onAnalysisComplete }: { setData: (d: UserData) => void, onAnalysisComplete: () => void }) {
  const [docs, setDocs] = useState<{ bank: File | null, portfolio: File | null, tax: File | null }>({
    bank: null,
    portfolio: null,
    tax: null
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleValidFile = (file: File, type: 'bank' | 'portfolio' | 'tax') => {
    const validExts = ['.pdf', '.doc', '.docx'];
    if (validExts.some(ext => file.name.toLowerCase().endsWith(ext))) {
      setDocs(prev => ({ ...prev, [type]: file }));
      toast.success(`${file.name} uploaded successfully.`);
    } else {
      toast.error('Invalid file format — please upload a PDF or DOC file');
    }
  };

  const triggerAnalysis = () => {
    if (!docs.bank || !docs.portfolio || !docs.tax) return;
    
    setIsAnalyzing(true);
    toast.success('All documents provided! Starting analysis...');
    
    // Fake parsing logic based on all 3 filenames
    const combinedLength = docs.bank.name.length + docs.portfolio.name.length + docs.tax.name.length;
    const profileIndex = combinedLength % 3;
    
    setTimeout(() => {
      setData(fakeProfiles[profileIndex]);
      setIsAnalyzing(false);
      toast.success('Analysis Complete! Dashboard populated.');
      onAnalysisComplete();
    }, 2000);
  };

  const allUploaded = docs.bank && docs.portfolio && docs.tax;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Document Center</h3>
        <p className="text-sm text-slate-400 mb-6">
          Please upload your financial documents securely. Analysis will begin automatically once all three categories are provided.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-56 mb-8">
          <FileUploadBox 
            title="Bank Statements" 
            description="Upload your recent bank statements"
            uploadedFile={docs.bank}
            onFile={(f) => handleValidFile(f, 'bank')} 
          />
          <FileUploadBox 
            title="Portfolio Documents" 
            description="Upload mutual fund or demat statements"
            uploadedFile={docs.portfolio}
            onFile={(f) => handleValidFile(f, 'portfolio')} 
          />
          <FileUploadBox 
            title="Tax / Income Proofs" 
            description="Upload Form 16 or salary slips"
            uploadedFile={docs.tax}
            onFile={(f) => handleValidFile(f, 'tax')} 
          />
        </div>

        <div className="flex flex-col items-center justify-center p-6 border-t border-white/10">
          {!allUploaded ? (
            <div className="flex items-center gap-2 text-orange-400 bg-orange-500/10 px-4 py-2 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Please upload all 3 documents to enable AI analysis.</span>
            </div>
          ) : (
            <button
              onClick={triggerAnalysis}
              disabled={isAnalyzing}
              className={`px-8 py-3 rounded-lg font-medium text-white shadow-lg transition-all ${
                isAnalyzing 
                  ? 'bg-orange-500/50 cursor-not-allowed animate-pulse' 
                  : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 cursor-pointer hover:shadow-orange-500/25'
              }`}
            >
              {isAnalyzing ? 'Analyzing Documents...' : 'Start AI Analysis'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
