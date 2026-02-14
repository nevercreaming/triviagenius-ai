
import React, { useState, useEffect, useRef } from 'react';
import { GameState, CATEGORIES, Question, Difficulty, LeaderboardEntry } from './types';
import { generateTriviaQuestions } from './services/geminiService';
import TriviaCard from './components/TriviaCard';
import Button from './components/Button';
import Leaderboard from './components/Leaderboard';
import { audioService } from './services/audioService';

const App: React.FC = () => {
  const [state, setState] = useState<GameState>({
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    multiplier: 1,
    isGameOver: false,
    status: 'idle',
    categories: [CATEGORIES[0].name],
    difficulty: Difficulty.MEDIUM,
    questionCount: 10,
    isInfinite: false
  });

  const [isMuted, setIsMuted] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [hasSavedScore, setHasSavedScore] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load leaderboard
    const saved = localStorage.getItem('triviagenius_scores');
    if (saved) {
      try {
        setLeaderboard(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse leaderboard", e);
      }
    }

    const handleFirstClick = () => {
      audioService.playPreGameMusic();
      window.removeEventListener('mousedown', handleFirstClick);
      window.removeEventListener('keydown', handleFirstClick);
    };
    window.addEventListener('mousedown', handleFirstClick);
    window.addEventListener('keydown', handleFirstClick);
    return () => {
      window.removeEventListener('mousedown', handleFirstClick);
      window.removeEventListener('keydown', handleFirstClick);
    };
  }, []);

  const toggleMute = () => {
    const muted = audioService.toggleMute();
    setIsMuted(muted);
  };

  const toggleCategory = (catName: string) => {
    audioService.playClick();
    setState(prev => {
      const isSelected = prev.categories.includes(catName);
      if (isSelected && prev.categories.length === 1) return prev; 
      
      const nextCategories = isSelected 
        ? prev.categories.filter(c => c !== catName)
        : [...prev.categories, catName];
      
      return { ...prev, categories: nextCategories };
    });
  };

  const startGame = async (infinite: boolean = false) => {
    if (state.categories.length === 0) {
      alert("Pick at least one topic!");
      return;
    }

    setState(prev => ({ 
      ...prev, 
      status: 'loading', 
      questions: [], 
      currentQuestionIndex: 0, 
      score: 0,
      multiplier: 1,
      isInfinite: infinite
    }));
    setHasSavedScore(false);

    try {
      const count = infinite ? 5 : state.questionCount;
      const questions = await generateTriviaQuestions(state.categories, state.difficulty, count);
      audioService.playStart();
      audioService.playInGameMusic();
      setState(prev => ({ ...prev, questions, status: 'playing' }));
    } catch (error) {
      alert("Oops! Questions failed to load. Try again?");
      setState(prev => ({ ...prev, status: 'idle' }));
      audioService.playPreGameMusic();
    }
  };

  const saveScore = () => {
    if (!playerName.trim() || hasSavedScore) return;
    
    const newEntry: LeaderboardEntry = {
      id: Date.now().toString(),
      name: playerName.trim(),
      score: state.score,
      difficulty: state.difficulty,
      topicsCount: state.categories.length,
      date: new Date().toISOString(),
      isInfinite: state.isInfinite
    };

    const newLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setLeaderboard(newLeaderboard);
    localStorage.setItem('triviagenius_scores', JSON.stringify(newLeaderboard));
    setHasSavedScore(true);
    setShowLeaderboard(true);
    audioService.playClick();
  };

  const clearLeaderboard = () => {
    setLeaderboard([]);
    localStorage.removeItem('triviagenius_scores');
    audioService.playClick();
  };

  const fetchMoreInfiniteQuestions = async () => {
    if (isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const moreQuestions = await generateTriviaQuestions(state.categories, state.difficulty, 5);
      setState(prev => ({
        ...prev,
        questions: [...prev.questions, ...moreQuestions]
      }));
    } catch (e) {
      console.error("Failed to fetch more questions", e);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const handleAnswer = (isCorrect: boolean) => {
    setState(prev => {
      const basePoints = 100;
      const pointsEarned = isCorrect ? basePoints * prev.multiplier : 0;
      const nextScore = prev.score + pointsEarned;
      const nextMultiplier = isCorrect ? prev.multiplier + 1 : 1;
      const isLast = prev.currentQuestionIndex === prev.questions.length - 1;
      
      if (!prev.isInfinite && isLast) {
        audioService.playEnd();
        audioService.playPreGameMusic();
        return { 
          ...prev, 
          score: nextScore, 
          multiplier: nextMultiplier,
          status: 'summary', 
          isGameOver: true 
        };
      }

      if (prev.isInfinite && prev.currentQuestionIndex >= prev.questions.length - 2) {
        fetchMoreInfiniteQuestions();
      }

      return { 
        ...prev, 
        score: nextScore, 
        multiplier: nextMultiplier,
        currentQuestionIndex: prev.currentQuestionIndex + 1 
      };
    });
  };

  const handleSkip = () => {
    setState(prev => {
      const nextScore = Math.max(0, prev.score - 50);
      const isLast = prev.currentQuestionIndex === prev.questions.length - 1;

      if (!prev.isInfinite && isLast) {
        audioService.playEnd();
        audioService.playPreGameMusic();
        return { 
          ...prev, 
          score: nextScore, 
          multiplier: 1,
          status: 'summary', 
          isGameOver: true 
        };
      }

      if (prev.isInfinite && prev.currentQuestionIndex >= prev.questions.length - 2) {
        fetchMoreInfiniteQuestions();
      }

      return {
        ...prev,
        score: nextScore,
        multiplier: 1,
        currentQuestionIndex: prev.currentQuestionIndex + 1
      };
    });
  };

  const endInfiniteGame = () => {
    audioService.playEnd();
    audioService.playPreGameMusic();
    setState(prev => ({
      ...prev,
      status: 'summary',
      isGameOver: true
    }));
  };

  const handleHintUsed = () => {
    setState(prev => ({
      ...prev,
      score: Math.max(0, prev.score - 25)
    }));
  };

  const resetGame = () => {
    audioService.playClick();
    audioService.playPreGameMusic();
    setState(prev => ({
      ...prev,
      status: 'idle',
      isGameOver: false,
      score: 0,
      multiplier: 1,
      currentQuestionIndex: 0,
      isInfinite: false
    }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-3 md:p-8 overflow-y-auto" ref={scrollContainerRef}>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center z-20 pointer-events-none bg-gradient-to-b from-black/80 to-transparent">
        <div className="pointer-events-auto flex items-center gap-4">
          <h1 className="text-lg md:text-xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400 animate-glitch select-none">
            TriviaGenius.AI
          </h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleMute}
              className="p-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-90"
            >
              {isMuted ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 14.828a1 1 0 01-1.414-1.414L14.414 12l-1.171-1.172a1 1 0 111.414-1.414L15.828 10.586l1.172-1.172a1 1 0 111.414 1.414L17.243 12l1.171 1.172a1 1 0 11-1.414 1.414L17.243 12l1.171 1.172a1 1 0 11-1.414 1.414L15.828 13.414l-1.171 1.172zM16 10a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1z" clipRule="evenodd" /></svg>
              )}
            </button>
            {state.status === 'idle' && (
              <button 
                onClick={() => { audioService.playClick(); setShowLeaderboard(true); }}
                className="p-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-90"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              </button>
            )}
          </div>
        </div>
        {state.status === 'playing' && (
          <div className="pointer-events-auto flex items-center gap-2">
             {state.multiplier > 1 && (
               <div className="bg-fuchsia-600/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-fuchsia-500/30 flex items-center gap-1.5 animate-bounce">
                  <span className="text-[10px] font-black uppercase tracking-tighter text-fuchsia-400">Combo</span>
                  <span className="font-black text-sm text-fuchsia-300">x{state.multiplier}</span>
               </div>
             )}
             <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/10 flex items-center gap-2 md:gap-3">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono font-bold text-sm md:text-lg">{state.score.toLocaleString()}</span>
             </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="w-full max-w-5xl flex flex-col items-center justify-center min-h-[calc(100vh-2rem)] py-12 md:py-16">
        {state.status === 'idle' && (
          <div className="text-center space-y-6 md:space-y-10 animate-in fade-in zoom-in duration-500 w-full px-2 max-w-4xl mx-auto">
            <div className="space-y-2 md:space-y-4 pt-10">
              <h2 className="text-3xl md:text-7xl font-extrabold tracking-tight leading-tight">
                Time for <span className="text-indigo-500">Trivia?</span>
              </h2>
              <p className="text-white/60 text-sm md:text-xl max-w-xl mx-auto px-4">
                Pick your topics, set the count, and let's go!
              </p>
            </div>

            <div className="space-y-6 text-left w-full">
              {/* Category Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-end px-1">
                  <label className="block text-[10px] md:text-xs font-bold uppercase tracking-widest text-indigo-400">
                    Topics <span className="text-white/30 ml-2">({state.categories.length} Selected)</span>
                  </label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setState(prev => ({ ...prev, categories: CATEGORIES.map(c => c.name) }))}
                      className="text-[9px] uppercase font-bold text-white/40 hover:text-white transition-colors"
                    >
                      Pick All
                    </button>
                    <button 
                      onClick={() => setState(prev => ({ ...prev, categories: [CATEGORIES[0].name] }))}
                      className="text-[9px] uppercase font-bold text-white/40 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                
                <div className="relative">
                  <div 
                    className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3 overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[1200px]' : 'max-h-48 md:max-h-64'}`}
                  >
                    {CATEGORIES.map(cat => {
                      const isSelected = state.categories.includes(cat.name);
                      return (
                        <button
                          key={cat.name}
                          onClick={() => toggleCategory(cat.name)}
                          className={`group relative flex flex-col items-center justify-center p-3 md:p-6 rounded-xl md:rounded-3xl border transition-all duration-300 active:scale-90 ${
                            isSelected 
                              ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/10' 
                              : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20'
                          }`}
                        >
                          <span className={`text-xl md:text-3xl mb-1 md:mb-2 transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>
                            {cat.icon}
                          </span>
                          <span className={`text-[9px] md:text-xs font-bold text-center leading-tight transition-colors ${isSelected ? 'text-indigo-300' : ''}`}>
                            {cat.name}
                          </span>
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  {!isExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent pointer-events-none rounded-b-3xl" />
                  )}
                </div>

                <div className="flex justify-center pt-1">
                  <button 
                    onClick={() => {
                      audioService.playClick();
                      setIsExpanded(!isExpanded);
                    }}
                    className="flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-4 py-2 rounded-full border border-indigo-500/20 transition-all"
                  >
                    {isExpanded ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>
                        Show less
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        Show all topics
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1.5 md:space-y-2">
                  <label className="block text-[10px] md:text-xs font-bold uppercase tracking-widest text-indigo-400 px-1">Difficulty</label>
                  <div className="flex gap-2">
                    {Object.values(Difficulty).map(d => {
                      const icon = d === Difficulty.EASY ? '🐣' : d === Difficulty.MEDIUM ? '🧠' : '⚡';
                      return (
                        <button
                          key={d}
                          onClick={() => {
                            audioService.playClick();
                            setState(prev => ({ ...prev, difficulty: d }));
                          }}
                          className={`flex-1 p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all text-[10px] md:text-sm uppercase tracking-widest font-bold flex flex-col items-center gap-1 ${
                            state.difficulty === d 
                            ? 'bg-fuchsia-600 border-fuchsia-400 shadow-lg shadow-fuchsia-600/30 text-white' 
                            : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-lg md:text-2xl">{icon}</span>
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <label className="block text-[10px] md:text-xs font-bold uppercase tracking-widest text-indigo-400 px-1">How many questions?</label>
                  <div className="relative">
                    <input 
                      type="number"
                      min="1"
                      max="50"
                      value={state.questionCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setState(prev => ({ ...prev, questionCount: isNaN(val) ? 1 : Math.min(50, Math.max(1, val)) }));
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 text-center text-xl md:text-2xl font-black text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:gap-4 justify-center pt-2">
              <Button 
                variant="primary" 
                className="text-base md:text-xl px-10 py-4 md:py-5 flex-1" 
                onClick={() => startGame(false)}
              >
                Start Game
              </Button>
              <Button 
                variant="secondary" 
                className="text-base md:text-xl px-10 py-4 md:py-5 flex-1" 
                onClick={() => startGame(true)}
              >
                Infinite Mode ∞
              </Button>
            </div>
          </div>
        )}

        {state.status === 'loading' && (
          <div className="text-center space-y-6 md:space-y-8 animate-pulse">
            <div className="relative w-16 h-16 md:w-24 md:h-24 mx-auto">
              <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl md:text-2xl font-bold">
                {state.isInfinite ? "Getting ready..." : `Making ${state.questionCount} questions...`}
              </h3>
              <p className="text-sm md:text-base text-white/40">Thinking up some fun trivia for you.</p>
            </div>
          </div>
        )}

        {state.status === 'playing' && state.questions.length > 0 && (
          <div className="w-full space-y-6">
            <TriviaCard
              question={state.questions[state.currentQuestionIndex]}
              currentIndex={state.currentQuestionIndex}
              totalQuestions={state.isInfinite ? state.currentQuestionIndex + 1 : state.questions.length}
              onAnswer={handleAnswer}
              onHintUsed={handleHintUsed}
              onSkip={handleSkip}
            />
            
            {state.isInfinite && (
              <div className="flex justify-center animate-reveal">
                <Button variant="danger" className="px-8 py-3 rounded-full shadow-2xl hover:scale-105" onClick={endInfiniteGame}>
                  Stop & See Stats
                </Button>
              </div>
            )}
          </div>
        )}

        {state.status === 'summary' && (
          <div className="text-center space-y-6 md:space-y-8 max-w-lg w-full animate-in fade-in zoom-in px-2">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl md:rounded-[3rem] p-8 md:p-12 shadow-2xl space-y-6 md:space-y-8">
              <div className="space-y-2">
                <h2 className="text-3xl md:text-4xl font-black italic text-fuchsia-400">
                  {state.isInfinite ? "You're on fire!" : "Finished!"}
                </h2>
                <p className="text-[10px] md:text-xs text-indigo-400 font-bold uppercase tracking-widest">Your Stats</p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="bg-white/5 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 text-center">
                   <div className="text-2xl md:text-3xl font-black mb-1 tabular-nums">{state.score.toLocaleString()}</div>
                   <div className="text-[9px] md:text-xs font-bold text-white/40 uppercase tracking-wider">Final Score</div>
                </div>
                <div className="bg-white/5 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 text-center">
                   <div className="text-2xl md:text-3xl font-black mb-1">
                     {state.isInfinite ? state.currentQuestionIndex : state.questions.length}
                   </div>
                   <div className="text-[9px] md:text-xs font-bold text-white/40 uppercase tracking-wider">Questions Done</div>
                </div>
              </div>

              {/* Score Saving UI */}
              {!hasSavedScore ? (
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Save to Hall of Fame?</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Your Name"
                      value={playerName}
                      maxLength={15}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    <Button onClick={saveScore} disabled={!playerName.trim()} className="whitespace-nowrap">Save</Button>
                  </div>
                </div>
              ) : (
                <div className="pt-4 border-t border-white/5">
                  <p className="text-emerald-400 font-bold text-sm">✓ Score Saved!</p>
                </div>
              )}

              <div className="space-y-3 md:space-y-4 pt-2">
                <Button fullWidth onClick={() => startGame(state.isInfinite)} className="text-base md:text-lg py-4 md:py-5">
                  Play Again
                </Button>
                <div className="flex gap-3">
                  <Button fullWidth variant="ghost" onClick={() => setShowLeaderboard(true)} className="flex-1">
                    Leaderboard
                  </Button>
                  <Button fullWidth variant="outline" onClick={resetGame} className="flex-1">
                    Home
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showLeaderboard && (
        <Leaderboard 
          entries={leaderboard} 
          onClose={() => setShowLeaderboard(false)} 
          onClear={clearLeaderboard}
        />
      )}

      {/* Footer Decoration */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 md:p-8 flex justify-center opacity-20 pointer-events-none z-0">
        <p className="text-[9px] md:text-xs uppercase tracking-[0.5em]">TriviaGenius v2.0 - Powered by Gemini 3 Flash</p>
      </footer>
    </div>
  );
};

export default App;
