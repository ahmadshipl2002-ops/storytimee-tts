
import React, { useState } from 'react';
import { 
  BookOpen, 
  Upload, 
  Play, 
  Settings, 
  Download, 
  CheckCircle, 
  Loader2, 
  ArrowRight,
  RefreshCcw,
  Volume2,
  FileAudio,
  Trash2
} from 'lucide-react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { ttsService } from './services/geminiService';
import { StoryPage, GeneratedAudio, TTSConfig, Emotion, Tone, Speed } from './types';

const EMOTIONS: Emotion[] = ['Calm', 'Happy', 'Sad', 'Shy', 'Gentle', 'Excited'];
const TONES: Tone[] = ['Soft', 'Warm', 'Friendly'];
const SPEEDS: Speed[] = ['Slow', 'Normal', 'Fast'];

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<StoryPage[]>([]);
  const [config, setConfig] = useState<TTSConfig>({
    emotion: 'Gentle',
    tone: 'Warm',
    speed: 'Normal'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<GeneratedAudio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const parseFile = async (selectedFile: File) => {
    try {
      const text = await selectedFile.text();
      const parts = text.split(/Page\s+\d+/i).filter(p => p.trim().length > 0);
      
      const newPages = parts.map((content, index) => ({
        id: index + 1,
        content: content.trim()
      }));

      setPages(newPages);
      setFile(selectedFile);
      setResults([]);
      setError(null);
    } catch (err) {
      setError("Failed to read the file. Please ensure it is a valid text file.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseFile(e.target.files[0]);
    }
  };

  const generateAll = async () => {
    if (pages.length === 0) return;
    
    setIsProcessing(true);
    setResults([]);
    setProgress({ current: 0, total: pages.length });

    try {
      for (const page of pages) {
        const blob = await ttsService.generateSpeech(page.content, config);
        const url = URL.createObjectURL(blob);
        const newResult: GeneratedAudio = {
          pageId: page.id,
          blob,
          url,
          filename: `Page_${page.id}.wav`
        };
        
        // Update results incrementally so UI shows each clip as it's ready
        setResults(prev => [...prev, newResult]);
        setProgress(prev => ({ ...prev, current: prev.current + 1 }));
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during audio generation.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const previewSample = async () => {
    if (pages.length === 0) return;
    try {
      const sampleText = pages[0].content.slice(0, 100);
      const blob = await ttsService.generateSpeech(sampleText, config);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
    } catch (err) {
      setError("Failed to preview audio.");
    }
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    results.forEach(res => {
      zip.file(res.filename, res.blob);
    });
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'Story_Audio_Pack.zip');
  };

  const reset = () => {
    setFile(null);
    setPages([]);
    setResults([]);
    setError(null);
    setProgress({ current: 0, total: 0 });
  };

  const isComplete = results.length > 0 && results.length === pages.length && !isProcessing;

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12">
      <header className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-slate-800 mb-2">StoryTime TTS</h1>
        <p className="text-lg text-slate-500">Transform children's stories into magical audio experiences</p>
      </header>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center justify-between">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-4 font-bold">✕</button>
        </div>
      )}

      <div className="space-y-8">
        {!file && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-dashed border-slate-200 transition-all hover:border-indigo-300">
            <div className="flex flex-col items-center py-10">
              <Upload className="w-12 h-12 text-slate-400 mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">Upload your Story File</h3>
              <p className="text-slate-500 mb-6 text-center max-w-sm">
                Select a .txt file. Use "Page 1", "Page 2" as markers to split your story.
              </p>
              <label className="cursor-pointer bg-indigo-600 text-white px-8 py-3 rounded-full font-medium hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100 flex items-center gap-2">
                <input type="file" accept=".txt" onChange={handleFileChange} className="hidden" />
                Select File
              </label>
            </div>
          </div>
        )}

        {file && pages.length > 0 && results.length === 0 && !isProcessing && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-6 font-semibold text-slate-700 border-b pb-4">
                  <Settings className="w-5 h-5" />
                  Voice Controls
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Emotion</label>
                    <select 
                      value={config.emotion}
                      onChange={(e) => setConfig({...config, emotion: e.target.value as Emotion})}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Tone</label>
                    <select 
                      value={config.tone}
                      onChange={(e) => setConfig({...config, tone: e.target.value as Tone})}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Speech Speed</label>
                    <div className="grid grid-cols-3 gap-2">
                      {SPEEDS.map(s => (
                        <button
                          key={s}
                          onClick={() => setConfig({...config, speed: s})}
                          className={`py-2 text-xs rounded-lg transition-all ${
                            config.speed === s 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={previewSample}
                    className="w-full py-3 border-2 border-indigo-600 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Volume2 className="w-4 h-4" />
                    Preview Voice
                  </button>
                </div>
              </div>
              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 text-amber-800 text-sm">
                <p className="font-semibold mb-1">Voice Profile</p>
                <p>Using <strong>Puck</strong>, a friendly and natural male voice optimized for warm storytelling.</p>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <FileAudio className="w-5 h-5 text-indigo-500" />
                    Story Segments ({pages.length} Pages)
                  </h3>
                  <button onClick={reset} className="text-slate-400 hover:text-red-500">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {pages.map((page) => (
                    <div key={page.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                      <span className="absolute -top-2 -left-2 bg-indigo-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">
                        PAGE {page.id}
                      </span>
                      <p className="text-slate-600 text-sm italic line-clamp-3">"{page.content}"</p>
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t">
                  <button 
                    onClick={generateAll}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-bold text-lg flex items-center justify-center gap-2"
                  >
                    Generate All Pages
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {(isProcessing || results.length > 0) && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {isProcessing && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <h2 className="text-xl font-bold text-slate-800">Generating Narration...</h2>
                </div>
                <p className="text-slate-500 mb-6">Processing Page {progress.current + 1} of {progress.total}</p>
                <div className="max-w-md mx-auto h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {results.length > 0 && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                      {isComplete ? (
                        <CheckCircle className="w-7 h-7 text-emerald-500" />
                      ) : (
                        <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                        </div>
                      )}
                      {isComplete ? "Generation Complete!" : "Audio Clips Ready"}
                    </h2>
                    <p className="text-slate-500">
                      {isComplete ? "All pages have been narrated." : `Generated ${results.length} of ${pages.length} clips...`}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    {isComplete && (
                      <button 
                        onClick={downloadAll}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md shadow-indigo-100"
                      >
                        <Download className="w-5 h-5" />
                        Download All (.ZIP)
                      </button>
                    )}
                    <button 
                      onClick={reset}
                      className="px-6 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                      <RefreshCcw className="w-5 h-5" />
                      {isComplete ? "Start New" : "Reset"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.map((res) => (
                    <div key={res.pageId} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                          {res.pageId}
                        </div>
                        <span className="font-semibold text-slate-700">{res.filename}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            const a = new Audio(res.url);
                            a.play();
                          }}
                          className="p-2 hover:bg-white rounded-lg text-indigo-600 transition-all"
                          title="Preview"
                        >
                          <Play className="w-5 h-5 fill-current" />
                        </button>
                        <a 
                          href={res.url} 
                          download={res.filename}
                          className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 transition-all"
                          title="Download"
                        >
                          <Download className="w-5 h-5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="mt-16 text-center text-slate-400 text-sm">
        <p>&copy; 2024 StoryTime TTS. Powered by Gemini AI.</p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-bottom-2 {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in {
          animation: fade-in 0.3s ease-out;
        }
        .slide-in-from-bottom-2 {
          animation: slide-in-from-bottom-2 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default App;
