import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Wind, Trophy, Heart } from 'lucide-react';
import { BreathPhase } from './types';

const INITIAL_TIME = 300; // 5 minutes in seconds
const INHALE_TIME = 4;
const EXHALE_TIME = 4;

const App: React.FC = () => {
  // --- State ---
  const [timeLeft, setTimeLeft] = useState<number>(INITIAL_TIME);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [phase, setPhase] = useState<BreathPhase>('Ready');
  const [holdDuration, setHoldDuration] = useState<number>(1);
  const [totalSessions, setTotalSessions] = useState<number>(0);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  // --- Refs ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const phaseTimeoutRef = useRef<number | null>(null);

  // --- Initialization ---
  useEffect(() => {
    const saved = localStorage.getItem('meditation_count');
    if (saved) {
      setTotalSessions(parseInt(saved, 10));
    }
  }, []);

  // --- Audio Logic ---
  const playBeep = useCallback((freq: number = 440, type: OscillatorType = 'sine') => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    // Soft attack and release
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }, []);

  // --- Timer Logic ---
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerIntervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isActive, timeLeft]);

  // --- Breathing Cycle Logic ---
  const startBreathingCycle = useCallback(() => {
    // Phase 1: Inhale
    setPhase('Inhale');
    playBeep(300, 'sine'); // Low pitch start

    phaseTimeoutRef.current = window.setTimeout(() => {
      if (!isActive) return;

      // Phase 2: Hold
      setPhase('Hold');
      playBeep(440, 'sine'); // Mid pitch

      phaseTimeoutRef.current = window.setTimeout(() => {
        if (!isActive) return;

        // Phase 3: Exhale
        setPhase('Exhale');
        playBeep(350, 'sine'); // Mid-Low pitch

        phaseTimeoutRef.current = window.setTimeout(() => {
          if (!isActive) return;
          // Loop back to start
          startBreathingCycle(); 
        }, EXHALE_TIME * 1000);

      }, holdDuration * 1000);

    }, INHALE_TIME * 1000);
  }, [holdDuration, isActive, playBeep]);

  // Handle Start/Pause effect on Breathing Cycle
  useEffect(() => {
    if (isActive && phase === 'Ready') {
      startBreathingCycle();
    } else if (!isActive) {
      if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
      // We don't reset phase to 'Ready' immediately to allow pausing visual state
      // but if we hit reset, we will.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);


  const handleStartPause = () => {
    // Unlock audio context on first user gesture
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (!isActive && timeLeft === 0) {
        resetSession();
        return;
    }

    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(INITIAL_TIME);
    setPhase('Ready');
    setShowCelebration(false);
    if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const handleComplete = () => {
    setIsActive(false);
    setPhase('Complete');
    setShowCelebration(true);
    playBeep(600, 'triangle'); // Victory sound logic could be more complex, but keeping simple
    
    const newCount = totalSessions + 1;
    setTotalSessions(newCount);
    localStorage.setItem('meditation_count', newCount.toString());
  };

  const resetSession = () => {
    setTimeLeft(INITIAL_TIME);
    setPhase('Ready');
    setShowCelebration(false);
    setIsActive(false);
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Animation Variants ---
  const circleVariants = {
    Ready: { scale: 1, opacity: 0.8 },
    Inhale: { 
      scale: 1.8, 
      opacity: 1,
      transition: { duration: INHALE_TIME, ease: "easeInOut" } 
    },
    Hold: { 
      scale: 1.8, 
      opacity: 0.9,
      transition: { duration: holdDuration, ease: "linear" } 
    },
    Exhale: { 
      scale: 1, 
      opacity: 0.8,
      transition: { duration: EXHALE_TIME, ease: "easeInOut" } 
    },
    Complete: { scale: 1, opacity: 0 }
  };

  const textVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-between p-6 relative">
      
      {/* Top Bar: Stats */}
      <div className="w-full max-w-md flex justify-between items-center text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-blue-400 fill-blue-400" />
          <span>Minimal Breathe</span>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="text-sm">Total: {totalSessions}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md relative">
        
        {/* Breathing Circle Container */}
        <div className="relative w-72 h-72 flex items-center justify-center mb-12">
          {/* Outer glow/guide rings */}
          <div className="absolute inset-0 rounded-full border border-blue-100 scale-150 opacity-50" />
          <div className="absolute inset-0 rounded-full border border-blue-100 scale-100 opacity-30" />
          
          {/* Animated Circle */}
          <motion.div
            className="w-40 h-40 bg-gradient-to-br from-blue-300 to-blue-400 rounded-full shadow-xl shadow-blue-200"
            variants={circleVariants}
            animate={phase}
            initial="Ready"
          />

          {/* Center Text (Phase) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <AnimatePresence mode='wait'>
              <motion.span
                key={phase}
                variants={textVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="text-2xl font-light text-slate-700 tracking-widest uppercase bg-white/50 backdrop-blur-sm px-4 py-1 rounded-full"
              >
                {phase === 'Ready' ? (isActive ? 'Get Ready' : 'Ready') : phase}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Timer Display */}
        <div className="text-5xl font-extralight text-slate-600 mb-8 font-mono tracking-tighter">
          {formatTime(timeLeft)}
        </div>

        {/* Controls */}
        <div className="w-full space-y-6">
          
          {/* Hold Duration Selector */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Hold Duration (Seconds)
            </span>
            <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-blue-100">
              {[1, 2, 4].map((sec) => (
                <button
                  key={sec}
                  onClick={() => !isActive && setHoldDuration(sec)}
                  disabled={isActive}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    holdDuration === sec
                      ? 'bg-blue-100 text-blue-600 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={handleReset}
              className="p-4 rounded-full bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors shadow-sm border border-slate-100"
              aria-label="Reset"
            >
              <RotateCcw className="w-6 h-6" />
            </button>

            <button
              onClick={handleStartPause}
              className={`p-6 rounded-full transition-all shadow-lg transform hover:scale-105 active:scale-95 ${
                isActive
                  ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-200'
              }`}
            >
              {isActive ? (
                <Pause className="w-8 h-8 fill-current" />
              ) : (
                <Play className="w-8 h-8 fill-current ml-1" />
              )}
            </button>

            {/* Placeholder for symmetry or future feature, currently using invisible div for layout balance if needed, 
                but let's put a dummy settings or info icon to balance visual weight if desired. 
                For now, we'll leave it balanced with the reset button on left and maybe a breathe icon on right? 
                Let's stick to the prompt requirements strictly. 
                Prompt didn't ask for a 3rd button, so keeping it centered.
            */}
             <div className="w-14"></div> {/* Spacer to center the play button relative to reset */}
          </div>
          
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-slate-400 pb-2">
        <p>4 - {holdDuration} - 4 Breathing Pattern</p>
      </div>

      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-blue-50/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm mx-4"
            >
              <div className="mb-4 inline-flex p-4 rounded-full bg-blue-100 text-blue-500">
                <Wind className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-700 mb-2">Session Complete</h2>
              <p className="text-slate-500 mb-6">
                Great job! You've taken a moment for yourself today.
              </p>
              <button
                onClick={resetSession}
                className="w-full py-3 px-6 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default App;
