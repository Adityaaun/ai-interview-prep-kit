"use client";
import { useEffect, useState } from 'react';
import { useKitStore } from '@/store/kitStore';
import { useAuthStore } from '@/store/authStore';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function PracticePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  
  const { user, loading: authLoading } = useAuthStore();
  const { currentKit, fetchKit, loading } = useKitStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionConfidence, setSessionConfidence] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (user && id) fetchKit(id);
  }, [user, authLoading, id, fetchKit, router]);

  if (loading || !currentKit) return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-glow rounded-full p-4 surface-secondary flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-base"></div>
      </div>
    </div>
  );

  const flashcards = currentKit.flashcards || [];
  if (flashcards.length === 0) return (
    <div className="flex h-screen items-center justify-center p-8">
      <div className="surface-primary p-10 text-center text-text-secondary">
        <p className="text-xl font-medium">No flashcards available in this kit.</p>
        <button onClick={() => router.push('/dashboard')} className="mt-6 text-accent-hover hover:text-accent-base font-medium">Return to Dashboard</button>
      </div>
    </div>
  );

  // Sort: lowest confidence first (historically persisted in DB)
  // We use the flashcards array from the kit which gets updated locally when recorded
  const sortedFlashcards = [...flashcards].sort((a, b) => 
    (a.practice_stats?.confidence_score || 0) - (b.practice_stats?.confidence_score || 0)
  );
  
  const currentCard = sortedFlashcards[currentIndex];
  if (!currentCard) return (
    <div className="flex flex-col items-center justify-center h-screen p-8 animate-in zoom-in duration-500">
      <div className="surface-primary p-12 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 border border-emerald-500/20">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-text-primary mb-2 relative z-10">Session Complete!</h2>
        <p className="text-text-secondary mb-8 relative z-10">You've reviewed all flashcards in this kit.</p>
        <button onClick={() => router.push('/dashboard')} className="btn-secondary relative z-10">Return to Dashboard</button>
      </div>
    </div>
  );

  const handleConfidence = async (score: number) => {
    // Optimistically update the current kit's flashcard array
    const updatedFlashcards = flashcards.map(f => {
      if (f.id === currentCard.id) {
        return {
          ...f,
          practice_stats: {
            ...f.practice_stats,
            confidence_score: score,
            last_reviewed: new Date().toISOString()
          }
        };
      }
      return f;
    });

    // Update locally so sorting/UI remains consistent if they don't reload
    useKitStore.setState({ currentKit: { ...currentKit, flashcards: updatedFlashcards } });

    // Persist to backend immediately
    try {
      await api.patch(`/kits/${currentKit.id}`, {
        section: 'flashcards',
        data: updatedFlashcards
      });
    } catch (e) {
      console.error("Failed to persist confidence", e);
    }

    setShowAnswer(false);
    setCurrentIndex(prev => prev + 1);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen justify-center animate-in fade-in duration-700 relative">
      
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-subtle rounded-full blur-[100px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <div className="w-full flex justify-between items-center mb-10 mt-8 surface-secondary py-4 px-6 shadow-sm">
        <button onClick={() => router.push('/dashboard')} className="text-sm font-medium text-text-tertiary hover:text-text-primary transition-colors flex items-center gap-2">
          <span>&larr;</span> Back to Dashboard
        </button>
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-text-secondary">Card {currentIndex + 1} of {flashcards.length}</div>
          <div className="w-32 h-2 bg-surface-3 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent-base to-purple-500 transition-all duration-300" style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}></div>
          </div>
        </div>
      </div>

      <div 
        className="w-full h-96 perspective-1000 cursor-pointer group"
        onClick={() => setShowAnswer(!showAnswer)}
      >
        <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${showAnswer ? 'rotate-y-180' : ''}`}>
          {/* Front */}
          <div className="absolute w-full h-full surface-primary flex items-center justify-center p-10 backface-hidden group-hover:border-accent-border transition-colors">
            <div className="absolute top-6 left-6 text-accent-subtle font-bold text-4xl">Q</div>
            <h2 className="text-2xl md:text-3xl font-bold text-center text-text-primary leading-snug">{currentCard.front}</h2>
            <div className="absolute bottom-6 right-6 flex items-center gap-2 text-accent-hover/70 animate-pulse">
              <span className="text-sm font-medium">Click to flip</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
          </div>
          {/* Back */}
          <div className="absolute w-full h-full bg-surface-2 border border-accent-border rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.1)] flex flex-col items-center justify-center p-6 md:p-10 backface-hidden rotate-y-180">
            <div className="absolute top-6 left-6 text-purple-400/50 font-bold text-4xl">A</div>
            <div className="w-full h-full overflow-y-auto custom-scrollbar flex items-center justify-center mt-6 pr-2">
              <p className="text-lg md:text-xl text-center text-text-secondary leading-relaxed font-medium">{currentCard.back}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 h-24 w-full flex justify-center items-center">
        {showAnswer ? (
          <div className="flex flex-wrap justify-center gap-3 md:gap-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <button onClick={(e) => { e.stopPropagation(); handleConfidence(1); }} className="px-6 py-3.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-semibold hover:bg-red-500/20 transition-all hover:-translate-y-1 hover:shadow-[0_4px_15px_rgba(239,68,68,0.2)]">1 - Again</button>
            <button onClick={(e) => { e.stopPropagation(); handleConfidence(2); }} className="px-6 py-3.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl font-semibold hover:bg-orange-500/20 transition-all hover:-translate-y-1 hover:shadow-[0_4px_15px_rgba(249,115,22,0.2)]">2 - Hard</button>
            <button onClick={(e) => { e.stopPropagation(); handleConfidence(3); }} className="px-6 py-3.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl font-semibold hover:bg-emerald-500/20 transition-all hover:-translate-y-1 hover:shadow-[0_4px_15px_rgba(16,185,129,0.2)]">3 - Good</button>
            <button onClick={(e) => { e.stopPropagation(); handleConfidence(4); }} className="px-6 py-3.5 bg-accent-subtle text-accent-hover border border-accent-border rounded-xl font-semibold hover:bg-accent-subtle/80 transition-all hover:-translate-y-1 hover:shadow-[0_4px_15px_rgba(99,102,241,0.2)]">4 - Easy</button>
          </div>
        ) : (
          <div className="text-text-tertiary font-medium tracking-wide text-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary"></span>
            Reviewing Flashcards
            <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary"></span>
          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .perspective-1000 { perspective: 1000px; }
        .transform-style-preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />
    </div>
  );
}
