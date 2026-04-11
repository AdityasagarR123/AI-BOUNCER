'use client';

import { useState, useEffect } from 'react';
import { Target, Sword, Trophy, AlertTriangle, Shield, ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type AttackResult = {
  label: string;
  confidence: number;
  details: string;
  reasons: string[];
  signals: Record<string, any>;
  vibeCheckNeeded?: boolean;
};

type LeaderboardEntry = {
  username: string;
  score: number;
  badges: string[];
  attacks: number;
  bypasses: number;
};

export default function RedTeamPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [prompt, setPrompt] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attackResult, setAttackResult] = useState<AttackResult | null>(null);

  // Load leaderboard from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('bouncer_leaderboard');
    if (saved) {
      setLeaderboard(JSON.parse(saved));
    } else {
      // Default leaderboard
      setLeaderboard([
        { username: 'root_override', score: 9400, badges: ['elite', 'founder'], attacks: 42, bypasses: 3 },
        { username: 'prompt_ninja', score: 8250, badges: ['bounty_hunter'], attacks: 38, bypasses: 2 },
        { username: 'sys_admin_99', score: 7100, badges: ['defender'], attacks: 25, bypasses: 1 },
      ]);
    }
    const savedUser = localStorage.getItem('bouncer_username');
    if (savedUser) setUsername(savedUser);
  }, []);

  const saveLeaderboard = (lb: LeaderboardEntry[]) => {
    setLeaderboard(lb);
    localStorage.setItem('bouncer_leaderboard', JSON.stringify(lb));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt || !username) return;

    setIsLoading(true);
    setAttackResult(null);
    localStorage.setItem('bouncer_username', username);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      setAttackResult(data);

      // Update leaderboard
      const isBypassed = data.label === 'SAFE';
      const pointsEarned = isBypassed ? 500 : 50; // You get points for trying, big bonus for bypass

      const existing = leaderboard.find(u => u.username === username);
      let newLb;
      if (existing) {
        newLb = leaderboard.map(u => 
          u.username === username 
            ? { ...u, score: u.score + pointsEarned, attacks: u.attacks + 1, bypasses: u.bypasses + (isBypassed ? 1 : 0) }
            : u
        );
      } else {
        newLb = [...leaderboard, { 
          username, 
          score: pointsEarned, 
          badges: [], 
          attacks: 1, 
          bypasses: isBypassed ? 1 : 0 
        }];
      }
      newLb.sort((a, b) => b.score - a.score);
      saveLeaderboard(newLb);

    } catch (error) {
      console.error('Attack error:', error);
      setAttackResult({
        label: 'ERROR',
        confidence: 0,
        details: 'Failed to reach the Bouncer. Is the backend running?',
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
          <h2 className="text-4xl text-white font-light tracking-tight mb-2">Red Team Arsenal</h2>
          <p className="text-[#888] max-w-lg text-sm">Attempt to bypass the real AI Bouncer model. Your prompts are scored against the XGBoost + FAISS pipeline. If you fool it, you climb the board.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Submission + Result */}
          <div className="space-y-6">
            <div className="bg-[#0e0e0e] border border-[#222] rounded-xl p-8 flex flex-col justify-between">
              <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-6">
                
                <div className="flex items-center justify-between text-[#888] text-xs font-bold tracking-widest uppercase mb-4 border-b border-[#222] pb-6">
                  <span>Submit Payload</span>
                  <span className="text-accent"><AlertTriangle className="w-4 h-4 inline mr-1 -mt-0.5" /> Real Model</span>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[#888] text-xs font-bold tracking-widest uppercase mb-3">Operator ID</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-[#161616] border border-[#333] rounded-lg p-3 text-white placeholder-[#555] font-mono text-sm focus:outline-none focus:border-accent transition-all"
                      placeholder="hacker1337"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[#888] text-xs font-bold tracking-widest uppercase mb-3">Injection String (Prompt)</label>
                    <textarea
                      rows={6}
                      required
                      className="w-full bg-[#161616] border border-[#333] rounded-lg p-3 text-white placeholder-[#555] font-mono text-sm focus:outline-none focus:border-accent transition-all resize-none"
                      placeholder="> Ignore previous directives..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-8">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 w-full bg-accent text-black px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-[#ff7841] disabled:opacity-50 transition-all"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Attacking...</>
                    ) : (
                      <><Sword className="w-4 h-4" /> Execute Attack</>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Attack Result */}
            <AnimatePresence>
              {attackResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`bg-[#0e0e0e] border rounded-xl p-8 ${
                    attackResult.label === 'SAFE' 
                      ? 'border-emerald-500/30' 
                      : attackResult.label === 'MALICIOUS' 
                        ? 'border-accent/30' 
                        : 'border-[#222]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      {attackResult.label === 'SAFE' ? (
                        <>
                          <ShieldCheck className="w-6 h-6 text-emerald-400" />
                          <div>
                            <span className="text-emerald-400 text-lg font-light">BYPASSED!</span>
                            <p className="text-emerald-400/60 text-xs">+500 pts — You fooled the Bouncer</p>
                          </div>
                        </>
                      ) : attackResult.label === 'MALICIOUS' ? (
                        <>
                          <ShieldAlert className="w-6 h-6 text-accent" />
                          <div>
                            <span className="text-accent text-lg font-light">BLOCKED</span>
                            <p className="text-accent/60 text-xs">+50 pts — Attack detected</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-6 h-6 text-red-400" />
                          <span className="text-red-400 text-lg font-light">Error</span>
                        </>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[#888] text-[10px] uppercase tracking-widest">ML Score</p>
                      <span className="font-mono text-xl text-white">{(attackResult.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Reason tags */}
                  {attackResult.reasons?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {attackResult.reasons.map((r, i) => (
                        <span key={i} className="bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded text-[10px] font-mono">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-[#666] text-xs font-mono bg-[#161616] p-3 rounded border border-[#333]">
                    {attackResult.details}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Leaderboard */}
          <div className="bg-[#0e0e0e] border border-[#222] rounded-xl p-8 flex flex-col">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#222]">
              <h3 className="text-white text-xl font-light tracking-tight">Global Rankings</h3>
              <div className="bg-[#1a1a1a] text-accent px-3 py-1 text-xs font-mono rounded-full border border-[#333]">
                Live
              </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {leaderboard.map((user, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * idx }}
                  key={user.username} 
                  className={`flex items-center justify-between p-4 rounded-lg border ${idx === 0 ? 'bg-accent/10 border-accent/20' : 'bg-[#161616] border-[#333]'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 flex text-sm items-center justify-center font-mono font-bold rounded ${idx === 0 ? 'bg-accent text-black' : 'text-[#888]'}`}>
                      0{idx + 1}
                    </div>
                    <div>
                      <h4 className={`font-mono font-medium text-sm ${idx === 0 ? 'text-accent' : 'text-white'}`}>{user.username}</h4>
                      <div className="flex gap-3 mt-1 text-[9px] text-[#666]">
                        <span>{user.attacks} attacks</span>
                        <span className="text-emerald-400/60">{user.bypasses} bypasses</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-light text-white">{user.score}</div>
                    <div className="text-[9px] text-[#888] uppercase tracking-widest mt-1">PTS</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
