"use client";
import { useEffect, useState } from 'react';
import { useKitStore } from '@/store/kitStore';
import { useAuthStore } from '@/store/authStore';
import { useParams, useRouter } from 'next/navigation';

export default function KitBuilderPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  
  const { user, loading: authLoading } = useAuthStore();
  const { currentKit, fetchKit, loading, setCurrentKitOptimistic, updateKitSection, regenerateSection } = useKitStore();

  const [activeTab, setActiveTab] = useState('brief');
  const [isRegenerating, setIsRegenerating] = useState(false);

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

  const handleUpdateField = (section: string, field: string, value: any) => {
    setCurrentKitOptimistic(kit => {
      kit[section][field] = value;
      return kit;
    });
    updateKitSection(id, section, currentKit[section]);
  };

  const handleUpdateQuestion = (qId: string, field: string, value: any) => {
    setCurrentKitOptimistic(kit => {
      const idx = kit.questions.findIndex((q: any) => q.id === qId);
      if (idx !== -1) {
        kit.questions[idx][field] = value;
        kit.questions[idx].origin = 'EDITED';
      }
      return kit;
    });
    updateKitSection(id, 'questions', currentKit.questions);
  };

  const handleAddQuestion = (category: string) => {
    const newQ = { id: `q_${Math.random().toString(16).slice(2, 10)}`, category, prompt: 'New Question', answer_outline: '', origin: 'USER_CREATED', difficulty: 1, requirement_ids: [] };
    setCurrentKitOptimistic(kit => {
      kit.questions.push(newQ);
      return kit;
    });
    updateKitSection(id, 'questions', currentKit.questions);
  };

  const handleDeleteQuestion = (qId: string) => {
    setCurrentKitOptimistic(kit => {
      kit.questions = kit.questions.filter((q: any) => q.id !== qId);
      return kit;
    });
    updateKitSection(id, 'questions', currentKit.questions);
  };

  const handleMoveQuestion = (qId: string, direction: 'up' | 'down') => {
    setCurrentKitOptimistic(kit => {
      const idx = kit.questions.findIndex((q: any) => q.id === qId);
      if (idx < 0) return kit;
      if (direction === 'up' && idx > 0) {
        [kit.questions[idx - 1], kit.questions[idx]] = [kit.questions[idx], kit.questions[idx - 1]];
      } else if (direction === 'down' && idx < kit.questions.length - 1) {
        [kit.questions[idx + 1], kit.questions[idx]] = [kit.questions[idx], kit.questions[idx + 1]];
      }
      return kit;
    });
    updateKitSection(id, 'questions', currentKit.questions);
  };

  const handleChangeCategory = (qId: string, newCategory: string) => {
    setCurrentKitOptimistic(kit => {
      const q = kit.questions.find((q: any) => q.id === qId);
      if (q) {
        q.category = newCategory;
        q.origin = 'EDITED';
      }
      return kit;
    });
    updateKitSection(id, 'questions', currentKit.questions);
  };

  const handleUpdateFlashcard = (fId: string, field: string, value: any) => {
    setCurrentKitOptimistic(kit => {
      const idx = kit.flashcards.findIndex((f: any) => f.id === fId);
      if (idx !== -1) {
        kit.flashcards[idx][field] = value;
        kit.flashcards[idx].origin = 'EDITED';
      }
      return kit;
    });
    updateKitSection(id, 'flashcards', currentKit.flashcards);
  };

  const handleAddFlashcard = () => {
    const newF = { id: `f_${Math.random().toString(16).slice(2, 10)}`, front: 'New Flashcard Front', back: 'New Flashcard Back', origin: 'USER_CREATED', confidence_score: 0, requirement_ids: [] };
    setCurrentKitOptimistic(kit => {
      kit.flashcards.push(newF);
      return kit;
    });
    updateKitSection(id, 'flashcards', currentKit.flashcards);
  };

  const handleDeleteFlashcard = (fId: string) => {
    setCurrentKitOptimistic(kit => {
      kit.flashcards = kit.flashcards.filter((f: any) => f.id !== fId);
      return kit;
    });
    updateKitSection(id, 'flashcards', currentKit.flashcards);
  };

  const handleRegenerate = async (section: string) => {
    setIsRegenerating(true);
    await regenerateSection(id, section);
    setIsRegenerating(false);
  };

  const questionsByCategory = currentKit.questions.reduce((acc: any, q: any) => {
    acc[q.category] = acc[q.category] || [];
    acc[q.category].push(q);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 mt-6 surface-primary p-6">
        <div>
          <h1 className="text-4xl font-extrabold text-text-primary tracking-tight mb-2">
            {currentKit.role.title} <span className="text-text-secondary font-medium text-3xl">at</span> {currentKit.source.company}
          </h1>
          <div className="flex items-center gap-3">
            <span className="badge-generated">
              Prep Kit
            </span>
            <p className="text-text-tertiary text-sm">Generated on {new Date(currentKit.source.researched_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <button 
            onClick={() => router.push(`/practice/${id}`)} 
            className="btn-primary bg-emerald-600 hover:bg-emerald-500 border-none shadow-[0_0_15px_rgba(16,185,129,0.3)] text-white"
          >
            Practice Mode
          </button>
          <button 
            onClick={() => router.push('/dashboard')} 
            className="btn-secondary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border-subtle mb-8 pb-4 overflow-x-auto custom-scrollbar">
        {['brief', 'questions', 'flashcards', 'schedule'].map(tab => (
          <button 
            key={tab} 
            className={`pb-2 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === tab 
                ? 'bg-accent-subtle text-accent-hover border border-accent-border shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-2 border border-transparent'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'brief' && (
        <div className="surface-primary p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center border-b border-border-subtle pb-4">
            <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <span className="w-1.5 h-6 bg-accent-base rounded-full inline-block"></span>
              Company Brief
            </h2>
            <button 
              disabled={isRegenerating} 
              onClick={() => handleRegenerate('brief')} 
              className="text-accent-hover hover:text-accent-base text-sm font-medium flex items-center gap-1 transition-colors disabled:opacity-50 bg-accent-subtle px-4 py-2 rounded-lg border border-accent-border"
            >
              {isRegenerating ? 'Regenerating...' : 'Regenerate API'}
            </button>
          </div>
          <div className="group">
            <label className="block text-sm font-medium text-text-secondary mb-2 pl-1">Executive Summary</label>
            <textarea 
              value={currentKit.company_brief.summary} 
              onChange={e => handleUpdateField('company_brief', 'summary', e.target.value)}
              className="input-premium h-40 resize-none"
            />
          </div>
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {['technical', 'behavioural', 'system-design', 'company-fit'].map(category => {
            const hasQuestions = (questionsByCategory[category] || []).length > 0;
            return (
            <div key={category} className="surface-primary p-8 relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent-subtle rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex justify-between items-center mb-6 border-b border-border-subtle pb-4 relative z-10">
                <h3 className="text-xl font-bold capitalize text-text-primary flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-surface-2 border border-border-active flex items-center justify-center text-xs text-accent-hover">
                    {(questionsByCategory[category] || []).length}
                  </span>
                  {category.replace('-', ' ')}
                </h3>
                <div className="flex gap-3">
                  <button onClick={() => handleAddQuestion(category)} className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-sm font-medium px-4 py-2 rounded-lg border border-emerald-500/20 transition-colors">
                    + Add
                  </button>
                  <button disabled={isRegenerating} onClick={() => handleRegenerate(`questions/${category}`)} className="bg-accent-subtle text-accent-hover hover:bg-accent-border/50 text-sm font-medium px-4 py-2 rounded-lg border border-accent-border transition-colors disabled:opacity-50">
                    Regenerate
                  </button>
                </div>
              </div>
              
              <div className="space-y-6 relative z-10">
                {!hasQuestions && (
                  <p className="text-text-tertiary text-center py-6 border border-dashed border-border-active rounded-xl">No questions generated for this section.</p>
                )}
                {(questionsByCategory[category] || []).map((q: any, idx: number) => (
                  <div key={q.id} className="p-6 surface-secondary relative group hover:border-accent-border transition-all duration-300">
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button onClick={() => handleMoveQuestion(q.id, 'up')} disabled={idx === 0} className="bg-surface-2 text-text-secondary hover:text-text-primary px-2 py-1 rounded-md text-xs font-semibold disabled:opacity-30">↑</button>
                      <button onClick={() => handleMoveQuestion(q.id, 'down')} disabled={idx === (questionsByCategory[category] || []).length - 1} className="bg-surface-2 text-text-secondary hover:text-text-primary px-2 py-1 rounded-md text-xs font-semibold disabled:opacity-30">↓</button>
                      <select 
                        value={q.category} 
                        onChange={(e) => handleChangeCategory(q.id, e.target.value)} 
                        className="bg-surface-2 text-text-secondary hover:text-text-primary px-2 py-1 rounded-md text-xs font-semibold outline-none border border-border-active cursor-pointer"
                      >
                        <option value="technical">Technical</option>
                        <option value="behavioural">Behavioural</option>
                        <option value="system-design">System Design</option>
                        <option value="company-fit">Company Fit</option>
                      </select>
                      <button onClick={() => handleDeleteQuestion(q.id)} className="bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1 rounded-md text-xs font-semibold">Delete</button>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-4">
                      <span className={q.origin === 'EDITED' ? 'badge-edited' : q.origin === 'USER_CREATED' ? 'badge-user' : 'badge-generated'}>{q.origin}</span>
                      <span className="badge-generated">Difficulty: {q.difficulty}/5</span>
                    </div>
                    
                    <input 
                      value={q.prompt} 
                      onChange={e => handleUpdateQuestion(q.id, 'prompt', e.target.value)}
                      className="w-full bg-transparent font-semibold text-lg text-text-primary p-2 mb-3 outline-none border-b border-transparent focus:border-accent-border transition-colors placeholder-text-tertiary"
                      placeholder="Question prompt..."
                    />
                    <textarea 
                      value={q.answer_outline} 
                      onChange={e => handleUpdateQuestion(q.id, 'answer_outline', e.target.value)}
                      className="input-premium text-sm min-h-[100px] resize-none"
                      placeholder="Answer outline..."
                    />
                  </div>
                ))}
              </div>
            </div>
          )})}
        </div>
      )}

      {activeTab === 'flashcards' && (
        <div className="surface-primary p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-subtle rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex justify-between items-center border-b border-border-subtle pb-4 relative z-10">
            <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <span className="w-1.5 h-6 bg-accent-hover rounded-full inline-block"></span>
              Flashcards
            </h2>
            <div className="flex gap-3">
              <button onClick={handleAddFlashcard} className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-sm font-medium px-4 py-2 rounded-lg border border-emerald-500/20 transition-colors">
                + Add
              </button>
              <button 
                disabled={isRegenerating} 
                onClick={() => handleRegenerate('flashcards')} 
                className="bg-accent-subtle text-accent-hover hover:bg-accent-border/50 text-sm font-medium px-4 py-2 rounded-lg border border-accent-border transition-colors disabled:opacity-50"
              >
                {isRegenerating ? 'Regenerating...' : 'Regenerate API'}
              </button>
            </div>
          </div>
          
          <div className="space-y-6 relative z-10">
            {(!currentKit.flashcards || currentKit.flashcards.length === 0) && (
              <p className="text-text-tertiary text-center py-6 border border-dashed border-border-active rounded-xl">No flashcards generated.</p>
            )}
            {(currentKit.flashcards || []).map((f: any) => (
              <div key={f.id} className="p-6 surface-secondary relative group hover:border-accent-border transition-all duration-300">
                <button onClick={() => handleDeleteFlashcard(f.id)} className="absolute top-4 right-4 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1 rounded-md opacity-0 group-hover:opacity-100 text-xs font-semibold transition-all duration-300 z-20">Delete</button>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className={f.origin === 'EDITED' ? 'badge-edited' : f.origin === 'USER_CREATED' ? 'badge-user' : 'badge-generated'}>{f.origin}</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1 block">Front</label>
                    <textarea 
                      value={f.front} 
                      onChange={e => handleUpdateFlashcard(f.id, 'front', e.target.value)}
                      className="input-premium w-full text-lg font-medium resize-none min-h-[60px]"
                      placeholder="Flashcard front..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1 block">Back</label>
                    <textarea 
                      value={f.back} 
                      onChange={e => handleUpdateFlashcard(f.id, 'back', e.target.value)}
                      className="input-premium text-sm min-h-[100px] resize-none"
                      placeholder="Flashcard back..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="surface-primary p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-subtle rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex justify-between items-center border-b border-border-subtle pb-4 relative z-10">
            <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <span className="w-1.5 h-6 bg-accent-hover rounded-full inline-block"></span>
              Study Schedule
            </h2>
            <button 
              disabled={isRegenerating} 
              onClick={() => handleRegenerate('schedule')} 
              className="bg-accent-subtle text-accent-hover hover:bg-accent-border/50 text-sm font-medium px-4 py-2 rounded-lg border border-accent-border transition-colors disabled:opacity-50"
            >
              {isRegenerating ? 'Regenerating...' : 'Regenerate API'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            {currentKit.schedule.days.map((day: any) => (
              <div key={day.day} className="surface-secondary p-6 hover:border-accent-border transition-all duration-300 hover:-translate-y-1 group">
                <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
                  <div className="font-bold text-lg text-text-primary">
                    Day {day.day}
                  </div>
                  <span className="badge-generated">
                    {day.minutes} mins
                  </span>
                </div>
                <div className="text-text-primary font-medium mb-3 text-sm group-hover:text-accent-hover transition-colors">{day.focus}</div>
                <div className="flex items-center gap-2 text-xs text-text-secondary bg-surface-1 p-2 rounded border border-border-subtle">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  {day.question_ids.length} Action Items
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
