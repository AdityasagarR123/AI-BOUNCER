'use client';

import { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, HelpCircle, Loader2, AlertTriangle, Search, Zap, Database, Brain, Lock, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ScanResult = {
  label: string;
  confidence: number;
  details: string;
  reasons: string[];
  signals: {
    blacklist?: boolean;
    decoded_b64?: string | null;
    zeroday_hit?: boolean;
    zeroday_sim?: number;
    zeroday_match?: string | null;
    ml_prob?: number;
    is_whitelisted?: boolean;
    persona_override?: boolean;
    base64_detected?: boolean;
    text_entropy?: number;
    text_length?: number;
    perplexity_skipped?: boolean;
  };
  vibeCheckNeeded?: boolean;
};

export default function ScannerPage() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<null | ScanResult>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error('Scan error:', error);
      setResult({
        label: 'ERROR',
        confidence: 0,
        details: 'Failed to connect to the Bouncer API.',
        reasons: [],
        signals: {},
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex bg-[#040404] min-h-screen text-white font-sans overflow-x-hidden selection:bg-accent selection:text-white pb-24">
      {/* Vertical Sidebar Text */}
      <div className="hidden lg:flex fixed left-0 top-0 h-full w-24 border-r border-[#222] flex-col items-center justify-end pb-12 z-50">
        <h1 className="text-[#333] uppercase tracking-[0.4em] font-black text-2xl -rotate-90 whitespace-nowrap transform origin-bottom">
          PLAT<span className="text-accent">—</span>FORM
        </h1>
      </div>

      <div className="w-full lg:ml-24 flex flex-col pt-32 px-6 md:px-12 lg:px-24">
        <div className="mb-12">
          <h2 className="text-4xl text-white font-light tracking-tight mb-2">Prompt Scanner</h2>
          <p className="text-[#888] max-w-sm text-sm">Real-time inference using the trained XGBoost + FAISS AI Bouncer model.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Area */}
          <div className="bg-[#0e0e0e] border border-[#222] rounded-xl p-8 flex flex-col justify-between">
            <form onSubmit={handleScan} className="flex flex-col h-full space-y-6">
              <div>
                <label htmlFor="prompt" className="flex items-center justify-between text-[#888] text-xs font-bold tracking-widest uppercase mb-4">
                  <span>Input Payload</span>
                  <span className="text-accent">Ready</span>
                </label>
                <textarea
                  id="prompt"
                  rows={8}
                  className="w-full bg-[#161616] border border-[#333] rounded-lg p-4 text-white placeholder-[#555] font-mono text-sm focus:outline-none focus:border-accent transition-all resize-none"
                  placeholder="> Enter instructions to bypass safety..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-[#222]">
                <button
                  type="submit"
                  disabled={isLoading || !prompt.trim()}
                  className="flex items-center justify-center gap-2 bg-accent text-black px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-[#ff7841] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scanning
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Execute Scan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Results Area */}
          <div className="bg-[#0e0e0e] border border-[#222] rounded-xl p-8 flex flex-col h-full min-h-[400px]">
             <div className="flex justify-between items-center mb-6 text-[#555]">
                <span className="font-mono text-sm uppercase tracking-widest">Inference Result</span>
             </div>

             <div className="flex-1 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {!result && !isLoading && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-center text-[#555] flex flex-col items-center"
                    >
                      <Shield className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm font-mono uppercase tracking-widest">Awaiting payload...</p>
                    </motion.div>
                  )}

                  {isLoading && (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-center text-accent flex flex-col items-center"
                    >
                      <Loader2 className="w-12 h-12 mb-4 animate-spin opacity-50" />
                      <p className="text-sm font-mono uppercase tracking-widest animate-pulse">Running model inference...</p>
                    </motion.div>
                  )}

                  {result && !isLoading && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full flex flex-col"
                    >
                      {/* Verdict Header */}
                      <div className="mb-6 flex items-end justify-between border-b border-[#222] pb-6">
                        <div>
                          <p className="text-[#888] text-xs font-bold tracking-widest uppercase mb-2">Verdict</p>
                          {result.label === 'SAFE' && (
                            <div className="flex items-center gap-3 text-emerald-400">
                              <ShieldCheck className="w-8 h-8" />
                              <span className="text-4xl font-light tracking-tight">SAFE</span>
                            </div>
                          )}
                          {result.label === 'MALICIOUS' && (
                            <div className="flex items-center gap-3 text-accent">
                              <ShieldAlert className="w-8 h-8" />
                              <span className="text-4xl font-light tracking-tight">BLOCKED</span>
                            </div>
                          )}
                          {result.label === 'GREY_ZONE' && (
                            <div className="flex items-center gap-3 text-orange-400">
                              <HelpCircle className="w-8 h-8" />
                              <span className="text-3xl font-light tracking-tight">VIBE CHECK</span>
                            </div>
                          )}
                          {result.label === 'ERROR' && (
                            <div className="flex items-center gap-3 text-red-400">
                              <AlertTriangle className="w-8 h-8" />
                              <span className="text-3xl font-light tracking-tight">ERROR</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[#888] text-xs font-bold tracking-widest uppercase mb-2">ML Score</p>
                          <span className="font-mono text-3xl font-light text-white">{(result.confidence * 100).toFixed(1)}%</span>
                        </div>
                      </div>

                      {/* Trigger Reasons */}
                      {result.reasons && result.reasons.length > 0 && (
                        <div className="mb-6">
                          <p className="text-[#888] text-xs font-bold tracking-widest uppercase mb-3">Triggered Signals</p>
                          <div className="flex flex-wrap gap-2">
                            {result.reasons.map((r, i) => (
                              <span key={i} className="bg-accent/10 text-accent border border-accent/20 px-3 py-1 rounded-full text-xs font-mono">
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Signal Breakdown Grid */}
                      {result.signals && Object.keys(result.signals).length > 0 && (
                        <div className="mb-6">
                          <p className="text-[#888] text-xs font-bold tracking-widest uppercase mb-3">Signal Breakdown</p>
                          <div className="grid grid-cols-2 gap-3">
                            {/* Blacklist */}
                            <div className={`p-3 rounded-lg border ${result.signals.blacklist ? 'bg-red-500/10 border-red-500/20' : 'bg-[#161616] border-[#333]'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <Lock className="w-3.5 h-3.5" />
                                <span className="text-[10px] uppercase tracking-widest font-bold text-[#888]">Blacklist</span>
                              </div>
                              <span className={`text-sm font-mono ${result.signals.blacklist ? 'text-red-400' : 'text-emerald-400'}`}>
                                {result.signals.blacklist ? '🚫 HIT' : '✅ CLEAR'}
                              </span>
                            </div>

                            {/* Zero-Day FAISS */}
                            <div className={`p-3 rounded-lg border ${result.signals.zeroday_hit ? 'bg-red-500/10 border-red-500/20' : 'bg-[#161616] border-[#333]'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <Database className="w-3.5 h-3.5" />
                                <span className="text-[10px] uppercase tracking-widest font-bold text-[#888]">Zero-Day FAISS</span>
                              </div>
                              <span className={`text-sm font-mono ${result.signals.zeroday_hit ? 'text-red-400' : 'text-emerald-400'}`}>
                                {result.signals.zeroday_hit ? `🚫 ${(result.signals.zeroday_sim! * 100).toFixed(0)}% match` : `✅ ${(result.signals.zeroday_sim! * 100).toFixed(0)}% sim`}
                              </span>
                            </div>

                            {/* ML Confidence */}
                            <div className={`p-3 rounded-lg border ${(result.signals.ml_prob ?? 0) > 0.5 ? 'bg-red-500/10 border-red-500/20' : 'bg-[#161616] border-[#333]'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <Brain className="w-3.5 h-3.5" />
                                <span className="text-[10px] uppercase tracking-widest font-bold text-[#888]">XGBoost ML</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-[#333] rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all ${(result.signals.ml_prob ?? 0) > 0.5 ? 'bg-red-400' : 'bg-emerald-400'}`}
                                    style={{ width: `${(result.signals.ml_prob ?? 0) * 100}%` }}
                                  />
                                </div>
                                <span className="text-sm font-mono text-white">{((result.signals.ml_prob ?? 0) * 100).toFixed(1)}%</span>
                              </div>
                            </div>

                            {/* Whitelist */}
                            <div className={`p-3 rounded-lg border ${result.signals.is_whitelisted ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-[#161616] border-[#333]'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <Unlock className="w-3.5 h-3.5" />
                                <span className="text-[10px] uppercase tracking-widest font-bold text-[#888]">Whitelist</span>
                              </div>
                              <span className={`text-sm font-mono ${result.signals.is_whitelisted ? 'text-emerald-400' : 'text-[#666]'}`}>
                                {result.signals.is_whitelisted ? '✅ MATCHED' : '— INACTIVE'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Feature Details */}
                      {result.signals && (
                        <div className="mb-4">
                          <p className="text-[#888] text-xs font-bold tracking-widest uppercase mb-3">Features Extracted</p>
                          <div className="bg-[#161616] p-3 rounded-lg border border-[#333] font-mono text-xs text-[#bbb] space-y-1">
                            <div className="flex justify-between"><span>Text Length</span><span className="text-white">{result.signals.text_length ?? '—'}</span></div>
                            <div className="flex justify-between"><span>Shannon Entropy</span><span className="text-white">{result.signals.text_entropy ?? '—'}</span></div>
                            <div className="flex justify-between"><span>Persona Override</span><span className={result.signals.persona_override ? 'text-red-400' : 'text-emerald-400'}>{result.signals.persona_override ? 'YES' : 'NO'}</span></div>
                            <div className="flex justify-between"><span>Base64 Payload</span><span className={result.signals.base64_detected ? 'text-red-400' : 'text-emerald-400'}>{result.signals.base64_detected ? 'YES' : 'NO'}</span></div>
                            {result.signals.decoded_b64 && (
                              <div className="flex justify-between"><span>Decoded B64</span><span className="text-red-400 truncate max-w-[200px]">{result.signals.decoded_b64}</span></div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Zero-Day Match Preview */}
                      {result.signals?.zeroday_match && (
                        <div className="mb-4">
                          <p className="text-[#888] text-xs font-bold tracking-widest uppercase mb-3">Closest Known Attack</p>
                          <p className="text-[#bbb] text-xs leading-relaxed bg-[#161616] p-3 rounded-lg border border-[#333] font-mono">
                            "{result.signals.zeroday_match}"
                          </p>
                        </div>
                      )}

                      {result.vibeCheckNeeded && (
                        <div className="mt-4 flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                          <HelpCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                          <p className="text-orange-400 text-xs leading-relaxed uppercase tracking-widest">
                            <span className="font-bold block mb-1">Human Review Required</span> 
                            Prompt routed to community jury.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
