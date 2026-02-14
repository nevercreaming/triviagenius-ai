
import React from 'react';
import { LeaderboardEntry } from '../types';
import Button from './Button';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  onClose: () => void;
  onClear: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ entries, onClose, onClear }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-slate-900/90 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-indigo-500/10 to-transparent">
          <div>
            <h2 className="text-2xl md:text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">
              The Hall of Fame
            </h2>
            <p className="text-[10px] md:text-xs text-white/40 uppercase tracking-widest font-bold">Top 10 Global Legends</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <svg className="w-6 h-6 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-2">
          {entries.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <span className="text-5xl opacity-20">👻</span>
              <p className="text-white/30 font-medium">No legends yet. Will it be you?</p>
            </div>
          ) : (
            entries.map((entry, index) => {
              const isTop3 = index < 3;
              const colors = [
                'text-yellow-400 border-yellow-400/20 bg-yellow-400/5',
                'text-slate-300 border-slate-300/20 bg-slate-300/5',
                'text-amber-600 border-amber-600/20 bg-amber-600/5'
              ];
              const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

              return (
                <div 
                  key={entry.id}
                  className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${isTop3 ? colors[index] : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                >
                  <div className="w-8 md:w-10 text-center font-black text-lg md:text-xl italic opacity-50 group-hover:opacity-100 transition-opacity">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm md:text-lg truncate">{entry.name}</span>
                      {medal && <span className="text-base md:text-xl">{medal}</span>}
                      {entry.isInfinite && <span className="text-xs text-fuchsia-400 animate-pulse">∞</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[9px] md:text-[10px] uppercase font-bold tracking-widest opacity-40">
                      <span>{entry.difficulty}</span>
                      <span>•</span>
                      <span>{entry.topicsCount} Topics</span>
                      <span>•</span>
                      <span>{new Date(entry.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg md:text-2xl font-black tabular-nums">{entry.score.toLocaleString()}</div>
                    <div className="text-[8px] md:text-[9px] uppercase font-black text-indigo-400 group-hover:text-indigo-300 transition-colors">Total Points</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-6 md:p-8 border-t border-white/5 bg-black/20 flex flex-col md:flex-row gap-4">
          <Button onClick={onClose} fullWidth className="md:flex-1">Back to Game</Button>
          {entries.length > 0 && (
            <button 
              onClick={() => { if(confirm('Wipe the history books?')) onClear(); }}
              className="text-[10px] uppercase font-bold text-rose-500/50 hover:text-rose-500 transition-colors py-2"
            >
              Reset Leaderboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
