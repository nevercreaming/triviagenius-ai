
import React, { useState, useEffect, useRef } from 'react';
import { Question } from '../types';
import Button from './Button';
import { audioService } from '../services/audioService';

interface TriviaCardProps {
  question: Question;
  onAnswer: (isCorrect: boolean) => void;
  onHintUsed: () => void;
  onSkip: () => void;
  currentIndex: number;
  totalQuestions: number;
}

const TIMER_DURATION = 20;

const TriviaCard: React.FC<TriviaCardProps> = ({ 
  question, 
  onAnswer, 
  onHintUsed,
  onSkip,
  currentIndex, 
  totalQuestions 
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [revealedIncorrectIdx, setRevealedIncorrectIdx] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [isTimeUp, setIsTimeUp] = useState(false);
  
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setSelectedIdx(null);
    setHasConfirmed(false);
    setRevealedIncorrectIdx(null);
    setTimeLeft(TIMER_DURATION);
    setIsTimeUp(false);

    // Start Timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        if (prev <= 6) {
          audioService.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [question]);

  useEffect(() => {
    if (timeLeft === 0 && !hasConfirmed) {
      handleTimeUp();
    }
  }, [timeLeft]);

  const handleTimeUp = () => {
    setIsTimeUp(true);
    setHasConfirmed(true);
    audioService.playTimeUp();
    setTimeout(() => {
      onAnswer(false);
    }, 3000);
  };

  const handleOptionClick = (idx: number) => {
    if (hasConfirmed || idx === revealedIncorrectIdx) return;
    audioService.playClick();
    setSelectedIdx(idx);
  };

  const handleHint = () => {
    if (hasConfirmed || revealedIncorrectIdx !== null) return;
    
    const incorrectIndices = question.options
      .map((_, i) => i)
      .filter(i => i !== question.correctAnswerIndex);
    
    const randomIncorrect = incorrectIndices[Math.floor(Math.random() * incorrectIndices.length)];
    
    audioService.playHint();
    setRevealedIncorrectIdx(randomIncorrect);
    onHintUsed();

    if (selectedIdx === randomIncorrect) {
      setSelectedIdx(null);
    }
  };

  const handleSkipClick = () => {
    if (hasConfirmed) return;
    audioService.playClick();
    onSkip();
  };

  const handleConfirm = () => {
    if (selectedIdx === null || hasConfirmed) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setHasConfirmed(true);
    
    const isCorrect = selectedIdx === question.correctAnswerIndex;
    if (isCorrect) {
      audioService.playCorrect();
    } else {
      audioService.playWrong();
    }

    setTimeout(() => {
      onAnswer(isCorrect);
    }, 2000);
  };

  const timerPercentage = (timeLeft / TIMER_DURATION) * 100;
  const isTimerLow = timeLeft <= 10;
  
  // In infinite mode, the totalQuestions passed might just be the current count.
  const isInfiniteView = totalQuestions <= currentIndex + 1;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 md:space-y-6 animate-reveal">
      <div className="flex justify-between items-center px-1">
        <div className="flex flex-col">
          <span className="text-[10px] md:text-xs font-bold tracking-widest text-indigo-400 uppercase">
            {isInfiniteView ? `Round ${currentIndex + 1}` : `Q${currentIndex + 1} of ${totalQuestions}`}
          </span>
          <span className={`text-lg md:text-xl font-mono font-black transition-all duration-300 ${isTimerLow ? 'text-rose-500 animate-pulse scale-110 origin-left' : 'text-white'}`}>
            00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={`h-1.5 w-24 md:w-32 rounded-full overflow-hidden transition-all duration-300 ${isTimerLow ? 'bg-rose-500/20 ring-1 ring-rose-500/30' : 'bg-white/10'}`}>
            <div 
              className={`h-full transition-all duration-500 ease-out ${isTimerLow ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-indigo-500'} ${isInfiniteView ? 'animate-pulse' : ''}`}
              style={{ width: isInfiniteView ? '100%' : `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
          <span className={`text-[9px] uppercase font-bold tracking-tighter transition-colors duration-300 ${isTimerLow ? 'text-rose-400' : 'text-white/40'}`}>
            {isInfiniteView ? 'Infinite' : 'Done'}
          </span>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-2xl relative overflow-hidden">
        {/* Visual Timer Bar */}
        <div 
          className={`absolute top-0 left-0 h-1 transition-all duration-1000 linear ${isTimerLow ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-indigo-500'}`}
          style={{ width: `${timerPercentage}%` }}
        />

        <div className="absolute top-4 right-4 md:top-6 md:right-8 flex gap-2">
           <button
             onClick={handleSkipClick}
             disabled={hasConfirmed}
             className="text-[9px] md:text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-rose-300 hover:scale-105 active:scale-95"
           >
             Skip (lose 50)
           </button>
           <button
             onClick={handleHint}
             disabled={hasConfirmed || revealedIncorrectIdx !== null}
             className="text-[9px] md:text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-indigo-300 hover:scale-105 active:scale-95"
           >
             {revealedIncorrectIdx !== null ? 'Hint used' : 'Hint (lose 25)'}
           </button>
        </div>

        <h2 className="text-lg md:text-2xl font-bold leading-tight md:leading-relaxed mb-6 md:mb-8 pr-24 animate-pop">
          {question.text}
        </h2>

        <div className="grid grid-cols-1 gap-2 md:gap-3">
          {question.options.map((option, idx) => {
            const isSelected = selectedIdx === idx;
            const isCorrect = question.correctAnswerIndex === idx;
            const isRevealedIncorrect = revealedIncorrectIdx === idx;
            
            let btnStyle = "border-white/10 bg-white/5 text-white/90 hover:bg-white/10 hover:border-white/20 hover:scale-[1.01] hover:translate-x-1";
            
            if (hasConfirmed) {
              if (isCorrect) {
                btnStyle = "bg-emerald-500/20 border-emerald-500/50 text-emerald-400";
              } else if (isSelected) {
                btnStyle = "bg-rose-500/20 border-rose-500/50 text-rose-400";
              } else {
                btnStyle = "opacity-40 border-white/5";
              }
            } else if (isRevealedIncorrect) {
              btnStyle = "opacity-30 border-dashed border-rose-500/30 line-through cursor-not-allowed grayscale";
            } else if (isSelected) {
              btnStyle = "bg-indigo-500/20 border-indigo-500 text-indigo-300 ring-2 ring-indigo-500/20 scale-[1.02] translate-x-1";
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(idx)}
                disabled={hasConfirmed || isRevealedIncorrect}
                className={`w-full text-left p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all duration-300 flex items-center gap-3 md:gap-4 active:scale-95 ${btnStyle}`}
              >
                <span className={`w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg font-bold text-xs md:text-base transition-colors ${isSelected ? 'bg-indigo-500 text-white' : 'bg-white/10'} ${isRevealedIncorrect ? 'opacity-30' : ''}`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className={`font-medium text-sm md:text-base transition-opacity ${isRevealedIncorrect ? 'opacity-50' : ''}`}>{option}</span>
              </button>
            );
          })}
        </div>

        {isTimeUp && (
          <div className="mt-4 text-center py-2 px-4 bg-rose-500/20 text-rose-400 rounded-xl font-black uppercase tracking-widest text-xs animate-bounce">
            ⏰ Out of time!
          </div>
        )}

        {hasConfirmed && (
          <div className="mt-6 md:mt-8 p-3 md:p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl md:rounded-2xl animate-reveal shadow-inner">
            <p className="text-[13px] md:text-sm leading-snug md:leading-relaxed text-indigo-200">
              <span className="font-bold text-indigo-400 uppercase tracking-wider block mb-0.5 md:mb-1 text-[11px] md:text-xs">Fun Fact:</span>
              {question.explanation}
            </p>
          </div>
        )}

        <div className="mt-6 md:mt-8">
          {!hasConfirmed && (
            <Button 
              fullWidth 
              onClick={handleConfirm} 
              disabled={selectedIdx === null}
              className="hover:shadow-indigo-500/40 transition-shadow"
            >
              Go!
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TriviaCard;
